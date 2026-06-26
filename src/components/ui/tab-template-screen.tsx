import { ScrollView, StyleSheet, View } from 'react-native';

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
};

export function TabTemplateScreen({
  eyebrow,
  title,
  description,
  metrics,
  sections,
}: TabTemplateScreenProps) {
  const theme = useTheme();

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: theme.background }]}
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic">
      <View style={styles.inner}>
        <View style={styles.hero}>
          <ThemedText type="smallBold" themeColor="primary">
            {eyebrow}
          </ThemedText>
          <ThemedText type="title" style={styles.title}>
            {title}
          </ThemedText>
          <ThemedText themeColor="textSecondary" style={styles.description}>
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
    paddingTop: Spacing.five,
    paddingBottom: BottomTabInset + Spacing.four,
    alignItems: 'center',
  },
  inner: {
    width: '100%',
    maxWidth: MaxContentWidth,
    gap: Spacing.three,
  },
  hero: {
    gap: Spacing.two,
    paddingVertical: Spacing.three,
  },
  title: {
    fontSize: 36,
    lineHeight: 42,
    letterSpacing: 0,
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
