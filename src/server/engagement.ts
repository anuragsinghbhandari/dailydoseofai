import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { auth } from "./auth";
import { db } from "./db";
import { likes, bookmarks, user_views, comments, user, updates } from "./schema";
import { and, eq, desc, sql } from "drizzle-orm";

async function getSession() {
    const req = getRequest();
    if (!req) return null;
    return await auth.api.getSession({ headers: req.headers });
}

function startOfUtcDay(value: Date) {
    return Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate());
}

async function updateUserStreak(userId: string) {
    const now = new Date();
    const userRows = await db
        .select({
            streak: user.streak,
            lastActiveDate: user.last_active_date,
        })
        .from(user)
        .where(eq(user.id, userId))
        .limit(1);

    const currentUser = userRows[0];
    if (!currentUser) {
        return { streak: 0, lastActiveDate: null };
    }

    const today = startOfUtcDay(now);
    const lastActiveDate = currentUser.lastActiveDate ? new Date(currentUser.lastActiveDate) : null;
    const lastActiveDay = lastActiveDate ? startOfUtcDay(lastActiveDate) : null;

    if (lastActiveDay === today) {
        return {
            streak: currentUser.streak ?? 0,
            lastActiveDate: currentUser.lastActiveDate,
        };
    }

    const yesterday = today - 24 * 60 * 60 * 1000;
    const nextStreak = lastActiveDay === yesterday ? (currentUser.streak ?? 0) + 1 : 1;

    const updatedRows = await db
        .update(user)
        .set({
            streak: nextStreak,
            last_active_date: now,
            updatedAt: now,
        })
        .where(eq(user.id, userId))
        .returning({
            streak: user.streak,
            lastActiveDate: user.last_active_date,
        });

    return updatedRows[0] ?? { streak: nextStreak, lastActiveDate: now };
}

export const toggleLike = createServerFn({ method: "POST" })
    .handler(async (ctx: any) => {
        const { updateId } = ctx.data as { updateId: string };
        const session = await getSession();
        if (!session) throw new Error("Unauthorized");

        const existing = await db.select().from(likes).where(and(eq(likes.user_id, session.user.id), eq(likes.update_id, updateId)));
        if (existing.length > 0) {
            await db.delete(likes).where(eq(likes.id, existing[0].id));
            return { liked: false };
        } else {
            await db.insert(likes).values({ user_id: session.user.id, update_id: updateId });
            return { liked: true };
        }
    });

export const toggleBookmark = createServerFn({ method: "POST" })
    .handler(async (ctx: any) => {
        const { updateId } = ctx.data as { updateId: string };
        const session = await getSession();
        if (!session) throw new Error("Unauthorized");

        const existing = await db.select().from(bookmarks).where(and(eq(bookmarks.user_id, session.user.id), eq(bookmarks.update_id, updateId)));
        if (existing.length > 0) {
            await db.delete(bookmarks).where(eq(bookmarks.id, existing[0].id));
            return { bookmarked: false };
        } else {
            await db.insert(bookmarks).values({ user_id: session.user.id, update_id: updateId });
            return { bookmarked: true };
        }
    });

export const addComment = createServerFn({ method: "POST" })
    .handler(async (ctx: any) => {
        const { updateId, content } = ctx.data as { updateId: string; content: string };
        const session = await getSession();
        if (!session) throw new Error("Unauthorized");

        const res = await db.insert(comments).values({ user_id: session.user.id, update_id: updateId, content }).returning();
        return res[0];
    });

export const getComments = createServerFn({ method: "GET" })
    .handler(async (ctx: any) => {
        const { updateId } = ctx.data as { updateId: string };
        const results = await db
            .select({
                id: comments.id,
                content: comments.content,
                created_at: comments.created_at,
                user: { name: user.name, image: user.image }
            })
            .from(comments)
            .leftJoin(user, eq(comments.user_id, user.id))
            .where(eq(comments.update_id, updateId))
            .orderBy(desc(comments.created_at));

        return results;
    });

export const recordView = createServerFn({ method: "POST" })
    .handler(async (ctx: any) => {
        const { updateId } = ctx.data as { updateId: string };
        const session = await getSession();
        if (!session) return { viewed: false };

        const streakState = await updateUserStreak(session.user.id);

        const existing = await db.select().from(user_views).where(and(eq(user_views.user_id, session.user.id), eq(user_views.update_id, updateId)));
        if (existing.length === 0) {
            await db.insert(user_views).values({ user_id: session.user.id, update_id: updateId });
        }
        return {
            viewed: true,
            streak: streakState.streak,
            lastActiveDate: streakState.lastActiveDate,
        };
    });

export const getUserStreak = createServerFn({ method: "GET" })
    .handler(async () => {
        const session = await getSession();
        if (!session) return null;

        const rows = await db
            .select({
                streak: user.streak,
                lastActiveDate: user.last_active_date,
            })
            .from(user)
            .where(eq(user.id, session.user.id))
            .limit(1);

        return rows[0] ?? { streak: 0, lastActiveDate: null };
    });

export const getUserGlobalEngagement = createServerFn({ method: "GET" })
    .handler(async () => {
        const session = await getSession();
        if (!session) return { likes: [], bookmarks: [] };

        const [userLikes, userBookmarks] = await Promise.all([
            db.select({ updateId: likes.update_id }).from(likes).where(eq(likes.user_id, session.user.id)),
            db.select({ updateId: bookmarks.update_id }).from(bookmarks).where(eq(bookmarks.user_id, session.user.id)),
        ]);

        return {
            likes: userLikes.map(l => l.updateId).filter(Boolean) as string[],
            bookmarks: userBookmarks.map(b => b.updateId).filter(Boolean) as string[],
        };
    });

export const getArticleEngagement = createServerFn({ method: "GET" })
    .handler(async (ctx: any) => {
        const { updateId } = ctx.data as { updateId: string };
        const totalLikes = await db.select({ count: sql<number>`count(*)` }).from(likes).where(eq(likes.update_id, updateId));
        return {
            likesCount: Number(totalLikes[0]?.count ?? 0)
        };
    });

export const getBookmarkedUpdates = createServerFn({ method: "GET" })
    .handler(async () => {
        const session = await getSession();
        if (!session) return [];

        const results = await db
            .select({
                update: updates,
                isSeen: sql<boolean>`EXISTS (SELECT 1 FROM user_views WHERE user_views.update_id = updates.id AND user_views.user_id = ${session.user.id})`
            })
            .from(bookmarks)
            .innerJoin(updates, eq(bookmarks.update_id, updates.id))
            .where(eq(bookmarks.user_id, session.user.id))
            .orderBy(desc(bookmarks.created_at));

        return results.map((result: any) => ({
            ...result.update,
            isSeen: result.isSeen ?? false
        }));
    });
