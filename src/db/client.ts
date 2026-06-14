import { drizzle } from 'drizzle-orm/expo-sqlite';
import { openDatabaseSync } from 'expo-sqlite';

import * as schema from './schema';

export const DATABASE_NAME = 'kwento.db';

/**
 * The single on-device SQLite connection. `enableChangeListener` powers
 * drizzle's `useLiveQuery`; WAL improves write/read concurrency and foreign
 * keys are enforced (SQLite leaves them OFF by default, so cascades wouldn't
 * fire without this).
 */
const expoDb = openDatabaseSync(DATABASE_NAME, { enableChangeListener: true });
expoDb.execSync('PRAGMA journal_mode = WAL;');
expoDb.execSync('PRAGMA foreign_keys = ON;');

/** Typed Drizzle client — the only handle the query layer should import. */
export const db = drizzle(expoDb, { schema });

export { expoDb, schema };
