import RSSParser from "rss-parser";
import { updates } from "../schema";
import crypto from "crypto";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
}

const client = postgres(connectionString);
const db = drizzle(client);

const ai = process.env.GEMINI_API_KEY
    ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
    : null;

const parser = new RSSParser({
    customFields: {
        item: ["content:encoded"]
    }
});

const GIANTS = [
    "openai",
    "anthropic",
    "deepmind",
    "google",
    "meta",
    "xai",
    "microsoft",
    "apple",
    "nvidia"
];

const HYPE = [
    "release",
    "released",
    "launch",
    "launched",
    "announce",
    "announced",
    "announcing",
    "model",
    "llm",
    "paper",
    "breakthrough",
    "open source",
    "open weights",
    "benchmark",
    "sota"
];

const LOW_SIGNAL = [
    "podcast",
    "webinar",
    "job",
    "hiring",
    "newsletter",
    "opinion",
    "sponsored",
    "event",
    "course",
    "tutorial"
];

const TRUSTED_GOOGLE_NEWS_SEARCHES = [
    {
        label: "Official AI labs",
        query: "(site:openai.com OR site:anthropic.com OR site:deepmind.google OR site:blog.google OR site:ai.meta.com OR site:huggingface.co/blog OR site:mistral.ai/news OR site:nvidia.com) (AI OR model OR API OR release OR research) when:3d",
        category: "Official Release",
        maxHours: 72,
        maxItems: 10,
    },
    {
        label: "Major AI coverage",
        query: "(site:techcrunch.com OR site:theverge.com OR site:venturebeat.com OR site:arstechnica.com OR site:mit.edu OR site:semafor.com) (OpenAI OR Anthropic OR DeepMind OR Google AI OR Meta AI OR Hugging Face OR Nvidia OR Mistral OR AI model) when:2d",
        category: "AI News",
        maxHours: 48,
        maxItems: 12,
    },
    {
        label: "Developer tooling",
        query: "(site:huggingface.co/blog OR site:openai.com OR site:anthropic.com OR site:blog.google OR site:mistral.ai/news) (API OR SDK OR agent OR developer OR open source) when:3d",
        category: "Developer Update",
        maxHours: 72,
        maxItems: 8,
    }
];

function isFomoNews(title: string, summary: string, loose = false) {
    const content = (title + " " + summary).toLowerCase();

    const hasGiant = GIANTS.some(g => content.includes(g));
    const hasHype = HYPE.some(h => content.includes(h));

    const strong = ["gpt", "claude", "gemini", "llama", "sora"];
    const strongMatch = strong.some(s => content.includes(s));

    if (loose) return hasGiant || strongMatch || hasHype;

    return (hasGiant && hasHype) || strongMatch;
}

function isLowSignalNews(title: string, summary: string) {
    const content = (title + " " + summary).toLowerCase();
    return LOW_SIGNAL.some(term => content.includes(term));
}

function isRecent(date?: string, maxHours = 24) {
    if (!date) return false;

    const parsed = new Date(date).getTime();
    if (isNaN(parsed)) return false;

    return Date.now() - parsed <= maxHours * 60 * 60 * 1000;
}

function extractSummary(item: any) {
    const raw =
        item.contentSnippet ||
        item["content:encoded"] ||
        item.content ||
        item.summary ||
        "";

    return raw.replace(/<[^>]*>?/gm, "").trim();
}

function truncate(str: string, len: number) {
    if (str.length <= len) return str;
    return str.substring(0, len - 3) + "...";
}

function generateSlug(title: string) {
    const base = title
        .toLowerCase()
        .replace(/[^a-z0-9 ]/g, "")
        .replace(/\s+/g, "-")
        .slice(0, 60);

    const hash = crypto.randomBytes(3).toString("hex");

    return `${base}-${hash}`;
}

