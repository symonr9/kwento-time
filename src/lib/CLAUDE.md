# src/lib — Pure utilities

Small, **pure, side-effect-free** helpers shared across the app: date/time math, formatting, validation, ID generation, type guards, etc.

## Rules

- **No side effects, no IO.** No DB, no network, no React, no Expo modules. If it touches the device or persistence, it belongs in `@/services` or `@/db`.
- Pure functions in → out, fully unit-testable. Deterministic (note: `Date.now()`/`Math.random()` make functions impure — inject the clock/seed where it matters, e.g. for expiry math).
- One concern per file, `kebab-case` (e.g. `date.ts`, `format.ts`, `limits.ts`).
- Good home for cross-cutting helpers like freemium-limit checks and topic-expiry date arithmetic that multiple features share.
- If a helper is used by only one feature, keep it in that feature folder instead.
