import { and, desc, eq, inArray, lte } from 'drizzle-orm';

import { getDb } from '../client';
import {
    myLifeItemExpiry,
    myLifeItems,
    type MyLifeExpiryState,
    type MyLifeTone,
    type NewMyLifeItem,
} from '../schema';

const DEFAULT_LIFESPAN_DAYS = 30;
const EXPIRING_WINDOW_DAYS = 7;

type CreateMyLifeItemOptions = {
  activatedAt?: Date;
  expiresAt?: Date;
  lifespanDays?: number;
};

function normalizeCreateOptions(options: CreateMyLifeItemOptions | number = {}) {
  if (typeof options === 'number') {
    return { lifespanDays: options };
  }

  return options;
}

/** Add something going on in the user's life, and start its expiry clock. */
export async function createMyLifeItem(data: NewMyLifeItem, options: CreateMyLifeItemOptions | number = {}) {
  const db = await getDb();
  const [item] = await db.insert(myLifeItems).values(data).returning();
  const createOptions = normalizeCreateOptions(options);
  const activatedAt = createOptions.activatedAt ?? new Date();
  const lifespanDays = createOptions.lifespanDays ?? DEFAULT_LIFESPAN_DAYS;
  const expiresAt =
    createOptions.expiresAt ??
    new Date(activatedAt.getTime() + lifespanDays * 24 * 60 * 60 * 1000);
  await db.insert(myLifeItemExpiry).values({ myLifeItemId: item.id, activatedAt, expiresAt });
  return item;
}

export async function getMyLifeItemById(id: number) {
  const db = await getDb();
  const [row] = await db.select().from(myLifeItems).where(eq(myLifeItems.id, id)).limit(1);
  return row;
}

/** Item + its expiry record, for a detail view. */
export async function getMyLifeItemWithExpiry(id: number) {
  const db = await getDb();
  const [row] = await db
    .select()
    .from(myLifeItems)
    .leftJoin(myLifeItemExpiry, eq(myLifeItemExpiry.myLifeItemId, myLifeItems.id))
    .where(eq(myLifeItems.id, id))
    .limit(1);
  return row;
}

/** Everything currently "live" on the How Are You? page, newest first. */
export async function getActiveMyLifeItems() {
  const db = await getDb();
  return db.select().from(myLifeItems).where(eq(myLifeItems.resolved, false)).orderBy(desc(myLifeItems.createdAt));
}

export async function getLatestMyLifeItem() {
  const db = await getDb();
  const [row] = await db.select().from(myLifeItems).orderBy(desc(myLifeItems.createdAt)).limit(1);
  return row;
}

/**
 * Active items at-or-below a given openness level — e.g. pass `['light']`
 * before talking to a coworker, or `['light', 'medium', 'personal']` for a
 * close friend.
 */
export async function getMyLifeItemsByTone(tones: MyLifeTone[]) {
  const db = await getDb();
  return db
    .select()
    .from(myLifeItems)
    .where(and(eq(myLifeItems.resolved, false), inArray(myLifeItems.tone, tones)))
    .orderBy(desc(myLifeItems.createdAt));
}

export async function updateMyLifeItem(id: number, data: Partial<NewMyLifeItem>) {
  const db = await getDb();
  const [row] = await db.update(myLifeItems).set(data).where(eq(myLifeItems.id, id)).returning();
  return row;
}

/** Mark an item resolved (no longer current) and archive its expiry record. */
export async function resolveMyLifeItem(id: number) {
  const db = await getDb();
  const now = new Date();
  const [row] = await db
    .update(myLifeItems)
    .set({ resolved: true, resolvedAt: now })
    .where(eq(myLifeItems.id, id))
    .returning();

  await db
    .update(myLifeItemExpiry)
    .set({ state: 'archived', archivedAt: now })
    .where(eq(myLifeItemExpiry.myLifeItemId, id));

  return row;
}

export async function deleteMyLifeItem(id: number) {
  const db = await getDb();
  await db.delete(myLifeItems).where(eq(myLifeItems.id, id));
}

/**
 * Active items whose `expiresAt` is within the next 7 days — the nightly job
 * flips these to `'expiring'`.
 */
export async function getMyLifeItemsEnteringExpiringWindow(now = new Date()) {
  const db = await getDb();
  const horizon = new Date(now.getTime() + EXPIRING_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  return db
    .select({ item: myLifeItems, expiry: myLifeItemExpiry })
    .from(myLifeItemExpiry)
    .innerJoin(myLifeItems, eq(myLifeItems.id, myLifeItemExpiry.myLifeItemId))
    .where(
      and(
        eq(myLifeItemExpiry.state, 'active'),
        lte(myLifeItemExpiry.expiresAt, horizon),
        eq(myLifeItems.resolved, false),
      ),
    );
}

/** Items in the "expiring" window — "still going on?" prompts for the nightly review. */
export async function getExpiringMyLifeItems() {
  const db = await getDb();
  return db
    .select({ item: myLifeItems, expiry: myLifeItemExpiry })
    .from(myLifeItemExpiry)
    .innerJoin(myLifeItems, eq(myLifeItems.id, myLifeItemExpiry.myLifeItemId))
    .where(and(eq(myLifeItemExpiry.state, 'expiring'), eq(myLifeItems.resolved, false)));
}

/** Advance an item's lifecycle state (nightly job or explicit user action). */
export async function setMyLifeItemExpiryState(myLifeItemId: number, state: MyLifeExpiryState) {
  const db = await getDb();
  const now = new Date();
  const extra =
    state === 'extended' ? { extendedAt: now } : state === 'archived' ? { archivedAt: now } : {};
  await db
    .update(myLifeItemExpiry)
    .set({ state, ...extra })
    .where(eq(myLifeItemExpiry.myLifeItemId, myLifeItemId));
}

/** User says "yes, still going on" — push the expiry date out and mark extended. */
export async function extendMyLifeItemExpiry(myLifeItemId: number, extraDays = DEFAULT_LIFESPAN_DAYS) {
  const db = await getDb();
  const now = new Date();
  const [current] = await db
    .select()
    .from(myLifeItemExpiry)
    .where(eq(myLifeItemExpiry.myLifeItemId, myLifeItemId))
    .limit(1);
  const base = current?.expiresAt && current.expiresAt > now ? current.expiresAt : now;
  const expiresAt = new Date(base.getTime() + extraDays * 24 * 60 * 60 * 1000);

  await db
    .update(myLifeItemExpiry)
    .set({ state: 'extended', extendedAt: now, expiresAt })
    .where(eq(myLifeItemExpiry.myLifeItemId, myLifeItemId));
}
