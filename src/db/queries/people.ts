import { and, asc, eq, inArray, isNull, like, lt, or, sql } from 'drizzle-orm';

import { getDb } from '../client';
import { followUps, people, personPlaces, places, topics, type NewPerson, type Person } from '../schema';
import { persistAvatarReference } from '../../services/avatar-storage';
import { safeAvatarUri } from './avatar-sql';

const personColumns = {
  id: people.id,
  avatarUri: safeAvatarUri(people.avatarUri),
  birthday: people.birthday,
  connectionScore: people.connectionScore,
  createdAt: people.createdAt,
  howWeMet: people.howWeMet,
  lastContactedAt: people.lastContactedAt,
  name: people.name,
  nativeContactId: people.nativeContactId,
  nickname: people.nickname,
  notes: people.notes,
  updatedAt: people.updatedAt,
};

async function normalizePersonWrite(data: NewPerson): Promise<NewPerson> {
  return {
    ...data,
    avatarUri: await persistAvatarReference(data.avatarUri),
  };
}

async function normalizePersonPatch(data: Partial<NewPerson>): Promise<Partial<NewPerson>> {
  if (!('avatarUri' in data)) {
    return data;
  }

  return {
    ...data,
    avatarUri: await persistAvatarReference(data.avatarUri),
  };
}

/** Add a new person to remember. */
export async function createPerson(data: NewPerson): Promise<Person> {
  const db = await getDb();
  const [row] = await db.insert(people).values(await normalizePersonWrite(data)).returning(personColumns);
  return row;
}

/** Fetch a single person by id, or `undefined` if not found. */
export async function getPersonById(id: number) {
  const db = await getDb();
  const [row] = await db.select(personColumns).from(people).where(eq(people.id, id)).limit(1);
  return row;
}

/** Fetch a person bound to a native device contact id, if any. */
export async function getPersonByNativeContactId(nativeContactId: string) {
  const db = await getDb();
  const [row] = await db
    .select(personColumns)
    .from(people)
    .where(eq(people.nativeContactId, nativeContactId))
    .limit(1);
  return row;
}

/** Everyone, alphabetical — the default "all people" list view. */
export async function getAllPeople() {
  const db = await getDb();
  return db.select(personColumns).from(people).orderBy(asc(people.name));
}

/** People list rows with summary counts for scan-friendly cards. */
export async function getPeopleListSummaries() {
  const db = await getDb();

  const rows = await db
    .select({
      id: people.id,
      avatarUri: safeAvatarUri(people.avatarUri),
      birthday: people.birthday,
      connectionScore: people.connectionScore,
      createdAt: people.createdAt,
      howWeMet: people.howWeMet,
      lastContactedAt: people.lastContactedAt,
      name: people.name,
      nativeContactId: people.nativeContactId,
      nickname: people.nickname,
      notes: people.notes,
      primaryPlaceName: places.name,
      updatedAt: people.updatedAt,
      followUpsCount: sql<number>`count(distinct case when ${followUps.resolved} = 0 then ${followUps.id} end)`,
      talkingPointsCount: sql<number>`count(distinct case when ${topics.resolved} = 0 and ${topics.isForUser} = 0 then ${topics.id} end)`,
    })
    .from(people)
    .leftJoin(followUps, eq(followUps.personId, people.id))
    .leftJoin(topics, eq(topics.personId, people.id))
    .leftJoin(personPlaces, and(eq(personPlaces.personId, people.id), eq(personPlaces.isPrimary, true)))
    .leftJoin(places, eq(places.id, personPlaces.placeId))
    .groupBy(people.id)
    .orderBy(asc(people.name));

  return rows.map((row) => ({
    ...row,
    followUpsCount: Number(row.followUpsCount ?? 0),
    talkingPointsCount: Number(row.talkingPointsCount ?? 0),
  }));
}

/** Case-insensitive name/nickname search for the "find a person" UI. */
export async function searchPeopleByName(query: string) {
  const db = await getDb();
  return db
    .select(personColumns)
    .from(people)
    .where(or(like(people.name, `%${query}%`), like(people.nickname, `%${query}%`)))
    .orderBy(asc(people.name));
}

/** Update profile fields (name, notes, avatar, birthday, etc.). */
export async function updatePerson(id: number, data: Partial<NewPerson>) {
  const db = await getDb();
  const [row] = await db
    .update(people)
    .set(await normalizePersonPatch(data))
    .where(eq(people.id, id))
    .returning(personColumns);
  return row;
}

/**
 * Create or refresh a person from a native contact. The stable contact id is
 * the dedupe key so contacts with the same display name stay distinct.
 */
export async function createOrUpdatePersonFromContact(data: NewPerson & { nativeContactId: string }) {
  const existing = await getPersonByNativeContactId(data.nativeContactId);

  if (!existing) {
    return createPerson(data);
  }

  return updatePerson(existing.id, {
    avatarUri: existing.avatarUri ?? data.avatarUri,
    name: existing.name || data.name,
    nativeContactId: data.nativeContactId,
    notes: existing.notes ?? data.notes,
  });
}

/** Remove a person — cascades to their tags, places, conversations, topics, etc. */
export async function deletePerson(id: number) {
  const db = await getDb();
  await db.delete(people).where(eq(people.id, id));
}

/** Stamp "I just talked to this person" — call whenever a conversation is logged. */
export async function bumpLastContacted(id: number, when: Date = new Date()) {
  const db = await getDb();
  const [row] = await db
    .update(people)
    .set({ lastContactedAt: when })
    .where(eq(people.id, id))
    .returning(personColumns);
  return row;
}

/** Overwrite a person's connection score (recomputed by the nightly job). */
export async function setConnectionScore(id: number, score: number) {
  const db = await getDb();
  const [row] = await db
    .update(people)
    .set({ connectionScore: score })
    .where(eq(people.id, id))
    .returning(personColumns);
  return row;
}

/**
 * People worth reaching out to: never contacted, or not contacted in
 * `staleDays` days. Lowest connection score / most-overdue first, for a
 * "people you've drifted from" surface.
 */
export async function getPeopleToReachOutTo(staleDays = 30) {
  const db = await getDb();
  const cutoff = new Date(Date.now() - staleDays * 24 * 60 * 60 * 1000);
  return db
    .select(personColumns)
    .from(people)
    .where(or(isNull(people.lastContactedAt), lt(people.lastContactedAt, cutoff)))
    .orderBy(asc(people.connectionScore), asc(people.lastContactedAt));
}

/**
 * People whose birthday falls within the next `daysAhead` days, regardless of
 * whether `birthday` includes a year (`YYYY-MM-DD` or `--MM-DD`). Compares on
 * the trailing `MM-DD` so it wraps correctly across year boundaries.
 */
export async function getUpcomingBirthdays(daysAhead = 14) {
  const db = await getDb();
  const today = new Date();
  const mmddWindow: string[] = [];
  for (let i = 0; i <= daysAhead; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    mmddWindow.push(d.toISOString().slice(5, 10)); // "MM-DD"
  }
  return db
    .select(personColumns)
    .from(people)
    .where(inArray(sql`substr(${people.birthday}, -5)`, mmddWindow))
    .orderBy(asc(people.name));
}
