import * as LocalAuthentication from 'expo-local-authentication';

export type BiometricAvailability = {
  available: boolean;
  reason?: string;
};

export async function getBiometricAvailability(): Promise<BiometricAvailability> {
  const hasHardware = await LocalAuthentication.hasHardwareAsync();

  if (!hasHardware) {
    return { available: false, reason: 'This device does not have biometric hardware.' };
  }

  const isEnrolled = await LocalAuthentication.isEnrolledAsync();

  if (!isEnrolled) {
    return { available: false, reason: 'Set up Face ID, Touch ID, or fingerprint unlock first.' };
  }

  return { available: true };
}

export async function authenticateWithBiometrics() {
  const availability = await getBiometricAvailability();

  if (!availability.available) {
    return {
      error: availability.reason ?? 'Biometric authentication is not available.',
      success: false,
    };
  }

  const result = await LocalAuthentication.authenticateAsync({
    cancelLabel: 'Cancel',
    disableDeviceFallback: false,
    promptMessage: 'Unlock Kwento Time',
  });

  if (!result.success) {
    return {
      error: 'Authentication was not completed.',
      success: false,
    };
  }

  return {
    success: true,
  };
}