function normalizeTitle(title: string) {
    return title
        .toLowerCase()
        .replace(/^\[[^\]]+\]\s*/, "")
        .replace(/[^\w\s]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function buildUpdate(item: {
    title: string;
    summary: string;
    link: string;
    category: string;
    titlePrefix?: string;
}) {
    const normalizedTitle = item.titlePrefix
        ? `${item.titlePrefix}${item.title}`
        : item.title;

    return {
        title: normalizedTitle,
        slug: generateSlug(normalizedTitle),
        summary: truncate(item.summary, 500),
        content: `Source: ${item.link}`,
        why_it_matters: "Pending review",
        category: item.category,
        source_url: item.link,
        impact_score: 0,
        published: true
    };
}

async function fetchGoogleNewsSearch(config: {
    label: string;
    query: string;
    category: string;
    maxHours: number;
    maxItems: number;
}) {
    console.log(`Fetching Google News (${config.label})...`);

    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(config.query)}&hl=en-US&gl=US&ceid=US:en`;
    const items: any[] = [];

    try {
        const feed = await parser.parseURL(url);

        for (const item of feed.items) {
            if (!item.title || !item.link) continue;
            if (!isRecent(item.isoDate || item.pubDate, config.maxHours)) continue;

            const summary = extractSummary(item);
            if (isLowSignalNews(item.title, summary)) continue;

            if (isFomoNews(item.title, summary)) {
                items.push(buildUpdate({
                    title: item.title,
                    summary,
                    link: item.link,
                    category: config.category
                }));
            }
        }
    } catch (err) {
        console.error(`Google News (${config.label}) error:`, err);
    }

    const finalItems = items.slice(0, config.maxItems);
    console.log(`Google News (${config.label}) items extracted: ${finalItems.length}`);
    return finalItems;
}

async function fetchTrustedGoogleNews() {
    const batches = await Promise.all(
        TRUSTED_GOOGLE_NEWS_SEARCHES.map(config => fetchGoogleNewsSearch(config))
    );

    return batches.flat();
}

async function fetchTechCrunch() {
    console.log("Fetching TechCrunch (AI Startups)...");

    const url =
        "https://techcrunch.com/category/artificial-intelligence/feed/";

    const items: any[] = [];

    try {
        const feed = await parser.parseURL(url);

        for (const item of feed.items) {
            if (!item.title || !item.link) continue;
            if (!isRecent(item.isoDate || item.pubDate)) continue;

            const summary = extractSummary(item);
            if (isLowSignalNews(item.title, summary)) continue;

            if (isFomoNews(item.title, summary, true)) {
                items.push(buildUpdate({
                    title: item.title,
                    summary,
                    link: item.link,
                    category: "Startup Launch"
                }));
            }
        }
    } catch (err) {
        console.error("TechCrunch error:", err);
    }

    console.log(`TechCrunch Startups items extracted: ${items.length}`);
    return items;
}

async function fetchArxiv() {
    console.log("Fetching arXiv (New/Trending Papers)...");

    const url =
        "https://export.arxiv.org/api/query?search_query=cat:cs.AI+OR+cat:cs.LG&sortBy=submittedDate&sortOrder=descending&max_results=30";

    const items: any[] = [];

    try {
        const feed = await parser.parseURL(url);

        for (const item of feed.items) {
            if (!item.title || !item.link) continue;
            if (!isRecent(item.isoDate || item.pubDate, 96)) continue;

            const summary = extractSummary(item);
            if (isLowSignalNews(item.title, summary)) continue;

            if (isFomoNews(item.title, summary, true)) {
                items.push(buildUpdate({
                    title: item.title,
                    summary,
                    link: item.link,
                    category: "Research Paper",
                    titlePrefix: "[Paper] "
                }));
            }
        }
    } catch (err) {
        console.error("arXiv error:", err);
    }

    const finalItems = items.slice(0, 3);
    console.log(`arXiv Papers extracted: ${finalItems.length}`);
    return finalItems;
}

async function fetchGitHub() {
    console.log("Fetching GitHub (Trending AI Repos)...");

    const items: any[] = [];

    try {
        const lastWeek = new Date();
        lastWeek.setDate(lastWeek.getDate() - 7);
        const date = lastWeek.toISOString().split("T")[0];

        const url = `https://api.github.com/search/repositories?q=topic:ai+created:>=${date}&sort=stars&order=desc&per_page=15`;

        const res = await fetch(url);

        const data = await res.json();

        for (const repo of data.items || []) {
            if (repo.stargazers_count < 5) continue;

            items.push({
                title: `[Repo] ${repo.full_name}`,
                slug: generateSlug(repo.full_name),
                summary: truncate(repo.description || "", 500),
                content: `Source: ${repo.html_url}`,
                why_it_matters: "Pending review",
                category: "GitHub Release",
                source_url: repo.html_url,
                impact_score: 0,
                published: true
            });
        }
    } catch (err) {
        console.error("GitHub error:", err);
    }

    const finalItems = items.slice(0, 3);

    console.log(`GitHub Repos extracted: ${finalItems.length}`);
    return finalItems;
}

async function fetchHackerNews() {
    console.log("Fetching HackerNews (Frontpage AI)...");

    const last48h = Math.floor(Date.now() / 1000) - 48 * 60 * 60;
    const url = `https://hn.algolia.com/api/v1/search_by_date?query=AI%20OR%20LLM&tags=story&numericFilters=created_at_i>${last48h}`;

    const items: any[] = [];

    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Algolia API status: ${res.status}`);
        const data = await res.json();

        for (const item of data.hits || []) {
            if (!item.title) continue;
            const link = item.url || `https://news.ycombinator.com/item?id=${item.objectID}`;

            const summary = extractSummary({ summary: item.story_text || "" });

            if (isFomoNews(item.title, summary, true)) {
                items.push({
                    title: `[HN] ${item.title}`,
                    slug: generateSlug(item.title),
                    summary: truncate(summary, 500),
                    content: `Source: ${link}`,
                    why_it_matters: "Pending review",
                    category: "Community News",
                    source_url: link,
                    impact_score: 0,
                    published: true
                });
            }
        }
    } catch (err) {
        console.error("HN error:", err);
    }

    console.log(`HackerNews items extracted: ${items.length}`);
    return items;
}

