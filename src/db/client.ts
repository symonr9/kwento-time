import { drizzle } from 'drizzle-orm/expo-sqlite';
import { openDatabaseAsync } from 'expo-sqlite';

import * as schema from './schema';

export const DATABASE_NAME = 'kwento.db';

/**
 * The single on-device SQLite connection. `enableChangeListener` powers
 * drizzle's `useLiveQuery`; WAL improves write/read concurrency and foreign
 * keys are enforced (SQLite leaves them OFF by default, so cascades wouldn't
 * fire without this).
 */
const expoDb = await openDatabaseAsync(DATABASE_NAME, { enableChangeListener: true });
await expoDb.execAsync('PRAGMA journal_mode = WAL;');
await expoDb.execAsync('PRAGMA foreign_keys = ON;');

/** Typed Drizzle client — the only handle the query layer should import. */
export const db = drizzle(expoDb, { schema });

export { expoDb, schema };
