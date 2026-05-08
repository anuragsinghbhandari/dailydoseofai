import RSSParser from "rss-parser";
import { updates, type NewUpdate } from "../schema";
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

const MAX_GITHUB_ITEMS = 3;
const MAX_HN_ITEMS = 6;
const MAX_REDDIT_ITEMS = 6;
const SUMMARIZE_CONCURRENCY = 4;
const MAX_SOURCE_CONTEXT_CHARS = 12000;
const MAX_SOURCE_FETCH_CHARS = 20000;
const SOURCE_DATE_GRACE_HOURS = 12;
const MAX_FUTURE_SKEW_MS = 2 * 60 * 60 * 1000;
const EXISTING_DEDUPE_LOOKBACK = 5000;

type CandidateUpdate = NewUpdate & {
    _feedPublishedAt?: Date;
    _sourcePublishedAt?: Date | null;
    _maxAgeHours?: number;
    _skipReason?: string;
};

type SourceContext = {
    text: string | null;
    finalUrl: string;
    canonicalUrl: string | null;
    publishedAt: Date | null;
};

type ExistingUpdateFingerprint = {
    title: string;
    source_url: string;
};

type NewsFingerprint = {
    normalizedTitle: string;
    urlKey: string;
    tokens: Set<string>;
    entityTokens: Set<string>;
};

const TITLE_STOP_WORDS = new Set([
    "about",
    "after",
    "against",
    "also",
    "amid",
    "among",
    "around",
    "based",
    "been",
    "being",
    "blog",
    "could",
    "from",
    "have",
    "into",
    "latest",
    "more",
    "new",
    "news",
    "over",
    "said",
    "says",
    "that",
    "their",
    "them",
    "then",
    "these",
    "they",
    "this",
    "through",
    "under",
    "update",
    "using",
    "with",
    "will",
    "your"
]);

const PUBLISHER_SUFFIX_HINTS = [
    "ars technica",
    "business insider",
    "google blog",
    "hacker news",
    "hugging face",
    "mit technology review",
    "techcrunch",
    "the decoder",
    "the verge",
    "venturebeat",
    "wired",
    "zdnet"
];

const ENTITY_TERMS = [
    ...GIANTS,
    "huggingface",
    "hugging face",
    "mistral",
    "qwen",
    "gpt",
    "claude",
    "gemini",
    "llama",
    "sora"
];

function isPendingReviewValue(value?: string | null) {
    return !value || value.trim().toLowerCase() === "pending review";
}

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

function parseDate(value?: string | Date | null) {
    if (!value) return null;

    const parsed = value instanceof Date ? value : new Date(value);
    const timestamp = parsed.getTime();

    if (Number.isNaN(timestamp)) return null;

    return parsed;
}

function isWithinAge(date: Date, maxHours: number) {
    const age = Date.now() - date.getTime();
    return age >= -MAX_FUTURE_SKEW_MS && age <= maxHours * 60 * 60 * 1000;
}

