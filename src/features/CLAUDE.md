# src/features - Domain feature modules

Each subfolder is a **vertical slice** of one domain area: data hooks, business logic, and feature-specific UI. Most app code lives here.

## Layout

```
features/
  people/          # profiles, tags, relationship health score
  conversations/   # logging, transcript review/confirm, history
  topics/          # talking points + expiry lifecycle
  places/          # place profiles, person-place links
  reminders/       # follow-ups + reminder scheduling logic
  my-life/         # user's own life updates
  voice/           # record -> transcribe -> confirm flow
  briefing/        # select place/custom people/life updates, then narration/playback
  icebreakers/     # reusable icebreaker questions with tone + tags
  review/          # Keep Current flows for stale/expiring items
  carplay/         # planned CarPlay view models for Briefing + read-only People/Places
```

> **`briefing/` holds the deterministic brains** (pure scoring/context/narrator code) and playback orchestration. It calls `@/db/queries/briefing` for retrieval and `@/services/llm` + `@/services/speech` for synthesis/playback. The on-device LLM never touches the DB.

> **`carplay/` stays pure.** It shapes briefing/home/people-place data for a future native iOS CarPlay scene, but does not call native CarPlay APIs, mutate the DB, or introduce phone-only UI assumptions.

## Feature Folder Convention

```
people/
  components/      # UI used only by this feature
  hooks/           # data hooks wrapping @/db/queries
  <logic>.ts       # pure domain logic
  index.ts         # public surface
```

## Rules

- **Depend downward only:** features may import from `@/db`, `@/services`, `@/lib`, `@/components`, `@/constants`, and `@/types`.
- Features should not import each other's internals. Go through a feature's `index.ts`, or lift shared pieces up.
- **Pure domain logic stays pure.** Health-score math, expiry transitions, scoring, filtering, and gating checks should be side-effect-free and unit-testable.
- Data hooks call `@/db/queries`; they never embed Drizzle/SQL.
- UI here is feature-specific. Promote to `@/components` only when a second feature needs it.
- Freemium gating should be one shared check reused everywhere.
