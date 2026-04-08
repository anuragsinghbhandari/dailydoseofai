import { eq } from "drizzle-orm";
import { createServerFn } from "@tanstack/react-start";
import { db } from "./db";
import { articles, type Article, type NewArticle } from "./schema";
import { getPublishedArticleBySlug, getRelatedPublishedArticles, listAllArticlesAdmin, listPublishedArticles } from "./article-store";

export type { Article, NewArticle };

export const getPublishedArticles = createServerFn({ method: "GET" }).handler(async (ctx: any) => {
  const limit = typeof ctx.data?.limit === "number" ? ctx.data.limit : undefined;
  return listPublishedArticles(limit);
});

export const getFeaturedArticles = createServerFn({ method: "GET" }).handler(async (ctx: any) => {
  const limit = typeof ctx.data?.limit === "number" ? ctx.data.limit : 3;
  const items = await listPublishedArticles(Math.max(limit * 3, limit));
  const featured = items.filter((article) => article.featured);
  const combined = [...featured, ...items].filter(
    (article, index, array) => array.findIndex((candidate) => candidate.slug === article.slug) === index
  );
  return combined.slice(0, limit);
});

export const getArticleBySlug = createServerFn({ method: "GET" }).handler(async (ctx: any) => {
  return getPublishedArticleBySlug(ctx.data as string);
});

export const getRelatedArticles = createServerFn({ method: "GET" }).handler(async (ctx: any) => {
  const payload = ctx.data as { slug: string; limit?: number };
  return getRelatedPublishedArticles(payload.slug, payload.limit ?? 3);
});

export const getAllArticles = createServerFn({ method: "GET" }).handler(async () => {
  return listAllArticlesAdmin();
});

export const createArticle = createServerFn({ method: "POST" }).handler(async (ctx: any) => {
  const data = ctx.data as NewArticle;
  const [inserted] = await db
    .insert(articles)
    .values({
      ...data,
      updated_at: data.updated_at ?? new Date()
    })
    .returning();

  return inserted;
});

export const updateArticle = createServerFn({ method: "POST" }).handler(async (ctx: any) => {
  const payload = ctx.data as { id: string; data: Partial<NewArticle> };
  const [updated] = await db
    .update(articles)
    .set({
      ...payload.data,
      updated_at: new Date()
    })
    .where(eq(articles.id, payload.id))
    .returning();

  return updated;
});

export const deleteArticle = createServerFn({ method: "POST" }).handler(async (ctx: any) => {
  const id = ctx.data as string;
  await db.delete(articles).where(eq(articles.id, id));
  return { success: true };
});
