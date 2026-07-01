# src/features/briefing - Briefing

The spoken, hands-free **briefing**: a user can select one place, or create a custom set of people plus optional life updates, then hear recent follow-ups and prioritized talking points narrated aloud. Full spec: [docs/features/briefing.md](../../../docs/features/briefing.md).

## Architecture

```
retrieve (DB)  ->  score (pure)  ->  assemble context (pure)  ->  narrate  ->  speak
@/db/queries       scoring.ts        context.ts                 LLM | template @/services/speech
/briefing.ts                                                    (@/services/llm)
```

- **Deterministic retrieval is the ONLY DB access.** It lives in `@/db/queries/briefing` and supports both place-based and custom selections.
- **The LLM never touches the DB.** It receives a bounded `BriefingContext` and returns a narration script. No queries, no writes, no invented names.
- **Deterministic mode is default and free.** `narrator.ts` must fully work without any model.

## Files

```
briefing/
  scoring.ts        # pure: presence/salience scoring from normalized signals
  context.ts        # pure: select within length budget -> BriefingContext
  narrator.ts       # pure: deterministic narration and LLM fallback
  hooks/            # orchestration: retrieve -> score -> assemble -> synthesize -> play
  components/       # selection setup + playback UI
```

## Rules

- Keep `scoring.ts`, `context.ts`, and `narrator.ts` **pure and unit-tested**. Inject `now: Date`; don't read the clock inside.
- Only the most recent unresolved follow-ups enter context, with hard caps per the spec.
- Signals to combine (normalized 0-1): selected-place affinity when applicable, relationship health, recency, topic freshness, unresolved follow-ups, shared interests, recent events, and timing.
- The selected **length** sets the word/item/token budget; honor it in `context.ts` and synthesis.
- Enhanced mode tries `@/services/llm`; on missing/disabled/failed model or name-validation failure, fall back to `narrator.ts`, then hand the script to `@/services/speech`.
- Deterministic mode is free; Enhanced LLM mode is Premium/trial-gated. Never gate the deterministic path.
