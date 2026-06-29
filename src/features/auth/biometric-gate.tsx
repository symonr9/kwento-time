import { useEffect, useState, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
import { isBiometricLockEnabled } from '@/db/queries/settings';
import { authenticateWithBiometrics } from '@/services/auth';
import { useTheme } from '@/hooks/use-theme';

type GateState = 'checking' | 'unlocked' | 'locked' | 'unavailable';

export function BiometricGate({ children }: { children: ReactNode }) {
  const theme = useTheme();
  const [state, setState] = useState<GateState>('checking');
  const [message, setMessage] = useState<string | null>(null);

  async function unlock() {
    setState('checking');
    setMessage(null);

    try {
      const result = await authenticateWithBiometrics();

      if (result.success) {
        setState('unlocked');
        return;
      }

      setMessage(result.error ?? 'Authentication failed.');
      setState('locked');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Authentication failed.');
      setState('locked');
    }
  }

  useEffect(() => {
    let isActive = true;

    async function checkLock() {
      try {
        const enabled = await isBiometricLockEnabled();

        if (!isActive) {
          return;
        }

        if (!enabled) {
          setState('unlocked');
          return;
        }

        const result = await authenticateWithBiometrics();

        if (!isActive) {
          return;
        }

        if (result.success) {
          setState('unlocked');
        } else {
          setMessage(result.error ?? 'Authentication failed.');
          setState('locked');
        }
      } catch (err) {
        if (isActive) {
          setMessage(err instanceof Error ? err.message : 'Unable to check biometric lock.');
          setState('unavailable');
        }
      }
    }

    void checkLock();

    return () => {
      isActive = false;
    };
  }, []);

  if (state === 'unlocked') {
    return <>{children}</>;
  }

  if (state === 'checking') {
    return (
      <ThemedView style={styles.center}>
        <ActivityIndicator color={theme.primary} />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.center}>
      <View style={[styles.lockBadge, { backgroundColor: theme.primaryMuted }]} />
      <ThemedText type="subtitle">Kwento Time is locked</ThemedText>
      {message ? (
        <ThemedText themeColor="textSecondary" style={styles.message}>
          {message}
        </ThemedText>
      ) : null}
      <Pressable
        accessibilityRole="button"
        onPress={unlock}
        style={({ pressed }) => [
          styles.unlockButton,
          {
            backgroundColor: theme.primary,
            opacity: pressed ? 0.78 : 1,
          },
        ]}>
        <ThemedText type="smallBold" style={styles.unlockText}>
          Unlock
        </ThemedText>
      </Pressable>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
    gap: Spacing.three,
  },
  lockBadge: {
    width: 56,
    height: 56,
    borderRadius: Radius.large,
  },
  message: {
    textAlign: 'center',
  },
  unlockButton: {
    minHeight: 48,
    borderRadius: Radius.medium,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
  },
  unlockText: {
    color: '#FFFFFF',
  },
});
