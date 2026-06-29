import { Link } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/ui/surface-card';
import { BottomTabInset, MaxContentWidth, Radius, Spacing, type ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type TemplateMetric = {
  label: string;
  value: string;
  tone: ThemeColor;
};

type TemplateSection = {
  title: string;
  body: string;
  tone: ThemeColor;
};

export type TabTemplateScreenProps = {
  eyebrow: string;
  title: string;
  description: string;
  metrics: TemplateMetric[];
  sections: TemplateSection[];
  showSettingsAction?: boolean;
};

export function TabTemplateScreen({
  eyebrow,
  title,
  description,
  metrics,
  sections,
  showSettingsAction = true,
}: TabTemplateScreenProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: theme.background }]}
      contentContainerStyle={[styles.content, { paddingTop: Math.max(insets.top, Spacing.three) + Spacing.two }]}
      contentInsetAdjustmentBehavior="automatic">
      <View style={styles.inner}>
        <View style={styles.header}>
          <View style={[styles.headerMark, { backgroundColor: theme.primary }]} />
          {showSettingsAction ? (
            <Link href="/settings" asChild>
              <Pressable
                accessibilityLabel="Open settings"
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.settingsButton,
                  {
                    backgroundColor: theme.backgroundElement,
                    borderColor: theme.border,
                    opacity: pressed ? 0.72 : 1,
                  },
                ]}>
                <SymbolView
                  name={{ ios: 'gearshape', android: 'settings', web: 'settings' }}
                  size={20}
                  tintColor={theme.text}
                  fallback={<View style={[styles.settingsFallback, { backgroundColor: theme.text }]} />}
                />
              </Pressable>
            </Link>
          ) : null}
        </View>

        <View style={styles.hero}>
          <ThemedText type="smallBold" themeColor="primary">
            {eyebrow}
          </ThemedText>
          <ThemedText type="title">
            {title}
          </ThemedText>
          <ThemedText themeColor="textSecondary">
            {description}
          </ThemedText>
        </View>

        <View style={styles.metricGrid}>
          {metrics.map((metric) => (
            <SurfaceCard key={metric.label} tone={metric.tone} style={styles.metricCard}>
              <ThemedText type="smallBold">{metric.value}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {metric.label}
              </ThemedText>
            </SurfaceCard>
          ))}
        </View>

        <View style={styles.sectionList}>
          {sections.map((section) => (
            <SurfaceCard key={section.title}>
              <View
                style={[
                  styles.marker,
                  {
                    backgroundColor: theme[section.tone],
                  },
                ]}
              />
              <ThemedText type="smallBold">{section.title}</ThemedText>
              <ThemedText themeColor="textSecondary">{section.body}</ThemedText>
            </SurfaceCard>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.four,
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
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  headerMark: {
    width: 40,
    height: 4,
    borderRadius: Radius.small,
  },
  settingsButton: {
    width: 40,
    height: 40,
    borderRadius: Radius.medium,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 8px 18px rgba(36, 48, 58, 0.08)',
  },
  settingsFallback: {
    width: 18,
    height: 18,
    borderRadius: Radius.small,
  },
  hero: {
    gap: Spacing.two,
    paddingBottom: Spacing.three,
  },
  description: {
    maxWidth: 640,
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
  sectionList: {
    gap: Spacing.two,
  },
  marker: {
    width: 36,
    height: 4,
    borderRadius: Radius.small,
  },
});
