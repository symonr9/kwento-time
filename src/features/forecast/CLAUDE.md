# src/features/forecast — Social Forecast

The spoken, hands-free **place briefing**: who you'll likely see, recent follow-ups, and prioritized talking points, narrated aloud. Full spec: [docs/features/social-forecast.md](../../../docs/features/social-forecast.md).

## The non-negotiable architecture

```
retrieve (DB)  →  score (pure)  →  assemble context (pure)  →  narrate  →  speak
@/db/queries      scoring.ts        context.ts                 LLM | template   @/services/speech
/forecast.ts                                                   (@/services/llm)
```

- **Deterministic retrieval is the ONLY DB access.** It lives in `@/db/queries/forecast`. Scoring/context/narration here are **pure** and take that data as input.
- **The LLM never touches the DB.** It receives a bounded `BriefingContext` and returns a narration script — synthesize/prioritize/narrate only. No queries, no writes, no invented names.
- **Always ship a non-LLM `narrator.ts`** that turns the same context into a script, so the feature works with no model and stays fully deterministic/offline.

## Files

```
forecast/
  scoring.ts        # pure: presence score P(person) + salience score S(item) from normalized signals
  context.ts        # pure: select within the length budget → BriefingContext
  narrator.ts       # pure: template fallback narration (no LLM)
  hooks/            # orchestration: retrieve → score → assemble → synthesize → play
  components/       # forecast form (filters/weights/length/model/voice) + playback UI
```

## Rules

- Keep `scoring.ts` / `context.ts` / `narrator.ts` **pure and unit-tested** — they're the deterministic core. Inject `now: Date` (don't read the clock inside).
- **Only the most recent unresolved follow-ups** enter the context (a hard cap, per spec).
- Signals to combine (normalized 0–1, weights from the form): place affinity, relationship health, recency of interaction, topic freshness, unresolved follow-ups, shared interests, recent events, calendar/timing. Default weights + length→budget tables are in the spec.
- The **length** the user picks sets the word/item/token budget — honor it in `context.ts` and pass it to synthesis.
- Synthesis order: try `@/services/llm`; on missing/disabled/failed model or name-validation failure, fall back to `narrator.ts`. Then hand the script to `@/services/speech`.
- Premium-gated — check the shared gating before generating.
