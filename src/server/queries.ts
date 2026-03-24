import { and, desc, eq, gte, lte, ne, sql } from "drizzle-orm";
import { db } from "./db";
import { updates, user_views, type Update } from "./schema";
import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { auth } from "./auth";
import { toCategorySlug } from "@/lib/content-taxonomy";

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfCurrentWeek() {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfWeek(date: Date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfCurrentMonth() {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfMonth(date: Date) {
  const d = new Date(date);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

function parseAnchorDate(value: unknown) {
  if (typeof value !== "string" || !value) return null;
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function clampLimit(value: unknown, fallback: number, max = 50) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(Math.floor(parsed), 1), max);
}

async function getSession() {
  try {
    const req = getRequest();
    if (!req) return null;
    return await auth.api.getSession({ headers: req.headers });
  } catch (error: any) {
    console.error("❌ getSession failed:", error);
    return null;
  }
}

async function getUpdatesWithSeenState(
  whereClause: any,
  options: {
    orderByClauses?: any[];
    limit?: number;
  } = {}
): Promise<Update[]> {
  const session = await getSession();

  let queryBuilder: any = db
    .select({
      update: updates,
      ...(session
        ? {
            isSeen: sql<boolean>`EXISTS (SELECT 1 FROM user_views WHERE user_views.update_id = updates.id AND user_views.user_id = ${session.user.id})`
          }
        : {})
    })
    .from(updates)
    .where(whereClause)
    .orderBy(...(options.orderByClauses ?? [desc(updates.created_at)]));

  if (typeof options.limit === "number") {
    queryBuilder = queryBuilder.limit(options.limit);
  }

  const rows = await queryBuilder;

  return rows.map((row: any) => ({
    ...row.update,
    isSeen: row.isSeen ?? false
  })) as Update[];
}

async function getTopUpdatesBetween(from: Date, to: Date): Promise<Update[]> {
  try {
    return await getUpdatesWithSeenState(
      and(
        eq(updates.published, true),
        gte(updates.created_at, from),
        lte(updates.created_at, to)
      ),
      {
        orderByClauses: [desc(updates.impact_score), desc(updates.created_at)],
        limit: 300
      }
    );
  } catch (error: any) {
    console.error("❌ getTopUpdatesBetween failed:", error);
    return [];
  }
}

async function getPublishedCategoriesInternal() {
  const rows = await db
    .select({
      category: updates.category,
      count: sql<number>`count(*)`
    })
    .from(updates)
    .where(eq(updates.published, true))
    .groupBy(updates.category)
    .orderBy(desc(sql<number>`count(*)`), updates.category);

  return rows.map((row) => ({
    name: row.category,
    slug: toCategorySlug(row.category),
    count: Number(row.count)
  }));
}

export const getTodayUpdates = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const start = startOfToday();
    const end = new Date();
    return await getTopUpdatesBetween(start, end);
  } catch (error: any) {
    console.error("❌ getTodayUpdates failed:", error);
    return [];
  }
});

export const getWeekUpdates = createServerFn({ method: "GET" }).handler(async (ctx: any) => {
  try {
    const anchor = parseAnchorDate(ctx.data);
    const start = anchor ? startOfWeek(anchor) : startOfCurrentWeek();
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    return await getTopUpdatesBetween(start, end);
  } catch (error: any) {
    console.error("❌ getWeekUpdates failed:", error);
    return [];
  }
});

export const getMonthUpdates = createServerFn({ method: "GET" }).handler(async (ctx: any) => {
  try {
    const anchor = parseAnchorDate(ctx.data);
    const start = anchor ? startOfMonth(anchor) : startOfCurrentMonth();
    const end = new Date(start.getFullYear(), start.getMonth() + 1, 0, 23, 59, 59, 999);
    return await getTopUpdatesBetween(start, end);
  } catch (error: any) {
    console.error("❌ getMonthUpdates failed:", error);
    return [];
  }
});

async function getUpdatesSummaryBetween(from: Date, to: Date) {
  const rows = await db
    .select({
      id: updates.id,
      created_at: updates.created_at,
    })
    .from(updates)
    .where(
      and(
        eq(updates.published, true),
        gte(updates.created_at, from),
        lte(updates.created_at, to)
      )
    )
    .orderBy(updates.created_at);
  return rows;
}

export const getWeekUpdatesSummary = createServerFn({ method: "GET" }).handler(async (ctx: any) => {
  try {
    const anchor = parseAnchorDate(ctx.data);
    const start = anchor ? startOfWeek(anchor) : startOfCurrentWeek();
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    return await getUpdatesSummaryBetween(start, end);
  } catch (error: any) {
    console.error("❌ getWeekUpdatesSummary failed:", error);
    return [];
  }
});

export const getMonthUpdatesSummary = createServerFn({ method: "GET" }).handler(async (ctx: any) => {
  try {
    const anchor = parseAnchorDate(ctx.data);
    const start = anchor ? startOfMonth(anchor) : startOfCurrentMonth();
    const end = new Date(start.getFullYear(), start.getMonth() + 1, 0, 23, 59, 59, 999);
    return await getUpdatesSummaryBetween(start, end);
  } catch (error: any) {
    console.error("❌ getMonthUpdatesSummary failed:", error);
    return [];
  }
});

export const getRecentPublishedUpdates = createServerFn({ method: "GET" }).handler(async (ctx: any) => {
  const limit = clampLimit(ctx.data?.limit, 10, 50);

  return getUpdatesWithSeenState(eq(updates.published, true), {
    orderByClauses: [desc(updates.created_at)],
    limit
  });
});

