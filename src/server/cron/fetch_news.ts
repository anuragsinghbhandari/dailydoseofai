import RSSParser from 'rss-parser';
import { updates } from '../schema';
import crypto from 'crypto';
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
dotenv.config();
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
}

const client = postgres(connectionString, {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10
});

const db = drizzle(client);

const ai = process.env.GEMINI_API_KEY
    ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
    : null;


const parser = new RSSParser({
    customFields: {
        item: ['content:encoded']
    },
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'application/rss+xml, application/rdf+xml;q=0.8, application/atom+xml, application/xml;q=0.9, text/xml;q=0.8'
    }
});

const GIANTS = ['openai', 'anthropic', 'deepmind', 'google', 'meta', 'xai', 'microsoft', 'apple', 'nvidia', 'midjourney'];
const HYPE_WORDS = ['release', 'released', 'launched', 'announces', 'announced', 'breakthrough', 'paper', 'sota', 'state of the art', 'model', 'llm', 'agi', 'open source', 'open-source', 'open weights', 'achieves', 'unveils'];

function isFomoNews(title: string, summary: string, loose: boolean = false): boolean {
    const content = (title + ' ' + summary).toLowerCase();

    // Check if it mentions a giant
    const hasGiant = GIANTS.some(giant => content.includes(giant));

    // Check if it mentions a hype word
    const hasHype = HYPE_WORDS.some(word => content.includes(word));

    // Specific very strong keywords that alone might be enough
    const STRONGS = ['gpt-5', 'gpt-4', 'claude 3', 'gemini 1.5', 'llama 3', 'sora'];
    const hasStrong = STRONGS.some(word => content.includes(word));

    if (loose) {
        // If loose, any mention of a strong word, giant, OR a powerful hype word (like llm or sota) is enough
        const hasLooseHype = ['llm', 'sota', 'state of the art', 'breakthrough', 'open source', 'open weights'].some(w => content.includes(w));
        return hasGiant || hasStrong || hasLooseHype;
    }

    return (hasGiant && hasHype) || hasStrong;
}

function isFromToday(dateString: string | undefined): boolean {
    if (!dateString) return false;

    const parsedDate = new Date(dateString);
    if (isNaN(parsedDate.getTime())) return false;

    // Convert both the parsed date and "today" to IST (Asia/Kolkata) strings for exact comparison
    const options: Intl.DateTimeFormatOptions = { timeZone: 'Asia/Kolkata', year: 'numeric', month: 'numeric', day: 'numeric' };

    // toLocaleDateString returns a formatted string like "M/D/YYYY" or similar depending on locale, 
    // but guarantees the numbers represent the date in that specific timeZone.
    const parsedIstDateString = parsedDate.toLocaleDateString('en-US', options);
    const todayIstDateString = new Date().toLocaleDateString('en-US', options);

    return parsedIstDateString === todayIstDateString;
}

function generateSlug(title: string): string {
    const baseSlug = title
        .toLowerCase()
        .replace(/[^a-z0-9 ]/g, '')
        .replace(/\s+/g, '-');

    const hash = crypto.createHash('md5').update(title + Date.now().toString()).digest('hex').substring(0, 6);
    return `${baseSlug}-${hash}`;
}

function cleanDescription(html: string): string {
    if (!html) return '';
    return html.replace(/<[^>]*>?/gm, '').trim();
}

function truncate(str: string, len: number) {
    if (str.length > len) {
        return str.substring(0, len - 3) + '...';
    }
    return str;
}

