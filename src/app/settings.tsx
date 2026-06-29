import { router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/ui/surface-card';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { generateBackupJson, importBackupJson } from '@/services/backup';

export default function SettingsScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [backupJson, setBackupJson] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleExport() {
    setIsExporting(true);
    setNotice(null);
    setError(null);

    try {
      const json = await generateBackupJson();
      setBackupJson(json);
      setNotice('Backup JSON generated.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to export backup.');
    } finally {
      setIsExporting(false);
    }
  }

  async function handleImport() {
    if (!backupJson.trim()) {
      setError('Paste backup JSON before importing.');
      return;
    }

    setIsImporting(true);
    setNotice(null);
    setError(null);

    try {
      const result = await importBackupJson(backupJson);
      setNotice(`Imported ${result.importedRows} rows. Existing conflicting rows were skipped.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to import backup.');
    } finally {
      setIsImporting(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.select({ ios: 'padding', default: undefined })}
      style={[styles.screen, { backgroundColor: theme.background }]}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: Math.max(insets.top, Spacing.three) + Spacing.two,
            paddingBottom: Math.max(insets.bottom, Spacing.three) + Spacing.four,
          },
        ]}
        keyboardShouldPersistTaps="handled"
        contentInsetAdjustmentBehavior="automatic">
        <View style={styles.inner}>
          <View style={styles.header}>
            <Pressable
              accessibilityLabel="Go back"
              accessibilityRole="button"
              onPress={() => router.back()}
              style={({ pressed }) => [
                styles.iconButton,
                {
                  backgroundColor: theme.backgroundElement,
                  borderColor: theme.border,
                  opacity: pressed ? 0.72 : 1,
                },
              ]}>
              <ThemedText type="smallBold">Back</ThemedText>
            </Pressable>
          </View>

          <View style={styles.hero}>
            <ThemedText type="smallBold" themeColor="primary">
              Settings
            </ThemedText>
            <ThemedText type="title" style={styles.title}>
              Keep local data private.
            </ThemedText>
            <ThemedText themeColor="textSecondary">
              Export a JSON backup or paste one here to import records back into SQLite.
            </ThemedText>
          </View>

          <View style={styles.metricGrid}>
            <SurfaceCard tone="primaryMuted" style={styles.metricCard}>
              <ThemedText type="smallBold">On</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Local-first
              </ThemedText>
            </SurfaceCard>
            <SurfaceCard tone="accentMuted" style={styles.metricCard}>
              <ThemedText type="smallBold">JSON</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Manual backup
              </ThemedText>
            </SurfaceCard>
            <SurfaceCard tone="highlightMuted" style={styles.metricCard}>
              <ThemedText type="smallBold">Free</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Plan
              </ThemedText>
            </SurfaceCard>
          </View>

          {notice ? (
            <SurfaceCard tone="primaryMuted" style={styles.stateCard}>
              <ThemedText selectable>{notice}</ThemedText>
            </SurfaceCard>
          ) : null}

          {error ? (
            <SurfaceCard tone="accentMuted" style={styles.stateCard}>
              <ThemedText selectable>{error}</ThemedText>
            </SurfaceCard>
          ) : null}

          <SurfaceCard style={styles.section}>
            <ThemedText type="smallBold">Backup JSON</ThemedText>
            <TextInput
              multiline
              textAlignVertical="top"
              value={backupJson}
              onChangeText={setBackupJson}
              placeholder="Generate a backup or paste one here."
              placeholderTextColor={theme.textSecondary}
              style={[
                styles.backupInput,
                {
                  backgroundColor: theme.background,
                  borderColor: theme.border,
                  color: theme.text,
                },
              ]}
            />
            <View style={styles.actionRow}>
              <Pressable
                accessibilityRole="button"
                disabled={isExporting}
                onPress={handleExport}
                style={({ pressed }) => [
                  styles.primaryButton,
                  {
                    backgroundColor: theme.primary,
                    opacity: pressed || isExporting ? 0.78 : 1,
                  },
                ]}>
                {isExporting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <ThemedText type="smallBold" style={styles.primaryButtonText}>
                    Generate
                  </ThemedText>
                )}
              </Pressable>
              <Pressable
                accessibilityRole="button"
                disabled={isImporting}
                onPress={handleImport}
                style={({ pressed }) => [
                  styles.secondaryButton,
                  {
                    backgroundColor: theme.backgroundSelected,
                    opacity: pressed || isImporting ? 0.72 : 1,
                  },
                ]}>
                {isImporting ? (
                  <ActivityIndicator color={theme.text} />
                ) : (
                  <ThemedText type="smallBold">Import</ThemedText>
                )}
              </Pressable>
            </View>
          </SurfaceCard>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: Spacing.three,
    alignItems: 'center',
  },
  inner: {
    width: '100%',
    maxWidth: MaxContentWidth,
    gap: Spacing.three,
  },
  header: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    minHeight: 40,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.medium,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: 'center',
  },
  hero: {
    gap: Spacing.two,
  },
  title: {
    fontSize: 36,
    lineHeight: 42,
    letterSpacing: 0,
  },
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  metricCard: {
    minWidth: 144,
    flexGrow: 1,
    borderRadius: Radius.small,
  },
  section: {
    gap: Spacing.three,
  },
  backupInput: {
    minHeight: 240,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.small,
    borderCurve: 'continuous',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 14,
    fontFamily: Platform.select({ ios: 'ui-monospace', default: 'monospace' }),
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  primaryButton: {
    flexGrow: 1,
    minHeight: 48,
    borderRadius: Radius.medium,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
  },
  primaryButtonText: {
    color: '#FFFFFF',
  },
  secondaryButton: {
    flexGrow: 1,
    minHeight: 48,
    borderRadius: Radius.medium,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
  },
  stateCard: {
    alignItems: 'center',
  },
});
