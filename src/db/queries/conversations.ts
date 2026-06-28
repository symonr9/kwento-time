import { asc, desc, eq, isNull } from 'drizzle-orm';

import { getDb } from '../client';
import {
  conversations,
  followUpExpiry,
  followUps,
  people,
  personPlaces,
  places,
  topicExpiry,
  topics,
  type Conversation,
  type NewConversation,
} from '../schema';
import { bumpLastContacted } from './people';

const STRUCTURED_ITEM_LIFESPAN_DAYS = 30;

type StructuredConversationData = {
  conversation: NewConversation;
  followUps?: string[];
  placeId?: number | null;
  topics?: string[];
};

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

export async function logStructuredConversation({
  conversation,
  followUps: followUpQuestions = [],
  placeId,
  topics: topicContents = [],
}: StructuredConversationData): Promise<Conversation> {
  const db = await getDb();
  const now = new Date();
  const expiresAt = new Date(
    now.getTime() + STRUCTURED_ITEM_LIFESPAN_DAYS * 24 * 60 * 60 * 1000,
  );

  return db.transaction(async (tx) => {
    const [row] = await tx
      .insert(conversations)
      .values({
        ...conversation,
        placeId: conversation.placeId ?? placeId ?? undefined,
      })
      .returning();

    if (row.personId) {
      await tx.update(people).set({ lastContactedAt: row.occurredAt }).where(eq(people.id, row.personId));
    }

    if (topicContents.length > 0) {
      const createdTopics = await tx
        .insert(topics)
        .values(
          topicContents.map((content) => ({
            content,
            conversationId: row.id,
            personId: row.personId ?? undefined,
          })),
        )
        .returning();

      await tx.insert(topicExpiry).values(
        createdTopics.map((topic) => ({
          topicId: topic.id,
          activatedAt: now,
          expiresAt,
        })),
      );
    }

    if (followUpQuestions.length > 0) {
      const createdFollowUps = await tx
        .insert(followUps)
        .values(
          followUpQuestions.map((question) => ({
            question,
            conversationId: row.id,
            personId: row.personId ?? undefined,
          })),
        )
        .returning();

      await tx.insert(followUpExpiry).values(
        createdFollowUps.map((followUp) => ({
          followUpId: followUp.id,
          activatedAt: now,
          expiresAt,
        })),
      );
    }

    if (row.personId && placeId) {
      await tx
        .insert(personPlaces)
        .values({ personId: row.personId, placeId, isPrimary: false })
        .onConflictDoNothing();
    }

    return row;
  });
}

export async function getConversationById(id: number) {
  const db = await getDb();
  const [row] = await db.select().from(conversations).where(eq(conversations.id, id)).limit(1);
  return row;
}

export async function getConversationDetails(id: number) {
  const db = await getDb();
  const [conversation] = await db
    .select({
      id: conversations.id,
      audioUri: conversations.audioUri,
      summary: conversations.summary,
      rawTranscript: conversations.rawTranscript,
      source: conversations.source,
      occurredAt: conversations.occurredAt,
      createdAt: conversations.createdAt,
      updatedAt: conversations.updatedAt,
      personId: conversations.personId,
      personName: people.name,
      personNickname: people.nickname,
      placeId: conversations.placeId,
      placeName: places.name,
    })
    .from(conversations)
    .leftJoin(people, eq(conversations.personId, people.id))
    .leftJoin(places, eq(conversations.placeId, places.id))
    .where(eq(conversations.id, id))
    .limit(1);

  const [conversationTopics, conversationFollowUps] = await Promise.all([
    db
      .select({
        id: topics.id,
        content: topics.content,
        category: topics.category,
        importance: topics.importance,
        tone: topics.tone,
        resolved: topics.resolved,
        createdAt: topics.createdAt,
        expiryState: topicExpiry.state,
        expiresAt: topicExpiry.expiresAt,
      })
      .from(topics)
      .leftJoin(topicExpiry, eq(topicExpiry.topicId, topics.id))
      .where(eq(topics.conversationId, id))
      .orderBy(desc(topics.importance), asc(topics.createdAt)),
    db
      .select({
        id: followUps.id,
        question: followUps.question,
        resolved: followUps.resolved,
        resolvedAt: followUps.resolvedAt,
        createdAt: followUps.createdAt,
        expiryState: followUpExpiry.state,
        expiresAt: followUpExpiry.expiresAt,
      })
      .from(followUps)
      .leftJoin(followUpExpiry, eq(followUpExpiry.followUpId, followUps.id))
      .where(eq(followUps.conversationId, id))
      .orderBy(asc(followUps.createdAt)),
  ]);

  return {
    conversation: conversation ?? null,
    followUps: conversationFollowUps,
    topics: conversationTopics,
  };
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
      source: conversations.source,
      occurredAt: conversations.occurredAt,
      personId: conversations.personId,
      personName: people.name,
      placeId: conversations.placeId,
      placeName: places.name,
    })
    .from(conversations)
    .leftJoin(people, eq(conversations.personId, people.id))
    .leftJoin(places, eq(conversations.placeId, places.id))
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
