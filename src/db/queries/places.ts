import { and, asc, desc, eq } from 'drizzle-orm';

import { db } from '../client';
import { people, personPlaces, places, type NewPlace } from '../schema';

export async function createPlace(data: NewPlace) {
  const [row] = await db.insert(places).values(data).returning();
  return row;
}

export async function getAllPlaces() {
  return db.select().from(places).orderBy(asc(places.name));
}

export async function getPlaceById(id: number) {
  const [row] = await db.select().from(places).where(eq(places.id, id)).limit(1);
  return row;
}

export async function updatePlace(id: number, data: Partial<NewPlace>) {
  const [row] = await db.update(places).set(data).where(eq(places.id, id)).returning();
  return row;
}

export async function deletePlace(id: number) {
  await db.delete(places).where(eq(places.id, id));
}

/** Every place a person frequents, their home base (if set) listed first. */
export async function getPlacesForPerson(personId: number) {
  return db
    .select({
      id: places.id,
      name: places.name,
      address: places.address,
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
  const [row] = await db
    .select({ id: places.id, name: places.name, address: places.address })
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

/** Link a person to a place. `isPrimary` defaults to false; updates it if the link exists. */
export async function addPersonToPlace(personId: number, placeId: number, isPrimary = false) {
  await db
    .insert(personPlaces)
    .values({ personId, placeId, isPrimary })
    .onConflictDoUpdate({
      target: [personPlaces.personId, personPlaces.placeId],
      set: { isPrimary },
    });
}

export async function removePersonFromPlace(personId: number, placeId: number) {
  await db
    .delete(personPlaces)
    .where(and(eq(personPlaces.personId, personId), eq(personPlaces.placeId, placeId)));
}

/**
 * Set a person's home base. Clears `isPrimary` on their other places first,
 * since only one place should represent "home" at a time.
 */
export async function setPrimaryPlaceForPerson(personId: number, placeId: number) {
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