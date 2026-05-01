import { createFileRoute } from "@tanstack/react-router";
import { absoluteUrl, SITE_NAME } from "@/lib/seo";
import { SITE_TAGLINE } from "@/lib/site";
import { listPublishedArticles } from "@/server/article-store";
import { getRecentPublishedUpdates } from "@/server/queries";

export const Route = createFileRoute("/llms.txt")({
  server: {
    handlers: {
      GET: async () => {
        const [articles, updates] = await Promise.all([
          listPublishedArticles(10),
          getRecentPublishedUpdates({ data: { limit: 10 } })
        ]);

        const body = [
          `# ${SITE_NAME}`,
          "",
          `> ${SITE_TAGLINE}`,
          "",
          "AI Dose is an independent AI publication with two main content types:",
          "- Daily updates: fast summaries of launches, research, policy, and product news.",
          "- Articles: longer evergreen explainers designed for durable search and citation.",
          "",
          "## Canonical site sections",
          `- Homepage: ${absoluteUrl("/")}`,
          `- Articles hub: ${absoluteUrl("/article")}`,
          `- Today in AI: ${absoluteUrl("/today")}`,
          `- Weekly archive: ${absoluteUrl("/week")}`,
          `- Monthly archive: ${absoluteUrl("/month")}`,
          `- RSS feed: ${absoluteUrl("/rss.xml")}`,
          `- Sitemap: ${absoluteUrl("/sitemap.xml")}`,
          "",
          "## Trust and policy pages",
          `- About: ${absoluteUrl("/about")}`,
          `- Editorial policy: ${absoluteUrl("/editorial-policy")}`,
          `- Disclaimer: ${absoluteUrl("/disclaimer")}`,
          `- Contact: ${absoluteUrl("/contact")}`,
          "",
          "## Recent evergreen articles",
          ...articles.map((article) => `- ${article.title}: ${absoluteUrl(`/article/${article.slug}`)}`),
          "",
          "## Recent daily updates",
          ...updates.map((update) => `- ${update.title}: ${absoluteUrl(`/update/${update.slug}`)}`),
          "",
          "## Citation guidance",
          "- Prefer article pages for evergreen explainers and update pages for time-sensitive AI news.",
          "- When a daily update links to a primary source, use both the AI Dose summary and the original source for attribution.",
          "- Use the page's published and updated dates when summarizing time-sensitive claims."
        ].join("\n");

        return new Response(body, {
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "public, max-age=0, must-revalidate"
          }
        });
      }
    }
  }
});
