import { and, asc, desc, eq, lte, or } from 'drizzle-orm';

import { getDb } from '../client';
import { people, topicExpiry, topics, type NewTopic, type TopicExpiryState } from '../schema';

const DEFAULT_LIFESPAN_DAYS = 30;
const EXPIRING_WINDOW_DAYS = 7;

/** Create a topic and start its 30-day expiry clock. */
export async function createTopic(data: NewTopic, lifespanDays = DEFAULT_LIFESPAN_DAYS) {
  const db = await getDb();
  const [topic] = await db.insert(topics).values(data).returning();
  const activatedAt = new Date();
  const expiresAt = new Date(activatedAt.getTime() + lifespanDays * 24 * 60 * 60 * 1000);
  await db.insert(topicExpiry).values({ topicId: topic.id, activatedAt, expiresAt });
  return topic;
}

export async function getTopicById(id: number) {
  const db = await getDb();
  const [row] = await db.select().from(topics).where(eq(topics.id, id)).limit(1);
  return row;
}

export async function getTopicFormDetails(id: number) {
  const db = await getDb();
  const [row] = await db
    .select({
      id: topics.id,
      personId: topics.personId,
      conversationId: topics.conversationId,
      isForUser: topics.isForUser,
      content: topics.content,
      tone: topics.tone,
      resolved: topics.resolved,
      expiryState: topicExpiry.state,
      expiresAt: topicExpiry.expiresAt,
    })
    .from(topics)
    .leftJoin(topicExpiry, eq(topicExpiry.topicId, topics.id))
    .where(eq(topics.id, id))
    .limit(1);
  return row;
}

/** Topic + its expiry record together, for a detail view. */
export async function getTopicWithExpiry(id: number) {
  const db = await getDb();
  const [row] = await db
    .select()
    .from(topics)
    .leftJoin(topicExpiry, eq(topicExpiry.topicId, topics.id))
    .where(eq(topics.id, id))
    .limit(1);
  return row;
}

/**
 * Open talking points about a person — the "before you meet" briefing.
 * Most-recently-mentioned first.
 */
export async function getActiveTopicsForPerson(personId: number) {
  const db = await getDb();
  return db
    .select()
    .from(topics)
    .where(and(eq(topics.personId, personId), eq(topics.resolved, false), eq(topics.isForUser, false)))
    .orderBy(desc(topics.lastMentionedAt));
}

/** Open talking points about a person with lifecycle metadata for management UI. */
export async function getActiveTopicsWithExpiryForPerson(personId: number) {
  const db = await getDb();
  return db
    .select({ topic: topics, expiry: topicExpiry })
    .from(topics)
    .leftJoin(topicExpiry, eq(topicExpiry.topicId, topics.id))
    .where(and(eq(topics.personId, personId), eq(topics.resolved, false), eq(topics.isForUser, false)))
    .orderBy(desc(topics.lastMentionedAt));
}

/** Things going on in the user's own life, to bring up next time they talk to someone. */
export async function getOpenTopicsAboutUser() {
  const db = await getDb();
  return db
    .select()
    .from(topics)
    .where(and(eq(topics.isForUser, true), eq(topics.resolved, false)))
    .orderBy(desc(topics.lastMentionedAt));
}

/** Topics drafted from a particular conversation. */
export async function getTopicsForConversation(conversationId: number) {
  const db = await getDb();
  return db.select().from(topics).where(eq(topics.conversationId, conversationId));
}

export async function updateTopic(id: number, data: Partial<NewTopic>) {
  const db = await getDb();
  const [row] = await db.update(topics).set(data).where(eq(topics.id, id)).returning();
  return row;
}

/** A topic came up again — bump `lastMentionedAt` and reset its expiry clock. */
export async function touchTopic(id: number, lifespanDays = DEFAULT_LIFESPAN_DAYS) {
  const db = await getDb();
  const now = new Date();
  await db.update(topics).set({ lastMentionedAt: now }).where(eq(topics.id, id));

  const expiresAt = new Date(now.getTime() + lifespanDays * 24 * 60 * 60 * 1000);
  await db
    .update(topicExpiry)
    .set({ state: 'active', activatedAt: now, expiresAt, extendedAt: null, archivedAt: null })
    .where(eq(topicExpiry.topicId, id));
}

