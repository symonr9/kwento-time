# src/features/briefing — Briefing

The spoken, hands-free **place briefing**: who you'll likely see, recent follow-ups, and prioritized talking points, narrated aloud. Full spec: [docs/features/briefing.md](../../../docs/features/briefing.md).

## The non-negotiable architecture

```
retrieve (DB)  →  score (pure)  →  assemble context (pure)  →  narrate  →  speak
@/db/queries      scoring.ts        context.ts                 LLM | template   @/services/speech
/briefing.ts                                                   (@/services/llm)
```

- **Deterministic retrieval is the ONLY DB access.** It lives in `@/db/queries/briefing`. Scoring/context/narration here are **pure** and take that data as input.
- **The LLM never touches the DB.** It receives a bounded `BriefingContext` and returns a narration script — synthesize/prioritize/narrate only. No queries, no writes, no invented names.
- **Deterministic mode is the default and free.** `narrator.ts` turns the same context into a script with no model and no network — it's a first-class, user-chosen mode *and* the fallback when an LLM is unavailable. The feature must fully work without any model.

## Files

```
briefing/
  scoring.ts        # pure: presence score P(person) + salience score S(item) from normalized signals
  context.ts        # pure: select within the length budget → BriefingContext
  narrator.ts       # pure: deterministic narration — the default (free) mode AND the LLM fallback (no LLM)
  hooks/            # orchestration: retrieve → score → assemble → synthesize → play
  components/       # briefing form (filters/weights/length/model/voice) + playback UI
```

## Rules

- Keep `scoring.ts` / `context.ts` / `narrator.ts` **pure and unit-tested** — they're the deterministic core. Inject `now: Date` (don't read the clock inside).
- **Only the most recent unresolved follow-ups** enter the context (a hard cap, per spec).
- Signals to combine (normalized 0–1, weights from the form): place affinity, relationship health, recency of interaction, topic freshness, unresolved follow-ups, shared interests, recent events, calendar/timing. Default weights + length→budget tables are in the spec.
- The **length** the user picks sets the word/item/token budget — honor it in `context.ts` and pass it to synthesis.
- Synthesis order (Enhanced mode): try `@/services/llm`; on missing/disabled/failed model or name-validation failure, fall back to `narrator.ts`. Then hand the script to `@/services/speech`.
- **Tiering:** deterministic mode (8a) is **free**; Enhanced LLM mode (8b) is **Premium with a free trial**. Check the shared gating before invoking `@/services/llm` — never gate the deterministic path.
