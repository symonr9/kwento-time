import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/ui/surface-card';
import { TabScreenHeader } from '@/components/ui/tab-screen-header';
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
        <TabScreenHeader
          eyebrow={eyebrow}
          title={title}
          description={description}
          showSettingsAction={showSettingsAction}
        />

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
