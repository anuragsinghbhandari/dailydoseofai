import { eq } from "drizzle-orm";
import { db } from "./db";
import { user } from "./schema";

export function startOfUtcDay(value: Date) {
  return Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate());
}

export async function getNormalizedUserStreak(userId: string) {
  const rows = await db
    .select({
      streak: user.streak,
      lastActiveDate: user.last_active_date,
    })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);

  const currentUser = rows[0];
  if (!currentUser) {
    return { streak: 0, lastActiveDate: null };
  }

  const now = new Date();
  const today = startOfUtcDay(now);
  const yesterday = today - 24 * 60 * 60 * 1000;
  const lastActiveDate = currentUser.lastActiveDate ? new Date(currentUser.lastActiveDate) : null;
  const lastActiveDay = lastActiveDate ? startOfUtcDay(lastActiveDate) : null;

  if (lastActiveDay === null || lastActiveDay >= yesterday) {
    return {
      streak: currentUser.streak ?? 0,
      lastActiveDate: currentUser.lastActiveDate,
    };
  }

  const updatedRows = await db
    .update(user)
    .set({
      streak: 0,
      updatedAt: now,
    })
    .where(eq(user.id, userId))
    .returning({
      streak: user.streak,
      lastActiveDate: user.last_active_date,
    });

  return updatedRows[0] ?? { streak: 0, lastActiveDate: currentUser.lastActiveDate };
}
