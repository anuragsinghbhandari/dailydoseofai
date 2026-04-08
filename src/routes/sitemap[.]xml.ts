import { createFileRoute } from "@tanstack/react-router";
import { desc, eq } from "drizzle-orm";
import { absoluteUrl } from "@/lib/seo";
import { db } from "@/server/db";
import { updates } from "@/server/schema";
import { listPublishedArticles } from "@/server/article-store";

type SitemapUrl = {
  loc: string;
  lastmod?: string;
  changefreq?: string;
  priority?: string;
};

function toIsoString(value: Date | string) {
  return new Date(value).toISOString();
}

function toDateKey(value: Date | string) {
  return toIsoString(value).slice(0, 10);
}

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const articles = await listPublishedArticles();
        const publishedUpdates = await db
          .select({
            slug: updates.slug,
            createdAt: updates.created_at
          })
          .from(updates)
          .where(eq(updates.published, true))
          .orderBy(desc(updates.created_at));

        const latestPublishedAt = publishedUpdates[0]?.createdAt
          ? toIsoString(publishedUpdates[0].createdAt)
          : undefined;

        const dateLastModifiedMap = new Map<string, string>();
        for (const update of publishedUpdates) {
          const dateKey = toDateKey(update.createdAt);
          if (!dateLastModifiedMap.has(dateKey)) {
            dateLastModifiedMap.set(dateKey, toIsoString(update.createdAt));
          }
        }

        const urls: SitemapUrl[] = [
          {
            loc: absoluteUrl("/"),
            lastmod: latestPublishedAt,
            changefreq: "hourly",
            priority: "1.0"
          },
          {
            loc: absoluteUrl("/today"),
            lastmod: latestPublishedAt,
            changefreq: "hourly",
            priority: "0.95"
          },
          {
            loc: absoluteUrl("/article"),
            lastmod: articles[0]?.updatedAt,
            changefreq: "weekly",
            priority: "0.88"
          },
          {
            loc: absoluteUrl("/week"),
            lastmod: latestPublishedAt,
            changefreq: "daily",
            priority: "0.85"
          },
          {
            loc: absoluteUrl("/month"),
            lastmod: latestPublishedAt,
            changefreq: "daily",
            priority: "0.75"
          },
          ...Array.from(dateLastModifiedMap.entries()).map(([date, lastmod]) => ({
            loc: absoluteUrl(`/date/${date}`),
            lastmod,
            changefreq: "daily",
            priority: "0.7"
          })),
          ...publishedUpdates.map((update) => ({
            loc: absoluteUrl(`/update/${update.slug}`),
            lastmod: toIsoString(update.createdAt),
            changefreq: "daily",
            priority: "0.9"
          })),
          ...articles.map((article) => ({
            loc: absoluteUrl(`/article/${article.slug}`),
            lastmod: article.updatedAt,
            changefreq: "weekly",
            priority: "0.92"
          }))
        ];

        const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (url) => `  <url>
    <loc>${escapeXml(url.loc)}</loc>
${url.lastmod ? `    <lastmod>${escapeXml(url.lastmod)}</lastmod>\n` : ""}${url.changefreq ? `    <changefreq>${escapeXml(url.changefreq)}</changefreq>\n` : ""}${url.priority ? `    <priority>${escapeXml(url.priority)}</priority>\n` : ""}  </url>`
  )
  .join("\n")}
</urlset>`;

        return new Response(body, {
          headers: {
            "Content-Type": "application/xml; charset=utf-8",
            "Cache-Control": "public, max-age=0, must-revalidate"
          }
        });
      }
    }
  }
});
