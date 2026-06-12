# src/components — Shared UI

**Reusable, presentational components shared across two or more features.** If a component is used by only one feature, it belongs in `@/features/<feature>/components`, not here.

## Rules

- **Presentational first.** Components take props and render. They should not query the DB, call services, or own domain logic — pass data in, raise events out.
- Theme-aware: consume colors/spacing/fonts from `@/constants/theme` (or the `useTheme` hook), never hardcode hex values.
- Support light/dark mode. `themed-text.tsx` / `themed-view.tsx` are the baseline themed primitives — build on them.
- `ui/` holds low-level primitives (e.g. `collapsible.tsx`) — the smallest building blocks with no domain meaning.
- Platform variants use Expo's resolver: `name.tsx` / `name.web.tsx` / `name.ios.tsx`. Keep shared types in the base file.
- `kebab-case` filenames; one component per file; named or default export consistently.

## Promotion rule

Start feature-specific UI inside the feature folder. Move it here **only when a second feature needs it.** Avoid premature shared abstractions.
