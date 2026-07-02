import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { SegmentedField } from '@/components/ui/form-controls';
import { SurfaceCard } from '@/components/ui/surface-card';
import { Fonts, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { isBiometricLockEnabled, setBiometricLockEnabled } from '@/db/queries/settings';
import { useAppearancePreference } from '@/hooks/use-appearance-preference';
import { useTheme } from '@/hooks/use-theme';
import { getBiometricAvailability } from '@/services/auth';
import { generateBackupJson, importBackupJson, previewBackupJson, type BackupPreview } from '@/services/backup';
import type { AppearanceMode } from '@/services/preferences';

function formatBackupDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export default function SettingsScreen() {
  const theme = useTheme();
  const { effectiveScheme, mode: appearanceMode, setMode: setAppearanceMode, systemScheme } =
    useAppearancePreference();
  const insets = useSafeAreaInsets();
  const [backupJson, setBackupJson] = useState('');
  const [backupPreview, setBackupPreview] = useState<BackupPreview | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isBiometricEnabled, setIsBiometricEnabled] = useState(false);
  const [isSavingBiometric, setIsSavingBiometric] = useState(false);
  const [biometricAvailability, setBiometricAvailability] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      async function loadPrivacySettings() {
        try {
          const [enabled, availability] = await Promise.all([
            isBiometricLockEnabled(),
            getBiometricAvailability(),
          ]);

          if (isActive) {
            setIsBiometricEnabled(enabled);
            setBiometricAvailability(availability.available ? null : availability.reason ?? null);
          }
        } catch (err) {
          if (isActive) {
            setBiometricAvailability(err instanceof Error ? err.message : 'Unable to check biometrics.');
          }
        }
      }

      void loadPrivacySettings();

      return () => {
        isActive = false;
      };
    }, []),
  );

  async function handleExport() {
    setIsExporting(true);
    setNotice(null);
    setError(null);

    try {
      const json = await generateBackupJson();
      setBackupJson(json);
      setBackupPreview(previewBackupJson(json));
      setNotice('Backup JSON generated.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to export backup.');
    } finally {
      setIsExporting(false);
    }
  }

  function handleBackupJsonChange(value: string) {
    setBackupJson(value);
    setBackupPreview(null);
  }

  function handlePreviewImport() {
    if (!backupJson.trim()) {
      setError('Paste backup JSON before previewing.');
      return;
    }

    setNotice(null);
    setError(null);

    try {
      const preview = previewBackupJson(backupJson);
      setBackupPreview(preview);
      setNotice(`Backup preview ready: ${preview.totalRows} rows from ${formatBackupDate(preview.exportedAt)}.`);
    } catch (err) {
      setBackupPreview(null);
      setError(err instanceof Error ? err.message : 'Unable to preview backup.');
    }
  }

  async function runImport() {
    setIsImporting(true);
    setNotice(null);
    setError(null);

    try {
      const result = await importBackupJson(backupJson);
      setNotice(`Processed ${result.importedRows} backup rows. Existing conflicting rows were skipped.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to import backup.');
    } finally {
      setIsImporting(false);
    }
  }

  function handleImport() {
    if (!backupPreview) {
      setError('Preview the backup before importing.');
      return;
    }

    Alert.alert(
      'Import backup?',
      `Import ${backupPreview.totalRows} rows from ${formatBackupDate(backupPreview.exportedAt)}. Existing conflicts will be skipped.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Import', onPress: () => void runImport() },
      ],
    );
  }

  async function handleToggleBiometric() {
    setIsSavingBiometric(true);
    setNotice(null);
    setError(null);

    try {
      if (!isBiometricEnabled) {
        const availability = await getBiometricAvailability();

        if (!availability.available) {
          setBiometricAvailability(availability.reason ?? 'Biometrics are unavailable.');
          return;
        }
      }

      const nextValue = !isBiometricEnabled;
      await setBiometricLockEnabled(nextValue);
      setIsBiometricEnabled(nextValue);
      setNotice(nextValue ? 'Biometric lock enabled.' : 'Biometric lock disabled.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update biometric lock.');
    } finally {
      setIsSavingBiometric(false);
    }
  }

  async function handleAppearanceModeChange(mode: AppearanceMode) {
    setNotice(null);
    setError(null);

    try {
      await setAppearanceMode(mode);
      setNotice(`Appearance set to ${mode === 'system' ? 'system default' : mode} mode.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update appearance.');
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
            <ThemedText type="subtitle" themeColor="primary">
              Settings
            </ThemedText>
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
            <View style={styles.settingCopy}>
              <ThemedText type="smallBold">Appearance</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Current theme is {effectiveScheme}. System is {systemScheme}.
              </ThemedText>
            </View>
            <SegmentedField<AppearanceMode>
              label="Mode"
              options={[
                { label: 'System', value: 'system' },
                { label: 'Light', value: 'light' },
                { label: 'Dark', value: 'dark' },
              ]}
              value={appearanceMode}
              onChange={(nextMode) => void handleAppearanceModeChange(nextMode)}
            />
          </SurfaceCard>

          <SurfaceCard style={styles.section}>
            <View style={styles.rowHeader}>
              <View style={styles.settingCopy}>
                <ThemedText type="smallBold">Biometric lock</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  Require Face ID, Touch ID, or fingerprint unlock when the app opens.
                </ThemedText>
                {biometricAvailability ? (
                  <ThemedText type="small" themeColor="accent" selectable>
                    {biometricAvailability}
                  </ThemedText>
                ) : null}
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ checked: isBiometricEnabled }}
                disabled={isSavingBiometric}
                onPress={handleToggleBiometric}
                style={({ pressed }) => [
                  styles.toggleButton,
                  {
                    backgroundColor: isBiometricEnabled ? theme.primary : theme.backgroundSelected,
                    opacity: pressed || isSavingBiometric ? 0.72 : 1,
                  },
                ]}>
                <ThemedText
                  type="smallBold"
                  themeColor={isBiometricEnabled ? 'onPrimary' : undefined}>
                  {isBiometricEnabled ? 'On' : 'Off'}
                </ThemedText>
              </Pressable>
            </View>
          </SurfaceCard>

          <SurfaceCard style={styles.section}>
            <ThemedText type="smallBold">Backup JSON</ThemedText>
            <TextInput
              multiline
              textAlignVertical="top"
              value={backupJson}
              onChangeText={handleBackupJsonChange}
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
            {backupPreview ? <BackupPreviewCard preview={backupPreview} /> : null}
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
                  <ActivityIndicator color={theme.onPrimary} />
                ) : (
                  <ThemedText type="smallBold" themeColor="onPrimary">
                    Generate
                  </ThemedText>
                )}
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={handlePreviewImport}
                style={({ pressed }) => [
                  styles.secondaryButton,
                  {
                    backgroundColor: theme.backgroundSelected,
                    opacity: pressed ? 0.72 : 1,
                  },
                ]}>
                <ThemedText type="smallBold">Preview</ThemedText>
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

function BackupPreviewCard({ preview }: { preview: BackupPreview }) {
  const theme = useTheme();
  const rows = Object.entries(preview.tableCounts)
    .filter(([, count]) => count > 0)
    .sort(([a], [b]) => a.localeCompare(b));

  return (
    <View
      style={[
        styles.previewCard,
        {
          backgroundColor: theme.primaryMuted,
          borderColor: theme.border,
        },
      ]}>
      <View style={styles.rowHeader}>
        <View style={styles.settingCopy}>
          <ThemedText type="smallBold">Backup preview</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {preview.totalRows} rows · exported {formatBackupDate(preview.exportedAt)}
          </ThemedText>
        </View>
        <ThemedText type="small" themeColor="textSecondary">
          v{preview.version}
        </ThemedText>
      </View>
      {rows.length > 0 ? (
        <View style={styles.previewRows}>
          {rows.map(([tableName, count]) => (
            <View key={tableName} style={styles.previewRow}>
              <ThemedText type="small" themeColor="textSecondary">
                {tableName}
              </ThemedText>
              <ThemedText type="smallBold">{count}</ThemedText>
            </View>
          ))}
        </View>
      ) : null}
      {preview.warnings.map((warning) => (
        <ThemedText key={warning} type="small" themeColor="textSecondary">
          {warning}
        </ThemedText>
      ))}
    </View>
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
    minHeight: 20,
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
  previewCard: {
    gap: Spacing.two,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.small,
    borderCurve: 'continuous',
    padding: Spacing.three,
  },
  previewRows: {
    gap: Spacing.one,
  },
  previewRow: {
    minHeight: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  settingCopy: {
    flex: 1,
    minWidth: 0,
    gap: Spacing.one,
  },
  toggleButton: {
    minWidth: 72,
    minHeight: 40,
    borderRadius: Radius.medium,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
  },
  backupInput: {
    minHeight: 240,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.small,
    borderCurve: 'continuous',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 14,
    fontFamily: Fonts.mono,
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
