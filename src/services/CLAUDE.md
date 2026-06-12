# src/services — Device & external integrations

The **side-effecting boundary** of the app: anything that touches the OS, the network, or device hardware. Features call services; services don't call features.

## Layout

```
services/
  ai/              # OpenAI GPT-4o entity extraction; prompt templates + response schema
  audio/           # expo-av recording + Whisper.rn on-device transcription wrapper
  notifications/   # expo-notifications — schedule/cancel local reminders
  background/      # Expo Background Fetch tasks: nightly health recompute, expiry checks, reminder scheduling
  auth/            # expo-local-authentication — biometric lock (Face ID / Touch ID)
  backup/          # iCloud sync / manual JSON export + import (GDPR export/delete)
```

## Rules

- **Network only here, and only when opted in.** The *only* outbound calls in the app are GPT-4o extraction (`ai/`) and optional backup (`backup/`). Everything else is on-device and offline. Transcription (`audio/`) is **on-device, no network**.
- **`ai/` is called only after the user confirms a transcript.** Persist the raw transcript first (via `@/db`), then extract. Keep prompts versioned in `ai/` so transcripts can be re-processed as prompts improve. The OpenAI key may be proxied through a Cloudflare Worker to keep it off the device — design `ai/` so the base URL is swappable.
- **`background/` tasks must be deterministic and idempotent** — they run nightly and may re-run. They call into pure logic in `@/features` (e.g. `health-score`, expiry transitions) and into `@/db/queries`; the *scheduling* is the service's job, the *math* is the feature's.
- **`auth/` gates app open**, enforced at the root layout in `@/app`.
- Each service exposes a small typed API via `index.ts` and hides the SDK behind it — so swapping a provider (or mocking in tests) touches one file.
- Respect freemium caps (5 AI notes/mo on free) before calling `ai/`; check via the shared gating check, not ad hoc.

Read https://docs.expo.dev/versions/v56.0.0/ for the current API of each Expo module (av, notifications, background-fetch/task-manager, local-authentication) before wiring.
