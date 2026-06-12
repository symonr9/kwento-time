# src/constants — App-wide constants

Static, app-wide values. The canonical file is `theme.ts`: `Colors` (light/dark), `Fonts`, `Spacing`, layout constants (`MaxContentWidth`, `BottomTabInset`).

## Rules

- **Single source of truth for design tokens.** All colors, spacing, and fonts come from here — components must never hardcode values.
- Use the `Spacing` scale (`half`/`one`/`two`/`three`/`four`/`five`/`six`) for margins/padding instead of raw numbers.
- Keep values `as const` so types stay narrow (see `ThemeColor`).
- Good home for other app-wide constants as they appear: freemium limits (free = 25 people / 1 place / 5 notes/mo), topic-expiry windows (30-day active / 7-day expiring), notification categories. Group them in well-named files (e.g. `limits.ts`, `expiry.ts`) rather than dumping into `theme.ts`.
- **No logic, no side effects** — values only.
