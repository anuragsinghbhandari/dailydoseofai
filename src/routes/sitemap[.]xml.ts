import { createFileRoute } from "@tanstack/react-router";
import { desc, eq, sql } from "drizzle-orm";
import { absoluteUrl } from "@/lib/seo";
import { db } from "@/server/db";
import { updates } from "@/server/schema";

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const publishedUpdates = await db
          .select({
            slug: updates.slug,
            createdAt: updates.created_at
          })
          .from(updates)
          .where(eq(updates.published, true))
          .orderBy(desc(updates.created_at));

        const publishedDates = await db
          .select({
            date: sql<string>`to_char(${updates.created_at}::date, 'YYYY-MM-DD')`
          })
          .from(updates)
          .where(eq(updates.published, true))
          .groupBy(sql`${updates.created_at}::date`)
          .orderBy(desc(sql`${updates.created_at}::date`));

        const urls = [
          {
            loc: absoluteUrl("/"),
            changefreq: "hourly",
            priority: "1.0"
          },
          {
            loc: absoluteUrl("/today"),
            changefreq: "hourly",
            priority: "0.9"
          },
          {
            loc: absoluteUrl("/week"),
            changefreq: "daily",
            priority: "0.8"
          },
          {
            loc: absoluteUrl("/month"),
            changefreq: "daily",
            priority: "0.7"
          },
          ...publishedDates.map(({ date }) => ({
            loc: absoluteUrl(`/date/${date}`),
            changefreq: "daily",
            priority: "0.7"
          })),
          ...publishedUpdates.map((update) => ({
            loc: absoluteUrl(`/update/${update.slug}`),
            lastmod: new Date(update.createdAt).toISOString(),
            changefreq: "weekly",
            priority: "0.8"
          }))
        ];

        const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (url) => `  <url>
    <loc>${url.loc}</loc>
${url.lastmod ? `    <lastmod>${url.lastmod}</lastmod>\n` : ""}${url.changefreq ? `    <changefreq>${url.changefreq}</changefreq>\n` : ""}${url.priority ? `    <priority>${url.priority}</priority>\n` : ""}  </url>`
  )
  .join("\n")}
</urlset>`;

        return new Response(body, {
          headers: {
            "Content-Type": "application/xml; charset=utf-8",
            "Cache-Control": "public, max-age=3600"
          }
        });
      }
    }
  }
});
