import { desc, eq } from 'drizzle-orm';

import { db } from '../client';
import { conversations, people, type Conversation, type NewConversation } from '../schema';

export function conversationsForPersonQuery(personId: number) {
  return db
    .select()
    .from(conversations)
    .where(eq(conversations.personId, personId))
    .orderBy(desc(conversations.occurredAt));
}

export function listConversationsForPerson(personId: number): Promise<Conversation[]> {
  return conversationsForPersonQuery(personId);
}

export async function getConversation(id: number): Promise<Conversation | null> {
  const rows = await db.select().from(conversations).where(eq(conversations.id, id)).limit(1);
  return rows[0] ?? null;
}

/**
 * Logs a conversation and, when tied to a person, bumps their `lastContactedAt`
 * so list ordering and (later) the health score reflect the contact. Both
 * writes happen in one transaction to keep the contact record consistent.
 */
export async function createConversation(input: NewConversation): Promise<Conversation> {
  return db.transaction(async (tx) => {
    const [row] = await tx.insert(conversations).values(input).returning();
    if (row.personId != null) {
      await tx
        .update(people)
        .set({ lastContactedAt: row.occurredAt })
        .where(eq(people.id, row.personId));
    }
    return row;
  });
}

export async function deleteConversation(id: number): Promise<void> {
  await db.delete(conversations).where(eq(conversations.id, id));
}
