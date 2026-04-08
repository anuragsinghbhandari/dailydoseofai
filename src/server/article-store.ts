import { and, desc, eq, ne } from "drizzle-orm";
import { db } from "./db";
import { articles, type Article } from "./schema";
import { hydrateArticleRecord, seededArticles, type ArticleRecord } from "@/lib/articles";

async function getPublishedArticleRows(limit?: number) {
  if (typeof limit === "number") {
    return await db
      .select()
      .from(articles)
      .where(eq(articles.published, true))
      .orderBy(desc(articles.featured), desc(articles.published_at))
      .limit(limit);
  }

  return await db
    .select()
    .from(articles)
    .where(eq(articles.published, true))
    .orderBy(desc(articles.featured), desc(articles.published_at));
}

export async function listPublishedArticles(limit?: number): Promise<ArticleRecord[]> {
  try {
    const rows = await getPublishedArticleRows(limit);
    if (rows.length > 0) {
      return rows.map(hydrateArticleRecord);
    }
  } catch (error) {
    console.error("❌ listPublishedArticles failed:", error);
  }

  return seededArticles.slice(0, typeof limit === "number" ? limit : seededArticles.length);
}

export async function getPublishedArticleBySlug(slug: string): Promise<ArticleRecord | null> {
  try {
    const rows = await db
      .select()
      .from(articles)
      .where(and(eq(articles.slug, slug), eq(articles.published, true)))
      .limit(1);

    if (rows[0]) {
      return hydrateArticleRecord(rows[0]);
    }
  } catch (error) {
    console.error("❌ getPublishedArticleBySlug failed:", error);
  }

  return seededArticles.find((article) => article.slug === slug) ?? null;
}

export async function getRelatedPublishedArticles(slug: string, limit = 3): Promise<ArticleRecord[]> {
  try {
    const rows = await db
      .select()
      .from(articles)
      .where(and(eq(articles.published, true), ne(articles.slug, slug)))
      .orderBy(desc(articles.featured), desc(articles.published_at))
      .limit(limit);

    if (rows.length > 0) {
      return rows.map(hydrateArticleRecord);
    }
  } catch (error) {
    console.error("❌ getRelatedPublishedArticles failed:", error);
  }

  return seededArticles.filter((article) => article.slug !== slug).slice(0, limit);
}

export async function listAllArticlesAdmin(): Promise<Article[]> {
  try {
    const rows = await db
      .select()
      .from(articles)
      .orderBy(desc(articles.published_at), desc(articles.created_at));

    return rows as Article[];
  } catch (error) {
    console.error("❌ listAllArticlesAdmin failed:", error);
    return [];
  }
}
