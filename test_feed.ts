import RSSParser from "rss-parser";

const parser = new RSSParser();

const GIANTS = [
    "openai",
    "anthropic",
    "deepmind",
    "google",
    "meta",
    "xai",
    "microsoft",
    "apple",
    "nvidia",
    "huggingface" // adding huggingface
];

const HYPE = [
    "release",
    "released",
    "model",
    "llm",
    "paper",
    "breakthrough",
    "open source",
    "open weights",
    "benchmark",
    "sota"
];

function isFomoNews(title: string, summary: string, loose = false) {
    const content = (title + " " + summary).toLowerCase();

    const hasGiant = GIANTS.some(g => content.includes(g));
    const hasHype = HYPE.some(h => content.includes(h));

    const strong = ["gpt", "claude", "gemini", "llama", "sora", "qwen", "mistral"];
    const strongMatch = strong.some(s => content.includes(s));

    if (loose) return hasGiant || strongMatch || hasHype;

    return (hasGiant && hasHype) || strongMatch;
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

async function testGoogleNews() {
    const url = "https://news.google.com/rss/search?q=AI+OR+Artificial+Intelligence+OR+Machine+Learning+when:1d&hl=en-US&gl=US&ceid=US:en";
    const feed = await parser.parseURL(url);
    console.log("--- Google News ---");
    let validCount = 0;
    for (const item of feed.items) {
        if (!item.title || !item.link) continue;
        const recent = isRecent(item.isoDate || item.pubDate, 48); // Try 48 hours for leniency
        const summary = extractSummary(item);
        const fomo = isFomoNews(item.title, summary);
        if (recent && fomo) validCount++;
        if (validCount === 1 && recent && fomo) {
            console.log("First Match:", { title: item.title, date: item.isoDate || item.pubDate });
        }
    }
    console.log("Valid Count:", validCount, "/", feed.items.length);
}

async function testArxiv() {
    const url = "https://export.arxiv.org/api/query?search_query=cat:cs.AI+OR+cat:cs.LG&sortBy=submittedDate&sortOrder=descending&max_results=30";
    const feed = await parser.parseURL(url);
    console.log("--- Arxiv ---");
    let validCount = 0;
    for (const item of feed.items) {
        if (!item.title || !item.link) continue;
        const recent = isRecent(item.isoDate || item.pubDate, 96); // Allow up to 96 hours because arxiv is slow to publish
        const summary = extractSummary(item);
        const fomo = isFomoNews(item.title, summary, true); // loosely fomo
        if (recent && fomo) validCount++;
        if (validCount === 1 && recent && fomo) {
            console.log("First Match:", { title: item.title, date: item.isoDate || item.pubDate });
        }
    }
    console.log("Valid Count:", validCount, "/", feed.items.length);
}

async function testHNAPI() {
    console.log("--- HN Algolia API ---");
    const last48h = Math.floor(Date.now() / 1000) - 48 * 60 * 60;
    const url = `https://hn.algolia.com/api/v1/search_by_date?query=AI%20OR%20LLM&tags=story&numericFilters=created_at_i>${last48h}`;

    const res = await fetch(url);
    if (!res.ok) {
        throw new Error(`Algolia failed with status: ${res.status}`);
    }
    const data = await res.json();
    let validCount = 0;

    for (const item of data.hits || []) {
        if (!item.title || !item.url) continue;

        const summary = extractSummary({ summary: item.story_text || "" });

        if (isFomoNews(item.title, summary, true)) {
            validCount++;
            if (validCount === 1) {
                console.log("First Match:", { title: item.title, date: item.created_at });
            }
        }
    }
    console.log("Valid Count:", validCount, "/", data.hits.length);
}

async function run() {
    try { await testGoogleNews(); } catch (e: any) { console.error("Google News Error:", e.message); }
    try { await testArxiv(); } catch (e: any) { console.error("Arxiv Error:", e.message); }
    try { await testHNAPI(); } catch (e: any) { console.error("HN API Error:", e.message); }
}

run();