/** Mark a topic resolved and archive its expiry record. */
export async function resolveTopic(id: number) {
  const db = await getDb();
  const now = new Date();
  const [row] = await db
    .update(topics)
    .set({ resolved: true, resolvedAt: now })
    .where(eq(topics.id, id))
    .returning();

  await db
    .update(topicExpiry)
    .set({ state: 'archived', archivedAt: now })
    .where(eq(topicExpiry.topicId, id));

  return row;
}

export async function deleteTopic(id: number) {
  const db = await getDb();
  await db.delete(topics).where(eq(topics.id, id));
}

/**
 * Active topics whose `expiresAt` is within the next 7 days — the nightly job
 * flips these to `'expiring'`.
 */
export async function getTopicsEnteringExpiringWindow(now = new Date()) {
  const db = await getDb();
  const horizon = new Date(now.getTime() + EXPIRING_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  return db
    .select({ topic: topics, expiry: topicExpiry })
    .from(topicExpiry)
    .innerJoin(topics, eq(topics.id, topicExpiry.topicId))
    .where(and(eq(topicExpiry.state, 'active'), lte(topicExpiry.expiresAt, horizon), eq(topics.resolved, false)));
}

/** Dashboard feed for topics that are already expiring or entering the 7-day window. */
export async function getTopicsExpiringSoonWithPeople(now = new Date(), limit = 10) {
  const db = await getDb();
  const horizon = new Date(now.getTime() + EXPIRING_WINDOW_DAYS * 24 * 60 * 60 * 1000);

  return db
    .select({
      topicId: topics.id,
      content: topics.content,
      personId: topics.personId,
      personName: people.name,
      state: topicExpiry.state,
      expiresAt: topicExpiry.expiresAt,
    })
    .from(topicExpiry)
    .innerJoin(topics, eq(topics.id, topicExpiry.topicId))
    .leftJoin(people, eq(topics.personId, people.id))
    .where(
      and(
        eq(topics.resolved, false),
        or(eq(topicExpiry.state, 'expiring'), lte(topicExpiry.expiresAt, horizon)),
      ),
    )
    .orderBy(asc(topicExpiry.expiresAt), desc(topics.lastMentionedAt))
    .limit(limit);
}

/** Topics in the "expiring" window — surfaced as "still relevant?" prompts. */
export async function getExpiringTopics() {
  const db = await getDb();
  return db
    .select({ topic: topics, expiry: topicExpiry })
    .from(topicExpiry)
    .innerJoin(topics, eq(topics.id, topicExpiry.topicId))
    .where(and(eq(topicExpiry.state, 'expiring'), eq(topics.resolved, false)));
}

/** Advance a topic's lifecycle state (nightly job or explicit user action). */
export async function setTopicExpiryState(topicId: number, state: TopicExpiryState) {
  const db = await getDb();
  const now = new Date();
  const extra =
    state === 'extended' ? { extendedAt: now } : state === 'archived' ? { archivedAt: now } : {};
  await db.update(topicExpiry).set({ state, ...extra }).where(eq(topicExpiry.topicId, topicId));
}

/** User says "yes, still relevant" — push the expiry date out and mark extended. */
export async function extendTopicExpiry(topicId: number, extraDays = DEFAULT_LIFESPAN_DAYS) {
  const db = await getDb();
  const now = new Date();
  const [current] = await db.select().from(topicExpiry).where(eq(topicExpiry.topicId, topicId)).limit(1);
  const base = current?.expiresAt && current.expiresAt > now ? current.expiresAt : now;
  const expiresAt = new Date(base.getTime() + extraDays * 24 * 60 * 60 * 1000);

  await db
    .update(topicExpiry)
    .set({ state: 'extended', extendedAt: now, expiresAt })
    .where(eq(topicExpiry.topicId, topicId));
}
