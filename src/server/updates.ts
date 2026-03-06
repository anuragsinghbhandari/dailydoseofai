import { eq } from "drizzle-orm";
import { db } from "./db";
import {
  updates,
  type Update,
  type NewUpdate
} from "./schema";
export type { Update, NewUpdate };
import { createServerFn } from "@tanstack/react-start";

export const createUpdate = createServerFn({ method: "POST" })
  .handler(async (ctx: any) => {
    const data = ctx.data as NewUpdate;
    const [inserted] = await db.insert(updates).values(data).returning();
    return inserted;
  });

export const updateUpdate = createServerFn({ method: "POST" })
  .handler(async (ctx: any) => {
    const payload = ctx.data as { id: string; data: Partial<NewUpdate> };
    const [updated] = await db
      .update(updates)
      .set(payload.data)
      .where(eq(updates.id, payload.id))
      .returning();
    return updated;
  });

export const deleteUpdate = createServerFn({ method: "POST" })
  .handler(async (ctx: any) => {
    const id = ctx.data as string;
    await db.delete(updates).where(eq(updates.id, id));
    return { success: true };
  });

