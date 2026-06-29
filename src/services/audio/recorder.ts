import {
  getRecordingPermissionsAsync,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
} from 'expo-audio';

export async function ensureAudioRecordingPermission(): Promise<boolean> {
  const currentPermission = await getRecordingPermissionsAsync();

  if (currentPermission.granted) {
    return true;
  }

  const requestedPermission = await requestRecordingPermissionsAsync();
  return requestedPermission.granted;
}

export async function prepareAudioRecordingSession(): Promise<void> {
  await setAudioModeAsync({
    allowsRecording: true,
    playsInSilentMode: true,
  });
}

export async function finishAudioRecordingSession(): Promise<void> {
  await setAudioModeAsync({
    allowsRecording: false,
  });
}