export const getRelatedUpdates = createServerFn({ method: "GET" }).handler(async (ctx: any) => {
  const { slug, category, limit: rawLimit } = ctx.data as {
    slug: string;
    category: string;
    limit?: number;
  };
  const limit = clampLimit(rawLimit, 4, 8);

  const primary = await getUpdatesWithSeenState(
    and(
      eq(updates.published, true),
      eq(updates.category, category),
      ne(updates.slug, slug)
    ),
    {
      orderByClauses: [desc(updates.impact_score), desc(updates.created_at)],
      limit
    }
  );

  if (primary.length >= limit) {
    return primary;
  }

  const fallback = await getUpdatesWithSeenState(
    and(eq(updates.published, true), ne(updates.slug, slug)),
    {
      orderByClauses: [desc(updates.created_at)],
      limit: Math.max(limit * 3, 10)
    }
  );

  const deduped = [...primary, ...fallback].filter(
    (update, index, arr) => arr.findIndex((candidate) => candidate.slug === update.slug) === index
  );

  return deduped.slice(0, limit);
});

export const getPublishedCategories = createServerFn({ method: "GET" }).handler(async () => {
  return getPublishedCategoriesInternal();
});

export const getCategoryPageData = createServerFn({ method: "GET" }).handler(async (ctx: any) => {
  const categorySlug = ctx.data as string;
  const categories = await getPublishedCategoriesInternal();
  const category = categories.find((entry) => entry.slug === categorySlug) ?? null;

  if (!category) {
    return { category: null, categories, updates: [] as Update[] };
  }

  const categoryUpdates = await getUpdatesWithSeenState(
    and(eq(updates.published, true), eq(updates.category, category.name)),
    {
      orderByClauses: [desc(updates.created_at)],
      limit: 200
    }
  );

  return {
    category,
    categories,
    updates: categoryUpdates
  };
});

export const getUpdateBySlug = createServerFn({ method: "GET" }).handler(async (ctx: any) => {
  const slug = ctx.data as string;
  const rows = await db
    .select()
    .from(updates)
    .where(and(eq(updates.slug, slug), eq(updates.published, true)))
    .limit(1);

  return (rows[0] as Update | undefined) ?? null;
});

export const getUpdatesByDate = createServerFn({ method: "GET" }).handler(async (ctx: any) => {
  const dateStr = ctx.data as string;
  const start = new Date(`${dateStr}T00:00:00`);
  const end = new Date(`${dateStr}T23:59:59.999`);

  if (Number.isNaN(start.getTime())) {
    return [];
  }

  return getTopUpdatesBetween(start, end);
});

export const getAdjacentUpdates = createServerFn({ method: "GET" }).handler(async (ctx: any) => {
  const { slug, list } = ctx.data as { slug: string; list?: string };

  const currentRows = await db
    .select({ id: updates.id, created_at: updates.created_at })
    .from(updates)
    .where(eq(updates.slug, slug))
    .limit(1);

  if (currentRows.length === 0) {
    return { prevSlug: null, nextSlug: null };
  }

  if (list === "must-read") {
    const allMustReads = await db
      .select({ slug: updates.slug })
      .from(updates)
      .where(eq(updates.is_must_read, true))
      .orderBy(desc(updates.created_at));

    const currentIndex = allMustReads.findIndex((update) => update.slug === slug);
    if (currentIndex !== -1) {
      return {
        prevSlug: allMustReads[currentIndex - 1]?.slug || null,
        nextSlug: allMustReads[currentIndex + 1]?.slug || null
      };
    }
    return { prevSlug: null, nextSlug: null };
  }

  if (list === "bookmarks") {
    const session = await getSession();
    if (!session) return { prevSlug: null, nextSlug: null };

    const { bookmarks: importedBookmarks } = await import("./schema");

    const allBookmarks = await db
      .select({ slug: updates.slug })
      .from(importedBookmarks)
      .innerJoin(updates, eq(importedBookmarks.update_id, updates.id))
      .where(eq(importedBookmarks.user_id, session.user.id))
      .orderBy(desc(importedBookmarks.created_at));

    const currentIndex = allBookmarks.findIndex((update) => update.slug === slug);
    if (currentIndex !== -1) {
      return {
        prevSlug: allBookmarks[currentIndex - 1]?.slug || null,
        nextSlug: allBookmarks[currentIndex + 1]?.slug || null
      };
    }
    return { prevSlug: null, nextSlug: null };
  }

  const currentUpdate = currentRows[0];
  const dayStart = new Date(currentUpdate.created_at);
  dayStart.setHours(0, 0, 0, 0);

  const dayEnd = new Date(dayStart);
  dayEnd.setHours(23, 59, 59, 999);

  const dayUpdates = await db
    .select({ slug: updates.slug })
    .from(updates)
    .where(
      and(
        eq(updates.published, true),
        gte(updates.created_at, dayStart),
        lte(updates.created_at, dayEnd)
      )
    )
    .orderBy(desc(updates.impact_score), desc(updates.created_at));

  const currentIndex = dayUpdates.findIndex((update) => update.slug === slug);

  let prevSlug = null;
  let nextSlug = null;

  if (currentIndex !== -1) {
    prevSlug = dayUpdates[currentIndex - 1]?.slug || null;
    nextSlug = dayUpdates[currentIndex + 1]?.slug || null;
  }

  return { prevSlug, nextSlug };
});

export const getAllUpdates = createServerFn({ method: "GET" }).handler(async () => {
  const rows = await db
    .select()
    .from(updates)
    .orderBy(desc(updates.created_at));
  return rows as Update[];
});

export const getMustReads = createServerFn({ method: "GET" }).handler(async () => {
  return getUpdatesWithSeenState(eq(updates.is_must_read, true));
});
