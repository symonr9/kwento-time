import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { SegmentedField } from '@/components/ui/form-controls';
import { SurfaceCard } from '@/components/ui/surface-card';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { getForecastRetrieval } from '@/db/queries/forecast';
import { getAllPlaces } from '@/db/queries/places';
import {
  buildBriefingContext,
  narrateBriefing,
  scoreForecastData,
  type BriefingContext,
  type ForecastLength,
} from '@/features/forecast';
import type { Place } from '@/db/schema';
import { useTheme } from '@/hooks/use-theme';

const lengthOptions: { label: string; value: ForecastLength }[] = [
  { label: 'Short', value: 'short' },
  { label: 'Medium', value: 'medium' },
  { label: 'Long', value: 'long' },
];

export default function ForecastScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [places, setPlaces] = useState<Place[]>([]);
  const [selectedPlaceId, setSelectedPlaceId] = useState<number | null>(null);
  const [length, setLength] = useState<ForecastLength>('medium');
  const [context, setContext] = useState<BriefingContext | null>(null);
  const [script, setScript] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      async function loadPlaces() {
        setIsLoading(true);
        setError(null);

        try {
          const rows = await getAllPlaces();
          if (isActive) {
            setPlaces(rows);
            setSelectedPlaceId((current) => current ?? rows[0]?.id ?? null);
          }
        } catch (err) {
          if (isActive) {
            setError(err instanceof Error ? err.message : 'Unable to load places.');
          }
        } finally {
          if (isActive) {
            setIsLoading(false);
          }
        }
      }

      void loadPlaces();

      return () => {
        isActive = false;
      };
    }, []),
  );

  async function handleGenerate() {
    if (!selectedPlaceId) {
      setError('Add or select a place before generating a forecast.');
      return;
    }

    const generatedAt = new Date();
    setIsGenerating(true);
    setError(null);

    try {
      const retrieved = await getForecastRetrieval(selectedPlaceId, generatedAt);
      const scored = scoreForecastData(retrieved, generatedAt);
      const nextContext = buildBriefingContext(retrieved, scored, length);
      setContext(nextContext);
      setScript(narrateBriefing(nextContext));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to generate forecast.');
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: Math.max(insets.top, Spacing.three) + Spacing.two,
            paddingBottom: Math.max(insets.bottom, Spacing.three) + Spacing.four,
          },
        ]}
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
              Forecast
            </ThemedText>
            <ThemedText type="title" style={styles.title}>
              Deterministic place briefing.
            </ThemedText>
            <ThemedText themeColor="textSecondary">
              Generate an offline script from linked people, follow-ups, topics, and recent conversations.
            </ThemedText>
          </View>

          {isLoading ? (
            <SurfaceCard style={styles.stateCard}>
              <ActivityIndicator color={theme.primary} />
              <ThemedText themeColor="textSecondary">Loading places...</ThemedText>
            </SurfaceCard>
          ) : null}

          {error ? (
            <SurfaceCard tone="accentMuted" style={styles.stateCard}>
              <ThemedText selectable>{error}</ThemedText>
            </SurfaceCard>
          ) : null}

          {!isLoading ? (
            <SurfaceCard style={styles.form}>
              <View style={styles.field}>
                <ThemedText type="smallBold">Place</ThemedText>
                {places.length === 0 ? (
                  <ThemedText themeColor="textSecondary">Add a place first.</ThemedText>
                ) : (
                  <View style={styles.optionList}>
                    {places.map((place) => {
                      const isSelected = selectedPlaceId === place.id;

                      return (
                        <Pressable
                          key={place.id}
                          accessibilityRole="button"
                          accessibilityState={{ selected: isSelected }}
                          onPress={() => setSelectedPlaceId(place.id)}
                          style={[
                            styles.optionChip,
                            {
                              backgroundColor: isSelected ? theme.primaryMuted : theme.background,
                              borderColor: theme.border,
                            },
                          ]}>
                          <ThemedText
                            type="smallBold"
                            themeColor={isSelected ? 'text' : 'textSecondary'}>
                            {place.name}
                          </ThemedText>
                        </Pressable>
                      );
                    })}
                  </View>
                )}
              </View>

              <SegmentedField label="Length" options={lengthOptions} value={length} onChange={setLength} />

              <Pressable
                accessibilityRole="button"
                disabled={isGenerating || !selectedPlaceId}
                onPress={handleGenerate}
                style={({ pressed }) => [
                  styles.generateButton,
                  {
                    backgroundColor: theme.primary,
                    opacity: pressed || isGenerating || !selectedPlaceId ? 0.78 : 1,
                  },
                ]}>
                {isGenerating ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <ThemedText type="smallBold" style={styles.generateButtonText}>
                    Generate
                  </ThemedText>
                )}
              </Pressable>
            </SurfaceCard>
          ) : null}

          {script && context ? (
            <>
              <SurfaceCard tone="highlightMuted" style={styles.scriptCard}>
                <ThemedText type="smallBold">Transcript</ThemedText>
                <ThemedText selectable>{script}</ThemedText>
              </SurfaceCard>

              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <ThemedText type="smallBold">Briefing context</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {context.people.length}
                  </ThemedText>
                </View>

                {context.people.map((person) => (
                  <SurfaceCard key={person.name} style={styles.personCard}>
                    <View style={styles.rowHeader}>
                      <ThemedText type="smallBold">{person.name}</ThemedText>
                      <ThemedText type="small" themeColor="textSecondary">
                        {person.presenceReason}
                      </ThemedText>
                    </View>
                    {person.items.length > 0 ? (
                      person.items.map((item) => (
                        <ThemedText key={`${item.type}-${item.text}`} type="small" themeColor="textSecondary">
                          {item.type}: {item.text}
                        </ThemedText>
                      ))
                    ) : (
                      <ThemedText type="small" themeColor="textSecondary">
                        No talking points yet.
                      </ThemedText>
                    )}
                  </SurfaceCard>
                ))}
              </View>
            </>
          ) : null}
        </View>
      </ScrollView>
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
    paddingBottom: Spacing.three,
  },
  title: {
    fontSize: 36,
    lineHeight: 42,
    letterSpacing: 0,
  },
  form: {
    gap: Spacing.three,
  },
  field: {
    gap: Spacing.one,
  },
  optionList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  optionChip: {
    minHeight: 40,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.small,
    borderCurve: 'continuous',
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
  },
  generateButton: {
    minHeight: 52,
    borderRadius: Radius.medium,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  generateButtonText: {
    color: '#FFFFFF',
  },
  scriptCard: {
    gap: Spacing.two,
  },
  section: {
    gap: Spacing.two,
  },
  sectionHeader: {
    minHeight: 32,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  personCard: {
    minHeight: 72,
    justifyContent: 'center',
  },
  rowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  stateCard: {
    alignItems: 'center',
  },
});
