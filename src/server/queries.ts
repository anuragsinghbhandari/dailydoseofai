import { and, desc, eq, gte, lte, lt, gt, or, sql } from "drizzle-orm";
import { db } from "./db";
import { updates, user_views, type Update } from "./schema";
import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { auth } from "./auth";

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfCurrentWeek() {
  const d = new Date();
  const day = d.getDay();
  // If Sunday (0), we go back 6 days to Monday. Else go back (day - 1) days.
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

async function getSession() {
  try {
    const req = getRequest();
    if (!req) return null;
    return await auth.api.getSession({ headers: req.headers });
  } catch (error: any) {
    console.error('❌ getSession failed:', error);
    return null;
  }
}

async function getTopUpdatesBetween(from: Date, to: Date): Promise<Update[]> {
  try {
    const session = await getSession();

    let queryBuilder: any = db.select({
      update: updates,
      ...(session ? { isSeen: sql<boolean>`EXISTS (SELECT 1 FROM user_views WHERE user_views.update_id = updates.id AND user_views.user_id = ${session.user.id})` } : {})
    }).from(updates);

    queryBuilder = queryBuilder.where(
      and(
        eq(updates.published, true),
        gte(updates.created_at, from),
        lte(updates.created_at, to)
      )
    ).orderBy(desc(updates.impact_score), desc(updates.created_at)).limit(300);

    const rows = await queryBuilder;

    return rows.map((r: any) => ({
      ...r.update,
      isSeen: r.isSeen ?? false
    })) as Update[];
  } catch (error: any) {
    console.error('❌ getTopUpdatesBetween failed:', error);
    return []; // Return empty instead of crashing SSR
  }
}

export const getTodayUpdates = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const start = startOfToday();
    const end = new Date();
    return await getTopUpdatesBetween(start, end);
  } catch (error: any) {
    console.error('❌ getTodayUpdates failed:', error);
    return [];
  }
});

export const getWeekUpdates = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const start = startOfCurrentWeek();
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    return await getTopUpdatesBetween(start, end);
  } catch (error: any) {
    console.error('❌ getWeekUpdates failed:', error);
    return [];
  }
});

export const getMonthUpdates = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const start = startOfCurrentMonth();
    const end = new Date(start.getFullYear(), start.getMonth() + 1, 0, 23, 59, 59, 999);
    return await getTopUpdatesBetween(start, end);
  } catch (error: any) {
    console.error('❌ getMonthUpdates failed:', error);
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

export const getWeekUpdatesSummary = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const start = startOfCurrentWeek();
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    return await getUpdatesSummaryBetween(start, end);
  } catch (error: any) {
    console.error('❌ getWeekUpdatesSummary failed:', error);
    return [];
  }
});

export const getMonthUpdatesSummary = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const start = startOfCurrentMonth();
    const end = new Date(start.getFullYear(), start.getMonth() + 1, 0, 23, 59, 59, 999);
    return await getUpdatesSummaryBetween(start, end);
  } catch (error: any) {
    console.error('❌ getMonthUpdatesSummary failed:', error);
    return [];
  }
});

export const getUpdateBySlug = createServerFn({ method: "GET" })
  .handler(async (ctx: any) => {
    const slug = ctx.data as string;
    const rows = await db
      .select()
      .from(updates)
      .where(
        and(eq(updates.slug, slug), eq(updates.published, true))
      )
      .limit(1);

    return (rows[0] as Update | undefined) ?? null;
  });

export const getUpdatesByDate = createServerFn({ method: "GET" })
  .handler(async (ctx: any) => {
    const dateStr = ctx.data as string;
    // Attempt to parse "YYYY-MM-DD"
    const start = new Date(`${dateStr}T00:00:00`);
    const end = new Date(`${dateStr}T23:59:59.999`);

    if (isNaN(start.getTime())) {
      return [];
    }

    return getTopUpdatesBetween(start, end);
  });

export const getAdjacentUpdates = createServerFn({ method: "GET" })
  .handler(async (ctx: any) => {
    const { slug, list } = ctx.data as { slug: string; list?: string };

    // Fetch the current update to get its exact timestamp to find the day it belongs to
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

      const currentIndex = allMustReads.findIndex(u => u.slug === slug);
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

      const currentIndex = allBookmarks.findIndex(u => u.slug === slug);
      if (currentIndex !== -1) {
        return {
          prevSlug: allBookmarks[currentIndex - 1]?.slug || null,
          nextSlug: allBookmarks[currentIndex + 1]?.slug || null
        };
      }
      return { prevSlug: null, nextSlug: null };
    }

    // Default daily homepage logic
    const currentUpdate = currentRows[0];
    const dayStart = new Date(currentUpdate.created_at);
    dayStart.setHours(0, 0, 0, 0);

    const dayEnd = new Date(dayStart);
    dayEnd.setHours(23, 59, 59, 999);

    // Fetch all updates for that day, sorted exactly like the homepage (impact_score DESC, created_at DESC)
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

    const currentIndex = dayUpdates.findIndex(u => u.slug === slug);

    // In our UI, "Previous Article" means going left (which historically meant "newer" or "higher in the list")
    // and "Next Article" means going right (which meant "older" or "lower in the list").
    // Let's preserve the array order:
    // element at index - 1 is "Higher in the feed" (Previous)
    // element at index + 1 is "Lower in the feed" (Next)

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
  const rows = await db
    .select()
    .from(updates)
    .where(eq(updates.is_must_read, true))
    .orderBy(desc(updates.created_at));
  return rows as Update[];
});


