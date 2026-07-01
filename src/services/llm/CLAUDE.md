# src/services/llm - On-device LLM

Offline GGUF inference for the default Briefing narration experience. Wraps the runtime and bundled model. **This service must never access the database** - callers pass it a bounded context and it returns text.

> **This service is the preferred native path, but still optional at runtime.** Web, Expo Go, low-memory devices, missing model assets, validation failures, and native errors must all fall back to the template narrator in `@/features/briefing`.

Spec & model details: [docs/features/briefing.md](../../../docs/features/briefing.md).

## Responsibilities

```
llm/
  runtime.ts        # load/unload a bundled GGUF model, run generation (llama.rn wrapper)
  model-manager.ts  # resolve bundled model asset, checksum/size metadata, copy to file path if needed
  prompt.ts         # fixed system template + context serialization for narration
  validation.ts     # output length/name/fact-shape checks before playback
  index.ts          # small typed API: generateBriefingNarration(context, opts) -> result
```

## Rules

- **Runtime: `llama.rn`** (GGUF) is the recommended choice (widest tiny-model range, `llama.cpp` ecosystem). Alternatives to spike: `react-native-executorch`, Cactus. **It's a native module** -> requires a dev-client rebuild and works only in a development/production build (no Expo Go, no web). iOS builds run via EAS (Windows constraint).
- **Bundled default model is tiny (~90-110 MB class)**, e.g. SmolLM2-135M-Instruct GGUF Q4. Larger models may become optional downloads later, but v1 avoids R2/CDN/download overhead.
- **Bundle only open-licensed model weights.** Do not bake secrets, private examples, user data, or proprietary fine-tunes into the model asset.
- **Lazy-load** the model (don't block app start); load on first briefing generation, unload under memory pressure.
- **Ollama is not an on-device option** - it's a desktop/server runtime. It can still be used as a dev-side tool to compare candidate models.
- **Narration only.** Low temperature, hard token cap from the caller's length budget, prompt that says *use only the provided facts*. Treat user/DB text as quoted data, not instructions. **Validate output**: if a person/place name appears that wasn't in the context, or the output is empty/too long, reject so the caller can fall back to the deterministic narrator.
- Expose a tiny, swappable API so the runtime can be replaced without touching `@/features/briefing`.
