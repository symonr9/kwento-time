# src/hooks — Shared React hooks

Cross-cutting React hooks used by multiple features (e.g. `use-color-scheme`, `use-theme`).

## Rules

- Only **genuinely shared** hooks live here. Feature-specific data hooks (e.g. `use-people`, `use-conversation`) belong in `@/features/<feature>/`.
- Prefix with `use-`, `kebab-case` file, returns are typed.
- Platform variants via `name.ts` / `name.web.ts` (see `use-color-scheme`).
- Data hooks should wrap the query layer in `@/db/queries`, not embed SQL or Drizzle calls inline. Keep the DB boundary clean.
- React Compiler is enabled — don't reflexively wrap returns in `useMemo`/`useCallback`; add memoization only when profiling justifies it.