async function fetchGoogleNews() {
    console.log('Fetching Google News (AI)...');
    const url = 'https://news.google.com/rss/search?q=%28%22AI%22+OR+%22Artificial+Intelligence%22+OR+%22Machine+Learning%22%29+AND+%28%22release%22+OR+%22released%22+OR+%22model%22+OR+%22OpenAI%22+OR+%22Anthropic%22+OR+%22Google+DeepMind%22+OR+%22paper%22+OR+%22breakthrough%22+OR+%22AGI%22+OR+%22Meta+AI%22+OR+%22xAI%22+OR+%22announced%22+OR+%22launched%22+OR+%22LLM%22%29&hl=en-US&gl=US&ceid=US:en';
    const items = [];
    try {
        const feed = await parser.parseURL(url);
        for (const item of feed.items) {
            if (!item.title || !item.link) continue;
            // Only scrape news from today
            if (!isFromToday(item.pubDate && item.isoDate)) continue;

            const summary = cleanDescription(item.contentSnippet || item.content || '');
            if (isFomoNews(item.title, summary)) {
                items.push({
                    title: item.title,
                    slug: generateSlug(item.title),
                    summary: truncate(summary, 500),
                    content: `Source: ${item.link}`,
                    why_it_matters: 'Pending review',
                    category: 'AI News',
                    source_url: item.link,
                    impact_score: 0,
                    published: false,
                });
            }
        }
    } catch (e) {
        console.error('Error fetching Google News:', e);
    }
    console.log(`Google News AI items extracted: ${items.length}`);
    return items;
}

async function fetchTechCrunch() {
    console.log('Fetching TechCrunch (AI Startups)...');
    const url = 'https://techcrunch.com/category/artificial-intelligence/feed/';
    const items = [];
    try {
        // We use an extended parser to grab content:encoded if needed, but summary is usually fine
        const feed = await parser.parseURL(url);
        for (const item of feed.items) {
            if (!item.title || !item.link) continue;
            // Only scrape news from today
            if (!isFromToday(item.pubDate && item.isoDate)) continue;

            const summary = cleanDescription(item.contentSnippet || item.content || '');

            // Still strictly apply FOMO for startup news (e.g., funding, new models)
            if (isFomoNews(item.title, summary)) {
                items.push({
                    title: item.title,
                    slug: generateSlug(item.title),
                    summary: truncate(summary, 500),
                    content: `Source: ${item.link}`,
                    why_it_matters: 'Pending review',
                    category: 'Startup Launch',
                    source_url: item.link,
                    impact_score: 0,
                    published: false,
                });
            }
        }
    } catch (e) {
        console.error('Error fetching TechCrunch:', e);
    }
    console.log(`TechCrunch Startups items extracted: ${items.length}`);
    return items;
}

async function fetchArxiv() {
    console.log('Fetching arXiv (New/Trending Papers)...');
    // We query AI categories and get the latest submissions that mention our hype words
    const url = 'https://export.arxiv.org/api/query?search_query=cat:cs.AI+OR+cat:cs.CL+OR+cat:cs.CV+OR+cat:cs.LG&sortBy=submittedDate&sortOrder=descending&max_results=50';
    const items = [];
    try {
        const feed = await parser.parseURL(url);
        for (const item of feed.items) {
            if (!item.title || !item.link) continue;
            // Only scrape news from today
            if (!isFromToday(item.pubDate && item.isoDate)) continue;

            const summary = cleanDescription(item.contentSnippet || item.content || '');

            // Papers must meet a loose FOMO criteria (e.g. mentions LLM, SOTA, or a Giant) to be included
            if (isFomoNews(item.title, summary, true)) {
                const title = item.title.replace(/\n\s+/g, ' ').trim(); // Arxiv titles often have linebreaks
                items.push({
                    title: `[Paper] ${title}`,
                    slug: generateSlug(title),
                    summary: truncate(summary, 500),
                    content: `Source: ${item.link}`,
                    why_it_matters: 'Pending review',
                    category: 'Research Paper',
                    source_url: item.link,
                    impact_score: 0,
                    published: false,
                });
            }
        }
    } catch (e) {
        console.error('Error fetching arXiv:', e);
    }
    const finalItems = items.slice(0, 3);
    console.log(`arXiv Papers extracted: ${finalItems.length}`);
    return finalItems;
}

