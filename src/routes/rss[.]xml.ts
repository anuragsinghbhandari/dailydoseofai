import { createFileRoute } from "@tanstack/react-router";
import { absoluteUrl, SITE_NAME } from "@/lib/seo";
import { getRecentPublishedUpdates } from "@/server/queries";

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
        const updates = await getRecentPublishedUpdates({ data: { limit: 50 } });

        const body = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${escapeXml(SITE_NAME)}</title>
    <link>${escapeXml(absoluteUrl("/"))}</link>
    <description>${escapeXml("Latest AI Dose articles and daily AI news updates.")}</description>
    <language>en-us</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    ${updates
      .map((update) => `
    <item>
      <title>${escapeXml(update.title)}</title>
      <link>${escapeXml(absoluteUrl(`/update/${update.slug}`))}</link>
      <guid isPermaLink="true">${escapeXml(absoluteUrl(`/update/${update.slug}`))}</guid>
      <pubDate>${new Date(update.created_at).toUTCString()}</pubDate>
      <description>${escapeXml(update.summary)}</description>
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
