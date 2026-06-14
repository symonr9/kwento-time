/**
 * Schema barrel — the single import surface for the database schema.
 * `drizzle.config.ts` points here, and `src/db/client.ts` passes everything
 * exported here to `drizzle(..., { schema })`.
 */
export * from './people';
export * from './tags';
export * from './places';
export * from './conversations';
export * from './topics';
export * from './follow-ups';
export * from './reminders';
export * from './my-life';
