import { and, desc, eq, lte } from 'drizzle-orm';

import { getDb } from '../client';
import { followUpExpiry, followUps, people, type FollowUpExpiryState, type NewFollowUp } from '../schema';

const DEFAULT_LIFESPAN_DAYS = 30;
const EXPIRING_WINDOW_DAYS = 7;

/** Create a follow-up question and start its 30-day expiry clock. */
export async function createFollowUp(data: NewFollowUp, lifespanDays = DEFAULT_LIFESPAN_DAYS) {
  const db = await getDb();
  const [followUp] = await db.insert(followUps).values(data).returning();
  const activatedAt = new Date();
  const expiresAt = new Date(activatedAt.getTime() + lifespanDays * 24 * 60 * 60 * 1000);
  await db.insert(followUpExpiry).values({ followUpId: followUp.id, activatedAt, expiresAt });
  return followUp;
}

export async function getFollowUpById(id: number) {
  const db = await getDb();
  const [row] = await db.select().from(followUps).where(eq(followUps.id, id)).limit(1);
  return row;
}

/** Follow-up + its expiry record, for a detail view. */
export async function getFollowUpWithExpiry(id: number) {
  const db = await getDb();
  const [row] = await db
    .select()
    .from(followUps)
    .leftJoin(followUpExpiry, eq(followUpExpiry.followUpId, followUps.id))
    .where(eq(followUps.id, id))
    .limit(1);
  return row;
}

/** Open questions to ask this person next time — newest first. */
export async function getOpenFollowUpsForPerson(personId: number) {
  const db = await getDb();
  return db
    .select()
    .from(followUps)
    .where(and(eq(followUps.personId, personId), eq(followUps.resolved, false)))
    .orderBy(desc(followUps.createdAt));
}

/** Every unresolved follow-up across everyone — for a "things to ask" dashboard. */
export async function getAllOpenFollowUps() {
  const db = await getDb();
  return db.select().from(followUps).where(eq(followUps.resolved, false)).orderBy(desc(followUps.createdAt));
}

/** Every unresolved follow-up with the person's name, for the home dashboard. */
export async function getAllOpenFollowUpsWithPeople(limit = 20) {
  const db = await getDb();
  return db
    .select({
      id: followUps.id,
      question: followUps.question,
      createdAt: followUps.createdAt,
      personId: followUps.personId,
      personName: people.name,
    })
    .from(followUps)
    .leftJoin(people, eq(followUps.personId, people.id))
    .where(eq(followUps.resolved, false))
    .orderBy(desc(followUps.createdAt))
    .limit(limit);
}

/** Follow-ups that were captured during a particular conversation. */
export async function getFollowUpsForConversation(conversationId: number) {
  const db = await getDb();
  return db.select().from(followUps).where(eq(followUps.conversationId, conversationId));
}

export async function updateFollowUp(id: number, data: Partial<NewFollowUp>) {
  const db = await getDb();
  const [row] = await db.update(followUps).set(data).where(eq(followUps.id, id)).returning();
  return row;
}

/** Mark a follow-up resolved (asked/answered) and archive its expiry record. */
export async function resolveFollowUp(id: number) {
  const db = await getDb();
  const now = new Date();
  const [row] = await db
    .update(followUps)
    .set({ resolved: true, resolvedAt: now })
    .where(eq(followUps.id, id))
    .returning();

  await db
    .update(followUpExpiry)
    .set({ state: 'archived', archivedAt: now })
    .where(eq(followUpExpiry.followUpId, id));

  return row;
}

export async function deleteFollowUp(id: number) {
  const db = await getDb();
  await db.delete(followUps).where(eq(followUps.id, id));
}

/**
 * Active follow-ups whose `expiresAt` is within the next 7 days — the nightly
 * job flips these to `'expiring'`.
 */
export async function getFollowUpsEnteringExpiringWindow(now = new Date()) {
  const db = await getDb();
  const horizon = new Date(now.getTime() + EXPIRING_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  return db
    .select({ followUp: followUps, expiry: followUpExpiry })
    .from(followUpExpiry)
    .innerJoin(followUps, eq(followUps.id, followUpExpiry.followUpId))
    .where(
      and(eq(followUpExpiry.state, 'active'), lte(followUpExpiry.expiresAt, horizon), eq(followUps.resolved, false)),
    );
}

/** Follow-ups in the "expiring" window — "still want to ask this?" prompts. */
export async function getExpiringFollowUps() {
  const db = await getDb();
  return db
    .select({ followUp: followUps, expiry: followUpExpiry })
    .from(followUpExpiry)
    .innerJoin(followUps, eq(followUps.id, followUpExpiry.followUpId))
    .where(and(eq(followUpExpiry.state, 'expiring'), eq(followUps.resolved, false)));
}

/** Advance a follow-up's lifecycle state (nightly job or explicit user action). */
export async function setFollowUpExpiryState(followUpId: number, state: FollowUpExpiryState) {
  const db = await getDb();
  const now = new Date();
  const extra =
    state === 'extended' ? { extendedAt: now } : state === 'archived' ? { archivedAt: now } : {};
  await db.update(followUpExpiry).set({ state, ...extra }).where(eq(followUpExpiry.followUpId, followUpId));
}

/** User says "yes, still want to ask" — push the expiry date out and mark extended. */
export async function extendFollowUpExpiry(followUpId: number, extraDays = DEFAULT_LIFESPAN_DAYS) {
  const db = await getDb();
  const now = new Date();
  const [current] = await db
    .select()
    .from(followUpExpiry)
    .where(eq(followUpExpiry.followUpId, followUpId))
    .limit(1);
  const base = current?.expiresAt && current.expiresAt > now ? current.expiresAt : now;
  const expiresAt = new Date(base.getTime() + extraDays * 24 * 60 * 60 * 1000);

  await db
    .update(followUpExpiry)
    .set({ state: 'extended', extendedAt: now, expiresAt })
    .where(eq(followUpExpiry.followUpId, followUpId));
}