async function fetchReddit() {
    console.log("Fetching Reddit (r/MachineLearning & r/LocalLLaMA)...");

    const urls = [
        "https://www.reddit.com/r/MachineLearning/top/.rss?t=day",
        "https://www.reddit.com/r/LocalLLaMA/top/.rss?t=day"
    ];

    const items: any[] = [];

    try {
        for (const url of urls) {
            const res = await fetch(url, {
                headers: {
                    "User-Agent":
                        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
                    Accept:
                        "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
                    "Accept-Language": "en-US,en;q=0.5",
                    Connection: "keep-alive",
                    "Upgrade-Insecure-Requests": "1"
                }
            });

            if (!res.ok) {
                console.error(`Reddit fetch failed with status: ${res.status}`);
                continue;
            }

            const xmlData = await res.text();

            const feed = await parser.parseString(xmlData);

            for (const item of feed.items) {
                if (!item.title || !item.link) continue;

                const date = item.isoDate || item.pubDate;

                if (!isRecent(date)) continue;

                const summary = extractSummary(item);

                if (isFomoNews(item.title, summary, true)) {
                    const subreddit = url.includes("MachineLearning")
                        ? "r/ML"
                        : "r/LocalLLaMA";

                    items.push({
                        title: `[${subreddit}] ${item.title}`,
                        slug: generateSlug(item.title),
                        summary: truncate(summary, 500),
                        content: `Source: ${item.link}`,
                        why_it_matters: "Pending review",
                        category: "Community News",
                        source_url: item.link,
                        impact_score: 0,
                        published: true
                    });
                }
            }
        }
    } catch (e) {
        console.error("Error fetching Reddit:", e);
    }

    console.log(`Reddit items extracted: ${items.length}`);

    return items;
}

async function summarize(update: any) {
    if (!ai) return update;

    try {
        const prompt = `
Summarize this AI news in 2-3 sentences and rate impact 0-10.

Title: ${update.title}
Snippet: ${update.summary}

Return JSON:
{ "summary": "...", "impact_score": number }
`;

        const res = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: { responseMimeType: "application/json", temperature: 0.2 }
        });

        if (res.text) {
            const cleaned = res.text.replace(/```json|```/g, "").trim();
            const data = JSON.parse(cleaned);

            if (data.summary) update.summary = data.summary;
            if (data.impact_score)
                update.impact_score = Math.min(10, Math.max(0, data.impact_score));
        }
    } catch (err) {
        console.error("Gemini summarization error:", err);
    }

    return update;
}

async function fetchNews() {
    const [
        trustedGoogle,
        techcrunch,
        arxiv
    ] = await Promise.all([
        fetchTrustedGoogleNews(),
        fetchTechCrunch(),
        fetchArxiv()
    ]);

    const collected = [
        ...trustedGoogle,
        ...techcrunch,
        ...arxiv
    ];

    console.log(`Total items fetched before dedup: ${collected.length}`);

    if (!collected.length) {
        console.log("No valid articles found from any source.");
        return;
    }

    const existing = await db
        .select({
            title: updates.title,
            source_url: updates.source_url
        })
        .from(updates)
        .limit(2000);

    const titles = new Set(existing.map(e => normalizeTitle(e.title)));
    const urls = new Set(existing.map(e => e.source_url));
    const seenTitles = new Set<string>();
    const seenUrls = new Set<string>();

    const unique = collected.filter(u => {
        const normalizedTitle = normalizeTitle(u.title);
        if (titles.has(normalizedTitle) || urls.has(u.source_url)) return false;
        if (seenTitles.has(normalizedTitle) || seenUrls.has(u.source_url)) return false;

        seenTitles.add(normalizedTitle);
        seenUrls.add(u.source_url);
        return true;
    });

    if (!unique.length) {
        console.log(
            "No new unique articles found. All articles are already in the database."
        );
        return;
    }

    console.log(
        `Processing ${unique.length} articles with Gemini AI for summarization...`
    );

    for (let i = 0; i < unique.length; i++) {
        console.log(`Summarizing ${i + 1}/${unique.length}: ${unique[i].title}`);
        await summarize(unique[i]);
    }

    const inserted = await db
        .insert(updates)
        .values(unique)
        .onConflictDoNothing({ target: updates.slug })
        .returning();

    console.log(`Successfully inserted ${inserted.length} articles.`);
}

fetchNews()
    .then(() => {
        console.log("News fetch pipeline completed.");
        process.exit(0);
    })
    .catch(err => {
        console.error("Unexpected error in pipeline:", err);
        process.exit(1);
    });
