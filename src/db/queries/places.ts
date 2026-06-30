import { and, asc, count, desc, eq, or } from 'drizzle-orm';

import { getDb } from '../client';
import { conversations, followUps, people, personPlaces, places, type NewPlace } from '../schema';

export async function createPlace(data: NewPlace) {
  const db = await getDb();
  const [row] = await db.insert(places).values(data).returning();
  return row;
}

export async function getAllPlaces() {
  const db = await getDb();
  return db.select().from(places).orderBy(asc(places.name));
}

/** Place list rows with linked-person counts for scan-friendly cards. */
export async function getPlacesListSummaries() {
  const db = await getDb();

  const rows = await db
    .select({
      id: places.id,
      address: places.address,
      avatarUri: places.avatarUri,
      createdAt: places.createdAt,
      name: places.name,
      notes: places.notes,
      updatedAt: places.updatedAt,
      peopleCount: count(personPlaces.personId),
    })
    .from(places)
    .leftJoin(personPlaces, eq(personPlaces.placeId, places.id))
    .groupBy(places.id)
    .orderBy(asc(places.name));

  return rows.map((row) => ({
    ...row,
    peopleCount: Number(row.peopleCount ?? 0),
  }));
}

export async function getPlaceById(id: number) {
  const db = await getDb();
  const [row] = await db.select().from(places).where(eq(places.id, id)).limit(1);
  return row;
}

export async function updatePlace(id: number, data: Partial<NewPlace>) {
  const db = await getDb();
  const [row] = await db.update(places).set(data).where(eq(places.id, id)).returning();
  return row;
}

export async function deletePlace(id: number) {
  const db = await getDb();
  await db.delete(places).where(eq(places.id, id));
}

/** Every place a person frequents, their home base (if set) listed first. */
export async function getPlacesForPerson(personId: number) {
  const db = await getDb();
  return db
    .select({
      id: places.id,
      name: places.name,
      address: places.address,
      avatarUri: places.avatarUri,
      notes: places.notes,
      isPrimary: personPlaces.isPrimary,
    })
    .from(personPlaces)
    .innerJoin(places, eq(personPlaces.placeId, places.id))
    .where(eq(personPlaces.personId, personId))
    .orderBy(desc(personPlaces.isPrimary), asc(places.name));
}

/** A person's home base, if one is set. */
export async function getPrimaryPlaceForPerson(personId: number) {
  const db = await getDb();
  const [row] = await db
    .select({ id: places.id, name: places.name, address: places.address, avatarUri: places.avatarUri })
    .from(personPlaces)
    .innerJoin(places, eq(personPlaces.placeId, places.id))
    .where(and(eq(personPlaces.personId, personId), eq(personPlaces.isPrimary, true)))
    .limit(1);
  return row;
}

/**
 * "Place Mode" — everyone associated with this place, so the user can see who
 * they're likely to run into. People whose home base this is come first.
 */
export async function getPeopleForPlace(placeId: number) {
  const db = await getDb();
  return db
    .select({
      id: people.id,
      name: people.name,
      nickname: people.nickname,
      avatarUri: people.avatarUri,
      isPrimary: personPlaces.isPrimary,
    })
    .from(personPlaces)
    .innerJoin(people, eq(personPlaces.personId, people.id))
    .where(eq(personPlaces.placeId, placeId))
    .orderBy(desc(personPlaces.isPrimary), asc(people.name));
}

/** Recent conversations involving people linked to this place. */
export async function getRecentConversationsForPlace(placeId: number, limit = 10) {
  const db = await getDb();
  return db
    .select({
      id: conversations.id,
      summary: conversations.summary,
      occurredAt: conversations.occurredAt,
      personId: people.id,
      personName: people.name,
    })
    .from(conversations)
    .leftJoin(people, eq(conversations.personId, people.id))
    .leftJoin(personPlaces, and(eq(personPlaces.personId, people.id), eq(personPlaces.placeId, placeId)))
    .where(or(eq(conversations.placeId, placeId), eq(personPlaces.placeId, placeId)))
    .orderBy(desc(conversations.occurredAt))
    .limit(limit);
}

/** Open follow-ups grouped by the people linked to this place. */
export async function getOpenFollowUpsForPlace(placeId: number, limit = 20) {
  const db = await getDb();
  return db
    .select({
      id: followUps.id,
      question: followUps.question,
      createdAt: followUps.createdAt,
      personId: people.id,
      personName: people.name,
    })
    .from(personPlaces)
    .innerJoin(people, eq(personPlaces.personId, people.id))
    .innerJoin(followUps, eq(followUps.personId, people.id))
    .where(and(eq(personPlaces.placeId, placeId), eq(followUps.resolved, false)))
    .orderBy(desc(followUps.createdAt))
    .limit(limit);
}

/** Link a person to a place. `isPrimary` defaults to false; updates it if the link exists. */
export async function addPersonToPlace(personId: number, placeId: number, isPrimary = false) {
  const db = await getDb();
  await db
    .insert(personPlaces)
    .values({ personId, placeId, isPrimary })
    .onConflictDoUpdate({
      target: [personPlaces.personId, personPlaces.placeId],
      set: { isPrimary },
    });
}

export async function removePersonFromPlace(personId: number, placeId: number) {
  const db = await getDb();
  await db
    .delete(personPlaces)
    .where(and(eq(personPlaces.personId, personId), eq(personPlaces.placeId, placeId)));
}

/**
 * Set a person's home base. Clears `isPrimary` on their other places first,
 * since only one place should represent "home" at a time.
 */
export async function setPrimaryPlaceForPerson(personId: number, placeId: number) {
  const db = await getDb();
  await db
    .update(personPlaces)
    .set({ isPrimary: false })
    .where(eq(personPlaces.personId, personId));

  await db
    .insert(personPlaces)
    .values({ personId, placeId, isPrimary: true })
    .onConflictDoUpdate({
      target: [personPlaces.personId, personPlaces.placeId],
      set: { isPrimary: true },
    });
}
