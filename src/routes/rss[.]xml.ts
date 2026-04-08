import { createFileRoute } from "@tanstack/react-router";
import { absoluteUrl, SITE_NAME } from "@/lib/seo";
import { getRecentPublishedUpdates } from "@/server/queries";
import { listPublishedArticles } from "@/server/article-store";

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export const Route = createFileRoute("/rss.xml")({
  server: {
    handlers: {
      GET: async () => {
        const [updates, articles] = await Promise.all([
          getRecentPublishedUpdates({ data: { limit: 50 } }),
          listPublishedArticles(50)
        ]);
        const items = [
          ...articles.map((article) => ({
            title: article.title,
            link: absoluteUrl(`/article/${article.slug}`),
            publishedAt: article.publishedAt,
            description: article.description
          })),
          ...updates.map((update) => ({
            title: update.title,
            link: absoluteUrl(`/update/${update.slug}`),
            publishedAt: new Date(update.created_at).toISOString(),
            description: update.summary
          }))
        ]
          .sort(
            (left, right) =>
              new Date(right.publishedAt).getTime() - new Date(left.publishedAt).getTime()
          )
          .slice(0, 50);

        const body = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${escapeXml(SITE_NAME)}</title>
    <link>${escapeXml(absoluteUrl("/"))}</link>
    <description>${escapeXml("Latest AI Dose articles and daily AI news updates.")}</description>
    <language>en-us</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    ${items
      .map((item) => `
    <item>
      <title>${escapeXml(item.title)}</title>
      <link>${escapeXml(item.link)}</link>
      <guid isPermaLink="true">${escapeXml(item.link)}</guid>
      <pubDate>${new Date(item.publishedAt).toUTCString()}</pubDate>
      <description>${escapeXml(item.description)}</description>
    </item>`)
      .join("")}
  </channel>
</rss>`;

        return new Response(body, {
          headers: {
            "Content-Type": "application/rss+xml; charset=utf-8",
            "Cache-Control": "public, max-age=0, must-revalidate"
          }
        });
      }
    }
  }
});
