# src/services/speech — Text-to-speech & playback

Reads the Briefing script aloud, designed for **hands-free / driving** use. Spec: [docs/features/briefing.md](../../../docs/features/briefing.md).

## Responsibilities

```
speech/
  tts.ts            # expo-speech wrapper: speak/pause/resume/stop, voice + rate/pitch
  session.ts        # audio session/routing config + keep-awake during playback
  index.ts          # typed API the briefing feature calls
```

## Rules

- **Engine: `expo-speech`** (OS TTS) — **offline**, supports voice/rate/pitch. No model needed for v1. Neural offline TTS (Piper/Kokoro) is a future upgrade; keep this API stable so it can swap in.
- **Auto-play** the script as soon as it's ready (the user already opted in by generating), and **keep the screen awake** (`expo-keep-awake`) for the duration.
- **Audio routing/session:** let the OS send speech to the active output (car Bluetooth / headphones / speaker); configure the session to behave well alongside other audio (prefer ducking music over stopping it).
- Expose **large, simple controls** to the feature: pause/resume, replay, stop. Never require the user to read while driving — always also provide the transcript for stationary/accessibility use.
- This service is **playback only** — it does not generate text (that's `@/services/llm` or the template narrator) and never touches the DB.
