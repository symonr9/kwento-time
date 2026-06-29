import { and, asc, eq, lte } from 'drizzle-orm';

import { getDb } from '../client';
import { reminders, type NewReminder, type Reminder } from '../schema';

export async function createReminder(data: NewReminder): Promise<Reminder> {
  const db = await getDb();
  const [row] = await db.insert(reminders).values(data).returning();
  return row;
}

export async function upsertReminderForRelated(data: NewReminder): Promise<Reminder> {
  if (!data.relatedId) {
    return createReminder(data);
  }

  const existing = await getReminderByRelated(data.type, data.relatedId);

  if (!existing) {
    return createReminder(data);
  }

  const db = await getDb();
  const [row] = await db
    .update(reminders)
    .set({
      personId: data.personId,
      scheduledAt: data.scheduledAt,
      sent: false,
      notificationId: existing.notificationId,
    })
    .where(eq(reminders.id, existing.id))
    .returning();
  return row;
}

export async function getReminderById(id: number) {
  const db = await getDb();
  const [row] = await db.select().from(reminders).where(eq(reminders.id, id)).limit(1);
  return row;
}

/** Unsent reminders due now (or earlier) — what the scheduler should fire. */
export async function getDueReminders(now = new Date()) {
  const db = await getDb();
  return db
    .select()
    .from(reminders)
    .where(and(eq(reminders.sent, false), lte(reminders.scheduledAt, now)))
    .orderBy(asc(reminders.scheduledAt));
}

/** All unsent reminders, soonest first — for a "what's coming up" view. */
export async function getUpcomingReminders() {
  const db = await getDb();
  return db.select().from(reminders).where(eq(reminders.sent, false)).orderBy(asc(reminders.scheduledAt));
}

export async function getRemindersForPerson(personId: number) {
  const db = await getDb();
  return db.select().from(reminders).where(eq(reminders.personId, personId)).orderBy(asc(reminders.scheduledAt));
}

/** Find the reminder tied to a given topic/follow-up so it can be rescheduled or cancelled. */
export async function getReminderByRelated(type: Reminder['type'], relatedId: number) {
  const db = await getDb();
  const [row] = await db
    .select()
    .from(reminders)
    .where(and(eq(reminders.type, type), eq(reminders.relatedId, relatedId)))
    .limit(1);
  return row;
}

/** Record the OS notification id once it's been scheduled with expo-notifications. */
export async function setReminderNotificationId(id: number, notificationId: string) {
  const db = await getDb();
  await db.update(reminders).set({ notificationId }).where(eq(reminders.id, id));
}

export async function markReminderSent(id: number) {
  const db = await getDb();
  await db.update(reminders).set({ sent: true }).where(eq(reminders.id, id));
}

/** Move a reminder to a new time and clear its sent/notification state so it fires again. */
export async function rescheduleReminder(id: number, scheduledAt: Date) {
  const db = await getDb();
  const [row] = await db
    .update(reminders)
    .set({ scheduledAt, sent: false, notificationId: null })
    .where(eq(reminders.id, id))
    .returning();
  return row;
}

export async function deleteReminder(id: number) {
  const db = await getDb();
  await db.delete(reminders).where(eq(reminders.id, id));
}

/** Cancel any pending reminders tied to a source row — e.g. a topic resolved before it expired. */
export async function deletePendingRemindersForRelated(type: Reminder['type'], relatedId: number) {
  const db = await getDb();
  await db
    .delete(reminders)
    .where(and(eq(reminders.type, type), eq(reminders.relatedId, relatedId), eq(reminders.sent, false)));
}
