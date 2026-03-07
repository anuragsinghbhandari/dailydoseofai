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
  const req = getRequest();
  if (!req) return null;
  return await auth.api.getSession({ headers: req.headers });
}

async function getTopUpdatesBetween(from: Date, to: Date): Promise<Update[]> {
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
}

export const getTodayUpdates = createServerFn({ method: "GET" }).handler(async () => {
  const start = startOfToday();
  const end = new Date();
  return getTopUpdatesBetween(start, end);
});

export const getWeekUpdates = createServerFn({ method: "GET" }).handler(async () => {
  const start = startOfCurrentWeek();
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return getTopUpdatesBetween(start, end);
});

export const getMonthUpdates = createServerFn({ method: "GET" }).handler(async () => {
  const start = startOfCurrentMonth();
  const end = new Date(start.getFullYear(), start.getMonth() + 1, 0, 23, 59, 59, 999);
  return getTopUpdatesBetween(start, end);
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
  const start = startOfCurrentWeek();
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return getUpdatesSummaryBetween(start, end);
});

export const getMonthUpdatesSummary = createServerFn({ method: "GET" }).handler(async () => {
  const start = startOfCurrentMonth();
  const end = new Date(start.getFullYear(), start.getMonth() + 1, 0, 23, 59, 59, 999);
  return getUpdatesSummaryBetween(start, end);
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
    const { slug } = ctx.data as { slug: string, category: string, created_at: string };

    // Fetch the current update to get its exact timestamp and ID for reliable tie-breaking
    const currentRows = await db
      .select({ id: updates.id, created_at: updates.created_at })
      .from(updates)
      .where(eq(updates.slug, slug))
      .limit(1);

    if (currentRows.length === 0) {
      return { prevSlug: null, nextSlug: null };
    }
    const currentUpdate = currentRows[0];

    // Older article (previous)
    // We want the newest article that is older than the current one.
    // If timestamps are exactly equal, we break the tie using ID.
    const prevRows = await db
      .select({ slug: updates.slug })
      .from(updates)
      .where(
        and(
          eq(updates.published, true),
          or(
            lt(updates.created_at, currentUpdate.created_at),
            and(
              eq(updates.created_at, currentUpdate.created_at),
              lt(updates.id, currentUpdate.id)
            )
          )
        )
      )
      .orderBy(desc(updates.created_at), desc(updates.id))
      .limit(1);

    // Newer article (next)
    // We want the oldest article that is newer than the current one.
    // ASC ordering.
    const nextRows = await db
      .select({ slug: updates.slug })
      .from(updates)
      .where(
        and(
          eq(updates.published, true),
          or(
            gt(updates.created_at, currentUpdate.created_at),
            and(
              eq(updates.created_at, currentUpdate.created_at),
              gt(updates.id, currentUpdate.id)
            )
          )
        )
      )
      .orderBy(updates.created_at, updates.id) // ASC to get the immediate next one
      .limit(1);

    return {
      prevSlug: prevRows[0]?.slug ?? null,
      nextSlug: nextRows[0]?.slug ?? null,
    };
  });

export const getAllUpdates = createServerFn({ method: "GET" }).handler(async () => {
  const rows = await db
    .select()
    .from(updates)
    .orderBy(desc(updates.created_at));
  return rows as Update[];
});


