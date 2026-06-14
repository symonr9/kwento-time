import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

import { people } from './people';
import { timestamps } from './timestamps';

/**
 * A scheduled local notification. The nightly job creates these; the scheduler
 * maps each to an OS notification and sets `notificationId` / `sent`.
 * `relatedId` points at the source row (topic / follow-up) for `type`.
 */
export const reminders = sqliteTable(
  'reminders',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    personId: integer('person_id').references(() => people.id, { onDelete: 'cascade' }),
    type: text('type', { enum: ['topic_expiry', 'follow_up', 'nudge'] }).notNull(),
    relatedId: integer('related_id'),
    scheduledAt: integer('scheduled_at', { mode: 'timestamp_ms' }).notNull(),
    sent: integer('sent', { mode: 'boolean' }).notNull().default(false),
    /** Identifier returned by expo-notifications, used to cancel/reschedule. */
    notificationId: text('notification_id'),
    ...timestamps,
  },
  (t) => [
    index('reminders_scheduled_idx').on(t.scheduledAt),
    index('reminders_sent_idx').on(t.sent),
  ],
);

export type Reminder = typeof reminders.$inferSelect;
export type NewReminder = typeof reminders.$inferInsert;
