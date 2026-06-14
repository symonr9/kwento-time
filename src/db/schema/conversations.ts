import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

import { people } from './people';
import { timestamps } from './timestamps';

/**
 * A logged conversation. `rawTranscript` is the source of truth (kept so notes
 * can be re-extracted as prompts improve); `summary` holds the GPT-4o structured
 * summary once extraction runs. `source` distinguishes manual text from voice.
 */
export const conversations = sqliteTable(
  'conversations',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    personId: integer('person_id').references(() => people.id, { onDelete: 'cascade' }),
    rawTranscript: text('raw_transcript').notNull(),
    summary: text('summary'),
    /** Local file path or base64 of the recorded audio (voice notes only). */
    audioUri: text('audio_uri'),
    source: text('source', { enum: ['manual', 'voice'] })
      .notNull()
      .default('manual'),
    occurredAt: integer('occurred_at', { mode: 'timestamp_ms' })
      .notNull()
      .$defaultFn(() => new Date()),
    ...timestamps,
  },
  (t) => [
    index('conversations_person_idx').on(t.personId),
    index('conversations_occurred_idx').on(t.occurredAt),
  ],
);

export type Conversation = typeof conversations.$inferSelect;
export type NewConversation = typeof conversations.$inferInsert;
