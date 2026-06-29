# src/features — Domain feature modules

Each subfolder is a **vertical slice** of one domain area: its data hooks, business logic, and feature-specific UI. This is where most app code lives.

## Layout (one folder per domain)

```
features/
  people/          # profiles, tags, relationship health score
  conversations/   # logging, transcript review/confirm, history
  topics/          # talking points + expiry lifecycle (active→expiring→extended→archived)
  places/          # Place Mode swipeable card deck, person↔place links
  reminders/       # follow-ups + reminder scheduling logic
  my-life/         # "How Are You?" — user's own life items (light/medium/personal)
  voice/           # record → transcribe → confirm flow (UI side of the AI pipeline)
  forecast/        # Social Forecast — deterministic retrieval+scoring, narration, hands-free playback UI
  carplay/         # Apple CarPlay view models for Forecast + read-only People/Places
```

> **`forecast/` holds the deterministic brains** (pure `scoring.ts` / `context.ts` / `narrator.ts`) and the form/playback UI. It calls `@/db/queries/forecast` (the only DB access) and the `@/services/llm` + `@/services/speech` services. The on-device LLM never touches the DB — see [docs/features/social-forecast.md](../../docs/features/social-forecast.md).

> **`carplay/` stays pure.** It shapes forecast/home/people-place data for a future native iOS CarPlay scene, but does not call native CarPlay APIs, mutate the DB, or introduce phone-only UI assumptions. See [docs/features/apple-carplay.md](../../docs/features/apple-carplay.md).

## Conventions for a feature folder

```
people/
  components/      # UI used only by this feature (e.g. person-card.tsx)
  hooks/           # data hooks wrapping @/db/queries (e.g. use-people.ts)
  <logic>.ts       # pure domain logic (e.g. health-score.ts)
  index.ts         # public surface — what the rest of the app may import
```

## Rules

- **Depend downward only:** features may import from `@/db`, `@/services`, `@/lib`, `@/components`, `@/constants`, `@/types`. Features should **not** import each other's internals — go through a feature's `index.ts`, or lift the shared piece up.
- **Pure domain logic stays pure.** Health-score math, expiry-state transitions, and gating checks must be deterministic, side-effect-free, and unit-testable. Scheduling/IO that runs them lives in `@/services` (background, notifications).
- Data hooks call `@/db/queries`; they never embed Drizzle/SQL.
- UI here is feature-specific. Promote to `@/components` only when a second feature needs it.
- **Freemium gating** (25 people / 1 place / 5 notes/mo on free) should be a single shared check (e.g. `@/features/billing` or `@/lib/limits`) reused everywhere, not re-implemented per screen.
