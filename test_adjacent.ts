import { db } from "./src/server/db";
import { updates } from "./src/server/schema";
import { desc, eq, and, or, lt, gt } from "drizzle-orm";

async function main() {
  const all = await db.select({ slug: updates.slug, created_at: updates.created_at, id: updates.id, impact: updates.impact_score }).from(updates).orderBy(desc(updates.impact_score), desc(updates.created_at)).limit(5);
  console.log("Top 5 by impact:");
  for (const u of all) {
    console.log(`- ${u.slug} (Impact: ${u.impact}, created: ${u.created_at.toISOString()}, id: ${u.id})`);
  }

  const chron = await db.select({ slug: updates.slug, created_at: updates.created_at, id: updates.id }).from(updates).orderBy(desc(updates.created_at)).limit(5);
  console.log("\nTop 5 by chronological:");
  for (const u of chron) {
    console.log(`- ${u.slug} (created: ${u.created_at.toISOString()}, id: ${u.id})`);
  }

  // test adj
  async function getAdj(slug: string) {
    const currentRows = await db.select({ id: updates.id, created_at: updates.created_at }).from(updates).where(eq(updates.slug, slug)).limit(1);
    const currentUpdate = currentRows[0];
    const prevRows = await db.select({ slug: updates.slug }).from(updates)
      .where(and(eq(updates.published, true), or(lt(updates.created_at, currentUpdate.created_at), and(eq(updates.created_at, currentUpdate.created_at), lt(updates.id, currentUpdate.id)))))
      .orderBy(desc(updates.created_at), desc(updates.id)).limit(1);

    const nextRows = await db.select({ slug: updates.slug }).from(updates)
      .where(and(eq(updates.published, true), or(gt(updates.created_at, currentUpdate.created_at), and(eq(updates.created_at, currentUpdate.created_at), gt(updates.id, currentUpdate.id)))))
      .orderBy(updates.created_at, updates.id).limit(1);

    return { prev: prevRows[0]?.slug, current: slug, next: nextRows[0]?.slug };
  }

  console.log("\nAdjacency test:");
  let current = chron[0].slug;
  for (let i = 0; i < 4; i++) {
    const adj = await getAdj(current);
    console.log(`Iter ${i}: ${adj.prev} <- [${adj.current}] -> ${adj.next}`);
    if (adj.prev) current = adj.prev; // prev is older
    else break;
  }
}

main().catch(console.error).finally(() => process.exit(0));
