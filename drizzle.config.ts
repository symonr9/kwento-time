import type { Config } from 'drizzle-kit';

// Drizzle Kit config for the on-device SQLite database.
// `driver: 'expo'` makes `drizzle-kit generate` emit a `migrations.js` bundle
// that the app loads via `useMigrations` at startup (see src/db/migrate.ts).
export default {
  schema: './src/db/schema/index.ts',
  out: './src/db/migrations',
  dialect: 'sqlite',
  driver: 'expo',
} satisfies Config;
