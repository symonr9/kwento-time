# src/services/llm — On-device LLM

Offline GGUF inference for **Social Forecast narration**. Wraps the runtime and manages models. **This service must never access the database** — callers pass it a bounded context and it returns text.

Spec & model details: [docs/features/social-forecast.md](../../../docs/features/social-forecast.md).

## Responsibilities

```
llm/
  runtime.ts        # load/unload a GGUF model, run generation (llama.rn wrapper)
  model-manager.ts  # registry, download (expo-file-system), checksum verify, delete, "active model"
  prompt.ts         # fixed system template + context serialization for narration
  index.ts          # small typed API: ensureModel(), generate(context, opts) → string
```

## Rules

- **Runtime: `llama.rn`** (GGUF) is the recommended choice (widest tiny-model range + easy download/swap, matching "user chooses the model"). Alternatives to spike: `react-native-executorch`, Cactus. **It's a native module** → requires a dev-client rebuild and works only in a development/production build (no Expo Go, no web). iOS builds run via EAS (Windows constraint).
- **Narration only.** Low temperature, hard token cap from the caller's length budget, prompt that says *use only the provided facts*. **Validate output**: if a person name appears that wasn't in the context, reject so the caller can fall back to the template narrator.
- **Default model is tiny (~50–100 MB class**, e.g. SmolLM2-135M-Instruct GGUF). Larger models are **opt-in downloads**; surface size/quality/battery/thermal tradeoffs and let the user pick.
- **Lazy-load** the model (don't block app start); load on first briefing, unload under memory pressure.
- Models are large binaries — download to app storage via `expo-file-system`, verify checksums, never bundle a large model into the JS bundle. Sources: Hugging Face direct GGUF URLs or a Cloudflare R2/CDN mirror.
- Expose a tiny, swappable API so the runtime can be replaced without touching `@/features/forecast`.
