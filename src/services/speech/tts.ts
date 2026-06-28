import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import * as Speech from 'expo-speech';

const FORECAST_SPEECH_TAG = 'kwento-forecast-speech';

export type SpeechPlaybackCallbacks = {
  onDone?: () => void;
  onError?: (error: Error) => void;
  onStart?: () => void;
  onStopped?: () => void;
};

export async function speakForecastScript(script: string, callbacks: SpeechPlaybackCallbacks = {}) {
  const trimmedScript = script.trim();

  if (!trimmedScript) {
    return;
  }

  await Speech.stop();
  await activateKeepAwakeAsync(FORECAST_SPEECH_TAG);

  Speech.speak(trimmedScript, {
    onDone: () => {
      void deactivateKeepAwake(FORECAST_SPEECH_TAG);
      callbacks.onDone?.();
    },
    onError: (error) => {
      void deactivateKeepAwake(FORECAST_SPEECH_TAG);
      callbacks.onError?.(error instanceof Error ? error : new Error(String(error)));
    },
    onStart: callbacks.onStart,
    onStopped: () => {
      void deactivateKeepAwake(FORECAST_SPEECH_TAG);
      callbacks.onStopped?.();
    },
    pitch: 1,
    rate: 0.92,
  });
}

export async function stopForecastSpeech() {
  await Speech.stop();
  await deactivateKeepAwake(FORECAST_SPEECH_TAG);
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
