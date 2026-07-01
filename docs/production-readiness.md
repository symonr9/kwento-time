# Production Readiness Notes

Last updated: 2026-06-30

## Added in this pass

- Backup JSON validation now rejects malformed JSON, unsupported versions, missing required tables, and invalid export timestamps before import.
- Settings has a preview-before-import flow with per-table row counts and conflict messaging.
- Unit tests cover backup preview validation, avatar URI guardrails, and contact-name normalization.

## Migration Checks

- Run `npm run db:check` after every schema change.
- Fresh install check: clear the app database, launch once, and confirm Drizzle applies all migrations through the latest snapshot without user interaction.
- Upgrade check: install a build with an older database, then install the new build over it and verify the app opens to Home, Settings, People, Places, Briefing, Icebreakers, and Keep Current.

## Large List Checks

- Seed at least 1,000 people, 250 places, 10,000 conversations, 2,000 tags/item-tag links, and 2,000 follow-ups/topics.
- Verify People, Places, Home filtered lists, Icebreakers, Briefing custom people selection, and Keep Current stay responsive while typing search and scrolling.
- Watch for N+1 query regressions in any screen that joins tags, places, avatars, or count summaries.

## Native Permission Audit

- iOS: microphone recording, photo library, camera, Contacts picker/import/open, Face ID, notification scheduling, date picker, and local SQLite migration on first launch.
- Android: microphone recording, photo picker/camera, Contacts import/open behavior, biometric lock, notification runtime permission, date picker, and local SQLite migration on first launch.
- Web: verify graceful unsupported states for local transcription, device Contacts, wake-lock, and native-only image/contact flows.

## Recovery Trust Checks

- Export a populated backup, preview it, import it into a fresh install, and confirm row counts for people, places, tags, conversations, topics, follow-ups, life updates, icebreakers, and item tag links.
- Import the same backup twice and confirm duplicate/conflicting rows are skipped with a clear message.
- Paste truncated JSON and verify the app reports a readable parse error instead of a raw stack trace.
