import { desc, eq, isNull } from 'drizzle-orm';

import { getDb } from '../client';
import { conversations, people, type Conversation, type NewConversation } from '../schema';
import { bumpLastContacted } from './people';

/**
 * Log a conversation and bump the person's `lastContactedAt` in the same
 * call — every entry point (manual note, voice memo transcript) should go
 * through this rather than inserting directly.
 */
export async function logConversation(data: NewConversation): Promise<Conversation> {
  const db = await getDb();
  const [row] = await db.insert(conversations).values(data).returning();
  if (row.personId) {
    await bumpLastContacted(row.personId, row.occurredAt);
  }
  return row;
}

export async function getConversationById(id: number) {
  const db = await getDb();
  const [row] = await db.select().from(conversations).where(eq(conversations.id, id)).limit(1);
  return row;
}

/** Full conversation history for a person, most recent first. */
export async function getConversationsForPerson(personId: number) {
  const db = await getDb();
  return db
    .select()
    .from(conversations)
    .where(eq(conversations.personId, personId))
    .orderBy(desc(conversations.occurredAt));
}

/** Recent conversations across everyone, with the person's name — for an activity feed. */
export async function getRecentConversations(limit = 20) {
  const db = await getDb();
  return db
    .select({
      id: conversations.id,
      summary: conversations.summary,
      occurredAt: conversations.occurredAt,
      personId: conversations.personId,
      personName: people.name,
    })
    .from(conversations)
    .leftJoin(people, eq(conversations.personId, people.id))
    .orderBy(desc(conversations.occurredAt))
    .limit(limit);
}

/** Conversations still waiting on the GPT-4o structured-summary extraction pass. */
export async function getConversationsPendingSummary() {
  const db = await getDb();
  return db
    .select()
    .from(conversations)
    .where(isNull(conversations.summary))
    .orderBy(desc(conversations.occurredAt));
}

/** Write back the structured summary once extraction finishes (or re-runs). */
export async function setConversationSummary(id: number, summary: string) {
  const db = await getDb();
  const [row] = await db
    .update(conversations)
    .set({ summary })
    .where(eq(conversations.id, id))
    .returning();
  return row;
}

export async function updateConversation(id: number, data: Partial<NewConversation>) {
  const db = await getDb();
  const [row] = await db.update(conversations).set(data).where(eq(conversations.id, id)).returning();
  return row;
}

export async function deleteConversation(id: number) {
  const db = await getDb();
  await db.delete(conversations).where(eq(conversations.id, id));
}
