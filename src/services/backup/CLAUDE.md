# src/services/backup - Backup, import, and restore safety

Manual JSON backup is a trust boundary. Keep validation strict, previews clear, and imports reversible where practical.

## Rules

- `backup-validation.ts` is pure and Node-testable: no DB, React Native, Expo, filesystem, or UI imports.
- `json-backup.ts` is the app/service boundary. It may call `@/db/queries`, but validation/parsing/conflict summaries should stay in pure helpers.
- Always preview before import. Show counts, warnings, unsupported versions, conflicts, and destructive behavior before writing to SQLite.
- Keep backup schema changes paired with DB schema changes. New tables/columns need export, import, validation, and tests in the same change.
- Error messages should name the failing section/record when possible; never surface raw `JSON.parse` failures alone.
