import { migrate } from 'drizzle-orm/expo-sqlite/migrator';
import { useEffect, useState, type ReactNode } from 'react';
import { ActivityIndicator, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

import { getDb } from './client';
import migrations from './migrations/migrations';

/**
 * Runs Drizzle migrations against the on-device DB before rendering the app.
 * Blocks on a lightweight loading state and surfaces fatal migration errors
 * (a corrupt/locked DB) instead of letting screens query a half-built schema.
 */
export function MigrationGate({ children }: { children: ReactNode }) {
  const [{ success, error }, setState] = useState<{ success: boolean; error?: Error }>({
    success: false,
  });

  useEffect(() => {
    let cancelled = false;

    async function runMigrations() {
      try {
        const db = await getDb();
        await migrate(db, migrations);
        if (!cancelled) {
          setState({ success: true });
        }
      } catch (caught) {
        if (!cancelled) {
          setState({ success: false, error: caught as Error });
        }
      }
    }

    runMigrations();

    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <ThemedView style={styles.center}>
        <ThemedText type="subtitle">Database error</ThemedText>
        <ThemedText themeColor="textSecondary" style={styles.message}>
          {error.message}
        </ThemedText>
      </ThemedView>
    );
  }

  if (!success) {
    return (
      <ThemedView style={styles.center}>
        <ActivityIndicator />
      </ThemedView>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
    gap: Spacing.three,
  },
  message: {
    textAlign: 'center',
  },
});