function getRecentDate(date?: string | Date | null, maxHours = 24) {
    const parsed = parseDate(date);
    if (!parsed) return null;

    return isWithinAge(parsed, maxHours) ? parsed : null;
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

function decodeHtmlEntities(value: string) {
    return value
        .replace(/&amp;/gi, "&")
        .replace(/&quot;/gi, "\"")
        .replace(/&#39;/gi, "'")
        .replace(/&apos;/gi, "'")
        .replace(/&lt;/gi, "<")
        .replace(/&gt;/gi, ">");
}

function stripHtml(html: string) {
    return decodeHtmlEntities(html)
        .replace(/<script[\s\S]*?<\/script>/gi, " ")
        .replace(/<style[\s\S]*?<\/style>/gi, " ")
        .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
        .replace(/<svg[\s\S]*?<\/svg>/gi, " ")
        .replace(/<[^>]+>/g, " ")
        .replace(/&nbsp;/gi, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function getHtmlAttr(tag: string, attr: string) {
    const match = tag.match(new RegExp(`${attr}\\s*=\\s*["']([^"']+)["']`, "i"));
    return match ? decodeHtmlEntities(match[1]) : null;
}

function extractCanonicalUrl(html: string, baseUrl: string) {
    const linkTags = html.match(/<link\b[^>]*>/gi) || [];

    for (const tag of linkTags) {
        const rel = getHtmlAttr(tag, "rel")?.toLowerCase();
        const href = getHtmlAttr(tag, "href");

        if (!rel || !href || !rel.split(/\s+/).includes("canonical")) continue;

        try {
            return new URL(href, baseUrl).toString();
        } catch {
            return null;
        }
    }

    return null;
}

function extractPublishedDateFromHtml(html: string) {
    const dateFieldNames = new Set([
        "article:published_time",
        "date",
        "datepublished",
        "dc.date",
        "dc.date.issued",
        "og:published_time",
        "pubdate",
        "publishdate",
        "timestamp"
    ]);

    const metaTags = html.match(/<meta\b[^>]*>/gi) || [];

    for (const tag of metaTags) {
        const fieldName =
            getHtmlAttr(tag, "property") ||
            getHtmlAttr(tag, "name") ||
            getHtmlAttr(tag, "itemprop");
        const content = getHtmlAttr(tag, "content");

        if (!fieldName || !content) continue;

        const normalizedFieldName = fieldName.trim().toLowerCase();
        if (!dateFieldNames.has(normalizedFieldName)) continue;

        const parsed = parseDate(content);
        if (parsed) return parsed;
    }

    const timeTags = html.match(/<time\b[^>]*>/gi) || [];

    for (const tag of timeTags) {
        const datetime = getHtmlAttr(tag, "datetime");
        const parsed = parseDate(datetime);
        if (parsed) return parsed;
    }

    const jsonLdDates = [
        ...html.matchAll(/"datePublished"\s*:\s*"([^"]+)"/gi)
    ];

    for (const match of jsonLdDates) {
        const parsed = parseDate(match[1]);
        if (parsed) return parsed;
    }

    return null;
}

function extractPublishedDateFromUrl(url: string) {
    try {
        const parsed = new URL(url);
        const match = parsed.pathname.match(
            /(?:^|\/)(20\d{2})[\/-](0?[1-9]|1[0-2])(?:[\/-](0?[1-9]|[12]\d|3[01]))?(?:\/|$)/
        );

        if (!match) return null;

        const year = Number(match[1]);
        const month = Number(match[2]);
        const day = match[3] ? Number(match[3]) : 1;
        const date = new Date(Date.UTC(year, month - 1, day));

        return Number.isNaN(date.getTime()) ? null : date;
    } catch {
        return null;
    }
}

function isGoogleNewsUrl(url: string) {
    try {
        const host = new URL(url).hostname.replace(/^www\./, "");
        return host === "news.google.com";
    } catch {
        return false;
    }
}

function extractLikelyArticleText(html: string) {
    const articleMatch = html.match(/<article[\s\S]*?<\/article>/i);
    if (articleMatch) return stripHtml(articleMatch[0]);

    const mainMatch = html.match(/<main[\s\S]*?<\/main>/i);
    if (mainMatch) return stripHtml(mainMatch[0]);

    const bodyMatch = html.match(/<body[\s\S]*?<\/body>/i);
    if (bodyMatch) return stripHtml(bodyMatch[0]);

    return stripHtml(html);
}

async function fetchSourceContext(url: string) {
    try {
        const res = await fetch(url, {
            headers: {
                "User-Agent":
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
                Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            }
        });

        if (!res.ok) {
            throw new Error(`source fetch failed with status ${res.status}`);
        }

        const contentType = res.headers.get("content-type") || "";
        const finalUrl = res.url || url;

        if (!contentType.includes("text/html") && !contentType.includes("application/xhtml+xml")) {
            return {
                text: null,
                finalUrl,
                canonicalUrl: null,
                publishedAt: null
            } satisfies SourceContext;
        }

        const html = (await res.text()).slice(0, MAX_SOURCE_FETCH_CHARS);
        const text = extractLikelyArticleText(html).slice(0, MAX_SOURCE_CONTEXT_CHARS);
        const canonicalUrl = extractCanonicalUrl(html, finalUrl);
        const publishedAt = extractPublishedDateFromHtml(html);

        return {
            text: text || null,
            finalUrl,
            canonicalUrl,
            publishedAt
        } satisfies SourceContext;
    } catch (err) {
        console.error(`Source context fetch error for ${url}:`, err);
        return null;
    }
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

function stripPublisherSuffix(title: string) {
    const parts = title.split(/\s[-–—]\s/);
    if (parts.length < 2) return title;

    const suffix = parts[parts.length - 1].trim().toLowerCase();
    const suffixLooksLikePublisher =
        suffix.split(/\s+/).length <= 5 &&
        PUBLISHER_SUFFIX_HINTS.some(hint => suffix.includes(hint));

    return suffixLooksLikePublisher ? parts.slice(0, -1).join(" - ") : title;
}

function normalizeTitle(title: string) {
    return stripPublisherSuffix(title)
        .toLowerCase()
        .replace(/^(\[[^\]]+\]\s*)+/, "")
        .replace(/\bgpt[\s-]?(\d[\w.]*)\b/g, "gpt$1")
        .replace(/\bclaude[\s-]?(\d[\w.]*)\b/g, "claude$1")
        .replace(/\bllama[\s-]?(\d[\w.]*)\b/g, "llama$1")
        .replace(/[^\w\s]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function normalizeSourceUrl(url: string) {
    try {
        const parsed = new URL(url);
        const host = parsed.hostname
            .toLowerCase()
            .replace(/^www\./, "")
            .replace(/^m\./, "");

        const searchParams = new URLSearchParams(parsed.search);
        for (const key of [...searchParams.keys()]) {
            const lowerKey = key.toLowerCase();
            if (
                lowerKey.startsWith("utm_") ||
                ["fbclid", "gclid", "mc_cid", "mc_eid", "ref", "ref_src"].includes(lowerKey)
            ) {
                searchParams.delete(key);
            }
        }

        const path = parsed.pathname.replace(/\/$/, "");
        const query = searchParams.toString();

        return `${host}${path}${query ? `?${query}` : ""}`;
    } catch {
        return url.trim().toLowerCase();
    }
}

function canonicalToken(token: string) {
    return token
        .replace(/ies$/, "y")
        .replace(/sses$/, "ss")
        .replace(/s$/, "");
}

function tokenizeTitle(title: string) {
    return normalizeTitle(title)
        .split(/\s+/)
        .map(canonicalToken)
        .filter(token => token.length >= 3 && !TITLE_STOP_WORDS.has(token));
}

function buildFingerprint(title: string, sourceUrl: string): NewsFingerprint {
    const tokens = new Set(tokenizeTitle(title));
    const entityTokens = new Set(
        [...tokens].filter(token =>
            ENTITY_TERMS.some(entity => token === entity.replace(/\s+/g, "") || token.includes(entity.replace(/\s+/g, "")))
        )
    );

    return {
        normalizedTitle: normalizeTitle(title),
        urlKey: normalizeSourceUrl(sourceUrl),
        tokens,
        entityTokens
    };
}

function intersectionSize(a: Set<string>, b: Set<string>) {
    let count = 0;

    for (const value of a) {
        if (b.has(value)) count += 1;
    }

    return count;
}

function isLikelySameStory(a: NewsFingerprint, b: NewsFingerprint) {
    if (a.urlKey && a.urlKey === b.urlKey) return true;
    if (a.normalizedTitle && a.normalizedTitle === b.normalizedTitle) return true;

    if (
        a.normalizedTitle.length >= 30 &&
        b.normalizedTitle.length >= 30 &&
        (a.normalizedTitle.includes(b.normalizedTitle) ||
            b.normalizedTitle.includes(a.normalizedTitle))
    ) {
        return true;
    }

    const smallerTokenCount = Math.min(a.tokens.size, b.tokens.size);
    if (smallerTokenCount < 3) return false;

    const overlap = intersectionSize(a.tokens, b.tokens);
    const coverage = overlap / smallerTokenCount;
    const entityOverlap = intersectionSize(a.entityTokens, b.entityTokens);

    return (
        (overlap >= 5 && coverage >= 0.58) ||
        (entityOverlap > 0 && overlap >= 4 && coverage >= 0.5) ||
        (entityOverlap >= 2 && overlap >= 3)
    );
}

function dedupeCandidates(
    candidates: CandidateUpdate[],
    existing: ExistingUpdateFingerprint[],
    stage: string
) {
    const existingFingerprints = existing.map(item =>
        buildFingerprint(item.title, item.source_url)
    );
    const seenFingerprints: NewsFingerprint[] = [];
    const unique: CandidateUpdate[] = [];
    let duplicateCount = 0;

    for (const candidate of candidates) {
        const fingerprint = buildFingerprint(candidate.title, candidate.source_url);
        const duplicatesExisting = existingFingerprints.some(existingFingerprint =>
            isLikelySameStory(fingerprint, existingFingerprint)
        );
        const duplicatesCurrentBatch = seenFingerprints.some(seenFingerprint =>
            isLikelySameStory(fingerprint, seenFingerprint)
        );

        if (duplicatesExisting || duplicatesCurrentBatch) {
            duplicateCount += 1;
            continue;
        }

        seenFingerprints.push(fingerprint);
        unique.push(candidate);
    }

    console.log(`${stage} dedupe removed ${duplicateCount} duplicate items.`);
    return unique;
}

function isFreshCandidate(update: CandidateUpdate) {
    if (update._skipReason) return false;

    const maxAgeHours = (update._maxAgeHours ?? 24) + SOURCE_DATE_GRACE_HOURS;
    const sourcePublishedAt = update._sourcePublishedAt;

    if (sourcePublishedAt && !isWithinAge(sourcePublishedAt, maxAgeHours)) {
        update._skipReason = `source date ${sourcePublishedAt.toISOString()} is outside ${maxAgeHours}h freshness window`;
        return false;
    }

    const feedPublishedAt = update._feedPublishedAt || parseDate(update.created_at);
    if (feedPublishedAt && !isWithinAge(feedPublishedAt, maxAgeHours)) {
        update._skipReason = `feed date ${feedPublishedAt.toISOString()} is outside ${maxAgeHours}h freshness window`;
        return false;
    }

    return true;
}

function toInsertableUpdate(update: CandidateUpdate): NewUpdate {
    const {
        _feedPublishedAt,
        _sourcePublishedAt,
        _maxAgeHours,
        _skipReason,
        ...insertable
    } = update;

    return insertable;
}

function buildUpdate(item: {
    title: string;
    summary: string;
    link: string;
    category: string;
    publishedAt: Date;
    maxAgeHours: number;
    titlePrefix?: string;
}): CandidateUpdate {
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
        published: true,
        created_at: item.publishedAt,
        _feedPublishedAt: item.publishedAt,
        _maxAgeHours: item.maxAgeHours
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
            const publishedAt = getRecentDate(item.isoDate || item.pubDate, config.maxHours);
            if (!publishedAt) continue;

            const summary = extractSummary(item);
            if (isLowSignalNews(item.title, summary)) continue;

            if (isFomoNews(item.title, summary)) {
                items.push(buildUpdate({
                    title: item.title,
                    summary,
                    link: item.link,
                    category: config.category,
                    publishedAt,
                    maxAgeHours: config.maxHours
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
            const publishedAt = getRecentDate(item.isoDate || item.pubDate);
            if (!publishedAt) continue;

            const summary = extractSummary(item);
            if (isLowSignalNews(item.title, summary)) continue;

            if (isFomoNews(item.title, summary, true)) {
                items.push(buildUpdate({
                    title: item.title,
                    summary,
                    link: item.link,
                    category: "Startup Launch",
                    publishedAt,
                    maxAgeHours: 24
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
            const publishedAt = getRecentDate(item.isoDate || item.pubDate, 96);
            if (!publishedAt) continue;

            const summary = extractSummary(item);
            if (isLowSignalNews(item.title, summary)) continue;

            if (isFomoNews(item.title, summary, true)) {
                items.push(buildUpdate({
                    title: item.title,
                    summary,
                    link: item.link,
                    category: "Research Paper",
                    publishedAt,
                    maxAgeHours: 96,
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
            const publishedAt = getRecentDate(repo.created_at, 7 * 24);
            if (!publishedAt) continue;

            items.push({
                title: `[Repo] ${repo.full_name}`,
                slug: generateSlug(repo.full_name),
                summary: truncate(repo.description || "", 500),
                content: `Source: ${repo.html_url}`,
                why_it_matters: "Pending review",
                category: "GitHub Release",
                source_url: repo.html_url,
                impact_score: 0,
                published: true,
                created_at: publishedAt,
                _feedPublishedAt: publishedAt,
                _maxAgeHours: 7 * 24
            });
        }
    } catch (err) {
        console.error("GitHub error:", err);
    }

    const finalItems = items.slice(0, MAX_GITHUB_ITEMS);

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
            const publishedAt = getRecentDate(item.created_at, 48);
            if (!publishedAt) continue;
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
                    published: true,
                    created_at: publishedAt,
                    _feedPublishedAt: publishedAt,
                    _maxAgeHours: 48
                });
            }
        }
    } catch (err) {
        console.error("HN error:", err);
    }

    const finalItems = items.slice(0, MAX_HN_ITEMS);
    console.log(`HackerNews items extracted: ${finalItems.length}`);
    return finalItems;
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

                const publishedAt = getRecentDate(date);
                if (!publishedAt) continue;

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
                        published: true,
                        created_at: publishedAt,
                        _feedPublishedAt: publishedAt,
                        _maxAgeHours: 24
                    });
                }
            }
        }
    } catch (e) {
        console.error("Error fetching Reddit:", e);
    }

    const finalItems = items.slice(0, MAX_REDDIT_ITEMS);
    console.log(`Reddit items extracted: ${finalItems.length}`);

    return finalItems;
}

async function summarize(update: CandidateUpdate) {
    try {
        const sourceContext = update.source_url ? await fetchSourceContext(update.source_url) : null;
        if (sourceContext?.canonicalUrl) {
            update.source_url = sourceContext.canonicalUrl;
        } else if (sourceContext?.finalUrl && !isGoogleNewsUrl(sourceContext.finalUrl)) {
            update.source_url = sourceContext.finalUrl;
        }

        update._sourcePublishedAt =
            sourceContext?.publishedAt ??
            (update.source_url ? extractPublishedDateFromUrl(update.source_url) : null);

        if (!isFreshCandidate(update)) {
            return update;
        }

        if (!ai) return update;

        const prompt = `
You are writing a high-signal AI news brief for AI Dose.

Use the source context when it is available. Be concrete, avoid hype, and do not say "pending review".
If the source context is weak or missing, rely on the title and snippet only and keep claims conservative.

Title: ${update.title}
Snippet: ${update.summary}
Existing category: ${update.category}
Source URL: ${update.source_url || "N/A"}

Source context:
${sourceContext?.text || "No additional source context available."}

Return JSON:
{
  "summary": "2-3 sentence summary",
  "why_it_matters": "1-2 sentence practical significance",
  "content": "Detailed analysis in markdown with optional headings like ## What happened, ## Key details, ## What to watch",
  "impact_score": number
}
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
            if (data.why_it_matters && !isPendingReviewValue(data.why_it_matters)) {
                update.why_it_matters = data.why_it_matters;
            }
            if (data.content && typeof data.content === "string") {
                update.content = data.content.trim();
            }
            if (data.impact_score)
                update.impact_score = Math.min(10, Math.max(0, data.impact_score));
        }
    } catch (err) {
        console.error("Gemini summarization error:", err);
    }

    return update;
}

async function summarizeInBatches(items: CandidateUpdate[]) {
    for (let i = 0; i < items.length; i += SUMMARIZE_CONCURRENCY) {
        const batch = items.slice(i, i + SUMMARIZE_CONCURRENCY);

        await Promise.all(
            batch.map((item, batchIndex) => {
                console.log(
                    `Summarizing ${i + batchIndex + 1}/${items.length}: ${item.title}`
                );
                return summarize(item);
            })
        );
    }
}

async function fetchNews() {
    const [
        trustedGoogle,
        techcrunch,
        arxiv,
        github,
        hackerNews,
        reddit
    ] = await Promise.all([
        fetchTrustedGoogleNews(),
        fetchTechCrunch(),
        fetchArxiv(),
        fetchGitHub(),
        fetchHackerNews(),
        fetchReddit()
    ]);

    const collected = [
        ...trustedGoogle,
        ...techcrunch,
        ...arxiv,
        ...github,
        ...hackerNews,
        ...reddit
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
        .limit(EXISTING_DEDUPE_LOOKBACK);

    const unique = dedupeCandidates(collected, existing, "Pre-enrichment");

    if (!unique.length) {
        console.log(
            "No new unique articles found. All articles are already in the database."
        );
        return;
    }

    console.log(
        `Processing ${unique.length} articles with Gemini AI for summarization...`
    );

    await summarizeInBatches(unique);

    const fresh = unique.filter(item => {
        if (isFreshCandidate(item)) return true;

        console.log(`Skipping stale item: ${item.title} (${item._skipReason})`);
        return false;
    });

    const finalUnique = dedupeCandidates(fresh, existing, "Post-enrichment");

    if (!finalUnique.length) {
        console.log(
            "No new fresh unique articles found after source date checks and final dedupe."
        );
        return;
    }

    const publishedAt = new Date();
    const rowsToInsert = finalUnique.map((update, index) => ({
        ...toInsertableUpdate(update),
        // Archive dates represent when AI Dose publishes the brief; source dates are only used for freshness checks.
        created_at: new Date(publishedAt.getTime() + index)
    }));

    const inserted = await db
        .insert(updates)
        .values(rowsToInsert)
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