async function fetchGitHub() {
    console.log('Fetching GitHub (Trending AI Repos)...');
    const items = [];
    try {
        // Fetch AI repos created in the last 7 days (IST)
        // We calculate what "last week" is in IST, then format it to YYYY-MM-DD for the query
        const istTodayOptions: Intl.DateTimeFormatOptions = { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' };
        const d = new Date();
        d.setDate(d.getDate() - 7);
        const [month, day, year] = d.toLocaleDateString('en-US', istTodayOptions).split('/');
        const lastWeekStr = `${year}-${month}-${day}`;

        // Relaxed criteria: 5 stars instead of 10 to capture more emerging repos immediately
        const url = `https://api.github.com/search/repositories?q=topic:artificial-intelligence+topic:machine-learning+topic:llm+created:>=${lastWeekStr}&sort=stars&order=desc&per_page=15`;

        const res = await fetch(url, {
            headers: {
                'User-Agent': 'AiDoseAppCron',
                'Accept': 'application/vnd.github.v3+json'
            }
        });

        if (!res.ok) {
            throw new Error(`GitHub API HTTP ${res.status}`);
        }

        const data = await res.json();
        const repos = data.items || [];

        for (const repo of repos) {
            // A new repo generating at least 5 stars in a few days is good signal
            // We relaxed the `isFromToday` constraint to allow repos catching fire over the last few days
            if (repo.stargazers_count >= 5 && repo.name && repo.html_url) {
                items.push({
                    title: `[Repo] ${repo.full_name} (${repo.stargazers_count} stars rapidly)`,
                    slug: generateSlug(repo.full_name),
                    summary: truncate(repo.description || 'No description provided for this trending repository.', 500),
                    content: `Source: ${repo.html_url}`,
                    why_it_matters: 'Pending review',
                    category: 'GitHub Release',
                    source_url: repo.html_url,
                    impact_score: 0,
                    published: false,
                });
            }
        }
    } catch (e) {
        console.error('Error fetching GitHub:', e);
    }
    const finalItems = items.slice(0, 3);
    console.log(`GitHub Repos extracted: ${finalItems.length}`);
    return finalItems;
}

async function fetchHackerNews() {
    console.log('Fetching HackerNews (Frontpage AI)...');
    const url = 'https://hnrss.org/frontpage?q=AI+OR+"Machine+Learning"+OR+LLM';
    const items = [];
    try {
        const feed = await parser.parseURL(url);
        for (const item of feed.items) {
            if (!item.title || !item.link) continue;
            if (!isFromToday(item.pubDate && item.isoDate)) continue;

            const summary = cleanDescription(item.contentSnippet || item.content || '');

            // HackerNews submissions on the front page are inherently high impact, but we still filter for FOMO
            if (isFomoNews(item.title, summary, true)) {
                items.push({
                    title: `[HN] ${item.title}`,
                    slug: generateSlug(item.title),
                    summary: truncate(summary, 500),
                    content: `Source: ${item.link}`,
                    why_it_matters: 'Pending review',
                    category: 'Community News',
                    source_url: item.link,
                    impact_score: 0,
                    published: false,
                });
            }
        }
    } catch (e) {
        console.error('Error fetching HackerNews:', e);
    }
    console.log(`HackerNews items extracted: ${items.length}`);
    return items;
}

async function fetchReddit() {
    console.log('Fetching Reddit (r/MachineLearning & r/LocalLLaMA)...');
    const urls = [
        'https://www.reddit.com/r/MachineLearning/top/.rss?t=day',
        'https://www.reddit.com/r/LocalLLaMA/top/.rss?t=day'
    ];
    const items = [];
    try {
        for (const url of urls) {
            // Reddit aggressively blocks automated RSS requests.
            // Using a native fetch with explicitly spoofed headers to bypass 403s.
            const res = await fetch(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.5',
                    'Connection': 'keep-alive',
                    'Upgrade-Insecure-Requests': '1'
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
                if (!isFromToday(item.pubDate && item.isoDate)) continue;

                const summary = cleanDescription(item.contentSnippet || item.content || '');

                // Reddit top daily posts often discuss breakthroughs
                if (isFomoNews(item.title, summary, true)) {
                    // Extract subreddit name from URL for flair
                    const subreddit = url.includes('MachineLearning') ? 'r/ML' : 'r/LocalLLaMA';
                    items.push({
                        title: `[${subreddit}] ${item.title}`,
                        slug: generateSlug(item.title),
                        summary: truncate(summary, 500),
                        content: `Source: ${item.link}`,
                        why_it_matters: 'Pending review',
                        category: 'Community News',
                        source_url: item.link,
                        impact_score: 0,
                        published: false,
                    });
                }
            }
        }
    } catch (e) {
        console.error('Error fetching Reddit:', e);
    }
    console.log(`Reddit items extracted: ${items.length}`);
    return items;
}

async function fetchNews() {
    try {
        // Run all fetchers concurrently
        const [googleItems, techCrunchItems, arxivItems, githubItems, hnItems, redditItems] = await Promise.all([
            fetchGoogleNews(),
            fetchTechCrunch(),
            fetchArxiv(),
            fetchGitHub(),
            fetchHackerNews(),
            fetchReddit()
        ]);

        const newUpdates = [...googleItems, ...techCrunchItems, ...arxivItems, ...githubItems, ...hnItems, ...redditItems];
        console.log(`Total items fetched before dedup: ${newUpdates.length}`);

        if (newUpdates.length === 0) {
            console.log('No valid articles found from any source to insert.');
            return;
        }

        // Fetch existing recent URLs to avoid inserting the same news repeatedly
        const existingUpdates = await db.select({
            source_url: updates.source_url,
            title: updates.title
        }).from(updates);

        const existingUrls = new Set(existingUpdates.map(u => u.source_url));
        const existingTitles = new Set(existingUpdates.map(u => u.title));

        const uniqueNewUpdates = newUpdates.filter(update =>
            !existingUrls.has(update.source_url) && !existingTitles.has(update.title)
        );

        if (uniqueNewUpdates.length === 0) {
            console.log('No new unique articles found. All articles are already in the database.');
            return;
        }

        console.log(`Processing ${uniqueNewUpdates.length} articles with Gemini AI for summarization...`);

        // Enhance updates using Gemini before insertion
        for (let i = 0; i < uniqueNewUpdates.length; i++) {
            const update = uniqueNewUpdates[i];
            console.log(`Summarizing ${i + 1}/${uniqueNewUpdates.length}: ${update.title}`);

            if (ai) {
                try {
                    const prompt = `You are an expert AI news curator. Read the following article title and raw scraped snippet. 
                    1. Extract the "main crux" of the news into a highly readable, concise 2-3 sentence summary that clearly explains what happened and why it matters in the AI space.
                    2. Rate the "Impact Score" of this news for the AI community on a scale of 0 to 10 (where 10 is a world-changing event like a major model release or a fundamental paper, and 1 is a minor tool update).
                    
Title: ${update.title}
Raw Snippet: ${update.summary}
Source: ${update.source_url}

Return the results in JSON format with the keys: "summary" and "impact_score".`;

                    const response = await ai.models.generateContent({
                        model: "gemini-2.5-flash",
                        contents: prompt,
                        config: {
                            temperature: 0.2,
                            responseMimeType: "application/json",
                        }
                    });

                    if (response.text) {
                        try {
                            const data = JSON.parse(response.text.trim());
                            if (data.summary) update.summary = data.summary;
                            if (typeof data.impact_score === 'number') {
                                // Ensure score is an integer between 0-10
                                update.impact_score = Math.min(10, Math.max(0, Math.round(data.impact_score)));
                            }
                        } catch (parseError) {
                            console.error(`Failed to parse AI response for ${update.title}. Text: ${response.text}`, parseError);
                            // Fallback to text if parsing fails (at least we get a summary)
                            update.summary = response.text.trim().substring(0, 500);
                        }
                    }
                } catch (aiError) {
                    console.error(`Failed to generate AI summary for ${update.title}. Falling back to scraped snippet.`, aiError);
                }
            } else {
                console.warn('GEMINI_API_KEY missing. Skipping AI summarization.');
            }
        }

        console.log(`Inserting ${uniqueNewUpdates.length} new articles into the database as drafts...`);

        const result = await db.insert(updates)
            .values(uniqueNewUpdates)
            .onConflictDoNothing({ target: updates.slug })
            .returning();

        console.log(`Successfully inserted ${result.length} articles.`);

    } catch (error) {
        console.error('Error fetching or inserting news:', error);
        process.exit(1);
    }
}

fetchNews()
    .then(() => {
        console.log('News fetch pipeline completed.');
        process.exit(0);
    })
    .catch((err) => {
        console.error('Unexpected error in pipeline:', err);
        process.exit(1);
    });
