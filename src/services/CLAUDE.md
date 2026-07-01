# src/services - Device & external integrations

The **side-effecting boundary** of the app: anything that touches the OS, network, filesystem, device hardware, permissions, or native SDKs. Features call services; services do not call features.

## Layout

```
services/
  ai/              # OpenAI GPT-4o extraction; prompts + response schema
  audio/           # expo-audio recording + Whisper.rn transcription wrapper
  auth/            # expo-local-authentication biometric lock
  background/      # nightly deterministic jobs
  backup/          # manual JSON export/import validation + restore UX
  contacts/        # expo-contacts wrapper + pure normalization
  llm/             # optional on-device GGUF LLM for Enhanced Briefing narration
  notifications/   # expo-notifications local reminders
  preferences/     # key-value user preferences (theme, dismissed reminders)
  speech/          # expo-speech playback/session control
```

## Rules

- **Network only here, and only when opted in.** Outbound calls are GPT-4o extraction (`ai/`) and optional backup/sync. Everything else is on-device and offline.
- **`ai/` runs only after transcript confirmation.** Persist raw transcript first, then extract. Keep prompts versioned so old transcripts can be re-processed.
- **Keep native SDK imports isolated.** Expo/native modules belong in service wrappers (`device-contacts.ts`, `recorder.ts`, `tts.ts`). Pure helpers and tests should not import native modules.
- **`background/` tasks are deterministic and idempotent.** They call pure logic and `@/db/queries`; scheduling is the service's job.
- **`auth/` gates app open**, enforced at the root layout in `@/app`.
- Each service exposes a small typed API via `index.ts` and hides provider-specific SDK details.
- Respect freemium caps before calling paid/limited services; check via shared gating, not ad hoc.

Read https://docs.expo.dev/versions/v56.0.0/ for the current API of each Expo module before wiring.
