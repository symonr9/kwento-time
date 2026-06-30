# src/services/llm — On-device LLM

Offline GGUF inference for the **Enhanced (LLM) narration mode** of Briefing. Wraps the runtime and manages models. **This service must never access the database** — callers pass it a bounded context and it returns text.

> **This service is Premium-only and optional.** The free/default path is **deterministic mode** — a template narrator in `@/features/briefing` that needs no model and no network. This service only smooths wording when a user opts into Enhanced mode (with a free trial). Everything must work without it.

Spec & model details: [docs/features/briefing.md](../../../docs/features/briefing.md).

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
- **Default model is tiny (~50–100 MB class**, e.g. SmolLM2-135M-Instruct GGUF). Larger models are **opt-in downloads**; surface size/quality/battery/thermal tradeoffs and let the user pick — an "Ollama-style" in-app pull (browse → download → use).
- **NEVER bundle a model in the app binary.** All models **download post-install**, on opt-in, to app storage via `expo-file-system`; verify checksums; allow delete. Keeps the binary small (iOS OTA install cap ~200 MB) and only opted-in users pay the storage cost. Sources: Hugging Face GGUF URLs or a Cloudflare R2/CDN mirror.
- **Lazy-load** the model (don't block app start); load on first Enhanced briefing, unload under memory pressure.
- **Ollama is not an on-device option** — it's a desktop/server runtime. Honor the preference by (a) using Ollama as a *dev-side* tool to pick/test/quantize models, then hosting the GGUF for download, and (b) optionally supporting a *remote* Ollama HTTP backend (online, opt-in, not the offline default — see spec §8c). On-device inference here is `llama.rn` + GGUF.
- **Narration only.** Low temperature, hard token cap from the caller's length budget, prompt that says *use only the provided facts*. **Validate output**: if a person name appears that wasn't in the context, reject so the caller can fall back to the deterministic narrator.
- Expose a tiny, swappable API so the runtime (or a remote Ollama backend) can be replaced without touching `@/features/briefing`.
