import { asc, eq, inArray, isNull, like, lt, or, sql } from 'drizzle-orm';

import { getDb } from '../client';
import { people, type NewPerson, type Person } from '../schema';

/** Add a new person to remember. */
export async function createPerson(data: NewPerson): Promise<Person> {
  const db = await getDb();
  const [row] = await db.insert(people).values(data).returning();
  return row;
}

/** Fetch a single person by id, or `undefined` if not found. */
export async function getPersonById(id: number) {
  const db = await getDb();
  const [row] = await db.select().from(people).where(eq(people.id, id)).limit(1);
  return row;
}

/** Everyone, alphabetical — the default "all people" list view. */
export async function getAllPeople() {
  const db = await getDb();
  return db.select().from(people).orderBy(asc(people.name));
}

/** Case-insensitive name/nickname search for the "find a person" UI. */
export async function searchPeopleByName(query: string) {
  const db = await getDb();
  return db
    .select()
    .from(people)
    .where(or(like(people.name, `%${query}%`), like(people.nickname, `%${query}%`)))
    .orderBy(asc(people.name));
}

/** Update profile fields (name, notes, avatar, birthday, etc.). */
export async function updatePerson(id: number, data: Partial<NewPerson>) {
  const db = await getDb();
  const [row] = await db.update(people).set(data).where(eq(people.id, id)).returning();
  return row;
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
    .returning();
  return row;
}

/** Overwrite a person's connection score (recomputed by the nightly job). */
export async function setConnectionScore(id: number, score: number) {
  const db = await getDb();
  const [row] = await db
    .update(people)
    .set({ connectionScore: score })
    .where(eq(people.id, id))
    .returning();
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
    .select()
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
    .select()
    .from(people)
    .where(inArray(sql`substr(${people.birthday}, -5)`, mmddWindow))
    .orderBy(asc(people.name));
}
