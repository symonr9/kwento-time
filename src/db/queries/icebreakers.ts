import { and, asc, eq } from 'drizzle-orm';

import { getDb } from '../client';
import { icebreakers, itemTags, type NewIcebreaker } from '../schema';

export async function createIcebreaker(data: NewIcebreaker) {
  const db = await getDb();
  const [row] = await db.insert(icebreakers).values(data).returning();
  return row;
}

export async function getAllIcebreakers() {
  const db = await getDb();
  return db.select().from(icebreakers).orderBy(asc(icebreakers.createdAt));
}

export async function deleteIcebreaker(id: number) {
  const db = await getDb();
  await db.transaction(async (tx) => {
    await tx
      .delete(itemTags)
      .where(and(eq(itemTags.itemType, 'icebreaker'), eq(itemTags.itemId, id)));
    await tx.delete(icebreakers).where(eq(icebreakers.id, id));
  });
}
