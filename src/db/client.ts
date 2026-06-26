import { drizzle } from 'drizzle-orm/expo-sqlite';
import { openDatabaseAsync } from 'expo-sqlite';
import { Platform } from 'react-native';

import * as schema from './schema';

export const DATABASE_NAME = 'kwento.db';
export const WEB_DATABASE_NAME = ':memory:';

async function createDrizzle() {
    /**
     * The single on-device SQLite connection. `enableChangeListener` powers
     * drizzle's `useLiveQuery`; WAL improves write/read concurrency and foreign
     * keys are enforced (SQLite leaves them OFF by default, so cascades wouldn't
     * fire without this).
     *
     * On web, Expo SQLite persists through browser OPFS. Some Windows/browser
     * dev contexts reject those writes with NoModificationAllowedError, so web
     * uses an in-memory DB while native keeps the durable app database file.
     */
    const databaseName = Platform.OS === 'web' ? WEB_DATABASE_NAME : DATABASE_NAME;
    const expoDb = await openDatabaseAsync(databaseName, { enableChangeListener: true });

    if (Platform.OS !== 'web') {
        await expoDb.execAsync('PRAGMA journal_mode = WAL;');
    }

    await expoDb.execAsync('PRAGMA foreign_keys = ON;');
    return drizzle(expoDb, { schema });
}

/** Typed Drizzle client — the only handle the query layer should import. */
const dbPromise = createDrizzle();

export type Db = Awaited<ReturnType<typeof createDrizzle>>;

/** Typed Drizzle client promise; query/migration code should await this via getDb(). */
export function getDb() {
    return dbPromise;
}

export { schema };
