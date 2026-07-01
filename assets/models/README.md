# Bundled Briefing Model

Place the selected GGUF model here when the native LLM spike is ready to ship.

Recommended first candidate:

- `SmolLM2-135M-Instruct` GGUF, Q4 quantization
- Target size: about 90-110 MB
- License must be open and app-store compatible

After adding the file:

1. Update `src/services/llm/model-manager.ts`:
   - set `assetModule` to `require('@/assets/models/<file>.gguf')`
   - set `expectedSizeBytes` to the exact byte size
   - set `checksumMd5` to the file MD5
2. Rebuild the dev client or production app. This is a native/bundled-asset change.
3. Test on real iOS and Android devices before relying on LLM narration.

Do not put prompts, private examples, user data, secrets, or fine-tuned private data into model weights.
