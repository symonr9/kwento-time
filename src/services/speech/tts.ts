import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import * as Speech from 'expo-speech';

const BRIEFING_SPEECH_TAG = 'kwento-briefing-speech';
let keepAwakeActivation: Promise<void> | null = null;
let isKeepAwakeActive = false;

export type SpeechPlaybackCallbacks = {
  onDone?: () => void;
  onError?: (error: Error) => void;
  onStart?: () => void;
  onStopped?: () => void;
};

async function activateBriefingKeepAwake() {
  keepAwakeActivation = activateKeepAwakeAsync(BRIEFING_SPEECH_TAG)
    .then(() => {
      isKeepAwakeActive = true;
    })
    .finally(() => {
      keepAwakeActivation = null;
    });

  await keepAwakeActivation;
}

async function deactivateBriefingKeepAwake() {
  if (keepAwakeActivation) {
    await keepAwakeActivation.catch(() => {});
  }

  if (!isKeepAwakeActive) {
    return;
  }

  try {
    await deactivateKeepAwake(BRIEFING_SPEECH_TAG);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (!message.includes('has not activated yet')) {
      throw err;
    }
  } finally {
    isKeepAwakeActive = false;
  }
}

export async function speakBriefingScript(script: string, callbacks: SpeechPlaybackCallbacks = {}) {
  const trimmedScript = script.trim();

  if (!trimmedScript) {
    return;
  }

  await Speech.stop();
  await activateBriefingKeepAwake();

  Speech.speak(trimmedScript, {
    onDone: () => {
      void deactivateBriefingKeepAwake();
      callbacks.onDone?.();
    },
    onError: (error) => {
      void deactivateBriefingKeepAwake();
      callbacks.onError?.(error instanceof Error ? error : new Error(String(error)));
    },
    onStart: callbacks.onStart,
    onStopped: () => {
      void deactivateBriefingKeepAwake();
      callbacks.onStopped?.();
    },
    pitch: 1,
    rate: 0.92,
  });
}

export async function stopBriefingSpeech() {
  await Speech.stop();
  await deactivateBriefingKeepAwake();
}

export async function pauseBriefingSpeech() {
  await Speech.pause();
}

export async function resumeBriefingSpeech() {
  await Speech.resume();
}

export async function isBriefingSpeaking() {
  return Speech.isSpeakingAsync();
}
