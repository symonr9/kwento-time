# src/features/briefing - Briefing

The spoken, hands-free **briefing**: a user can select one place, or create a custom set of people plus optional life updates, then hear recent follow-ups and prioritized talking points narrated aloud. Full spec: [docs/features/briefing.md](../../../docs/features/briefing.md).

## Architecture

```
retrieve (DB)  ->  score (pure)  ->  assemble context (pure)  ->  narrate  ->  speak
@/db/queries       scoring.ts        context.ts                 LLM first @/services/speech
/briefing.ts                                                    template fallback
```

- **Deterministic retrieval is the ONLY DB access.** It lives in `@/db/queries/briefing` and supports both place-based and custom selections.
- **The LLM never touches the DB.** It receives a bounded `BriefingContext` and returns a narration script. No queries, no writes, no invented names.
- **LLM narration is the default user experience.** `narrator.ts` must still fully work without any model as a hidden fallback and test oracle.

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
- Narration tries `@/services/llm`; on web, missing native runtime, missing bundled model, timeout, validation failure, or native error, fall back to `narrator.ts`, then hand the script to `@/services/speech`.
- Never expose a mode picker for deterministic vs LLM in the main UX. The fallback is operational, not a user-facing engine choice.
