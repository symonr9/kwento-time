import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import * as Speech from 'expo-speech';

const FORECAST_SPEECH_TAG = 'kwento-forecast-speech';
let keepAwakeActivation: Promise<void> | null = null;
let isKeepAwakeActive = false;

export type SpeechPlaybackCallbacks = {
  onDone?: () => void;
  onError?: (error: Error) => void;
  onStart?: () => void;
  onStopped?: () => void;
};

async function activateForecastKeepAwake() {
  keepAwakeActivation = activateKeepAwakeAsync(FORECAST_SPEECH_TAG)
    .then(() => {
      isKeepAwakeActive = true;
    })
    .finally(() => {
      keepAwakeActivation = null;
    });

  await keepAwakeActivation;
}

async function deactivateForecastKeepAwake() {
  if (keepAwakeActivation) {
    await keepAwakeActivation.catch(() => {});
  }

  if (!isKeepAwakeActive) {
    return;
  }

  try {
    await deactivateKeepAwake(FORECAST_SPEECH_TAG);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (!message.includes('has not activated yet')) {
      throw err;
    }
  } finally {
    isKeepAwakeActive = false;
  }
}

export async function speakForecastScript(script: string, callbacks: SpeechPlaybackCallbacks = {}) {
  const trimmedScript = script.trim();

  if (!trimmedScript) {
    return;
  }

  await Speech.stop();
  await activateForecastKeepAwake();

  Speech.speak(trimmedScript, {
    onDone: () => {
      void deactivateForecastKeepAwake();
      callbacks.onDone?.();
    },
    onError: (error) => {
      void deactivateForecastKeepAwake();
      callbacks.onError?.(error instanceof Error ? error : new Error(String(error)));
    },
    onStart: callbacks.onStart,
    onStopped: () => {
      void deactivateForecastKeepAwake();
      callbacks.onStopped?.();
    },
    pitch: 1,
    rate: 0.92,
  });
}

export async function stopForecastSpeech() {
  await Speech.stop();
  await deactivateForecastKeepAwake();
}

export async function pauseForecastSpeech() {
  await Speech.pause();
}

export async function resumeForecastSpeech() {
  await Speech.resume();
}

export async function isForecastSpeaking() {
  return Speech.isSpeakingAsync();
}
