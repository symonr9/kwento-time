import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Avatar } from '@/components/ui/avatar';
import { SegmentedField } from '@/components/ui/form-controls';
import { SurfaceCard } from '@/components/ui/surface-card';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { getForecastRetrieval, getGeneralForecastRetrieval, type ForecastRetrievedData } from '@/db/queries/forecast';
import { getAllPlaces } from '@/db/queries/places';
import type { Place } from '@/db/schema';
import {
  buildBriefingContext,
  narrateBriefing,
  scoreForecastData,
  type BriefingContext,
  type ForecastLength,
} from '@/features/forecast';
import { useTheme } from '@/hooks/use-theme';
import { speakForecastScript, stopForecastSpeech } from '@/services/speech';

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
  const [preview, setPreview] = useState<ForecastRetrievedData | null>(null);
  const [script, setScript] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
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
            setSelectedPlaceId((current) => current ?? null);
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

  useEffect(() => {
    return () => {
      void stopForecastSpeech();
    };
  }, []);

  useEffect(() => {
    let isActive = true;

    async function loadPreview() {
      if (isLoading) {
        return;
      }

      setError(null);

      try {
        const generatedAt = new Date();
        const nextPreview =
          selectedPlaceId === null
            ? await getGeneralForecastRetrieval(generatedAt)
            : await getForecastRetrieval(selectedPlaceId, generatedAt);

        if (isActive) {
          setPreview(nextPreview);
        }
      } catch (err) {
        if (isActive) {
          setError(err instanceof Error ? err.message : 'Unable to load forecast preview.');
        }
      }
    }

    void loadPreview();

    return () => {
      isActive = false;
    };
  }, [isLoading, selectedPlaceId]);

  async function playScript(nextScript: string) {
    setError(null);

    try {
      await speakForecastScript(nextScript, {
        onDone: () => setIsSpeaking(false),
        onError: (err) => {
          setIsSpeaking(false);
          setError(err.message);
        },
        onStart: () => setIsSpeaking(true),
        onStopped: () => setIsSpeaking(false),
      });
    } catch (err) {
      setIsSpeaking(false);
      setError(err instanceof Error ? err.message : 'Unable to play forecast.');
    }
  }

  async function handleStopSpeech() {
    try {
      await stopForecastSpeech();
      setIsSpeaking(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to stop playback.');
    }
  }

  async function handleReplay() {
    if (script) {
      await playScript(script);
    }
  }

  async function handleGenerate() {
    const generatedAt = new Date();
    setIsGenerating(true);
    setError(null);

    try {
      const retrieved =
        selectedPlaceId === null
          ? await getGeneralForecastRetrieval(generatedAt)
          : await getForecastRetrieval(selectedPlaceId, generatedAt);
      const scored = scoreForecastData(retrieved, generatedAt);
      const nextContext = buildBriefingContext(retrieved, scored, length);
      const nextScript = narrateBriefing(nextContext);
      setContext(nextContext);
      setScript(nextScript);
      await playScript(nextScript);
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
                <ThemedText type="smallBold">Forecast scope</ThemedText>
                <View style={styles.placeList}>
                  <ForecastScopeCard
                    isGeneral
                    isSelected={selectedPlaceId === null}
                    title="General"
                    onPress={() => setSelectedPlaceId(null)}>
                    {selectedPlaceId === null ? <ForecastPreview preview={preview} /> : null}
                  </ForecastScopeCard>

                  {places.map((place) => (
                    <ForecastScopeCard
                      key={place.id}
                      avatarUri={place.avatarUri}
                      isSelected={selectedPlaceId === place.id}
                      title={place.name}
                      subtitle={place.address}
                      onPress={() => setSelectedPlaceId(place.id)}>
                      {selectedPlaceId === place.id ? <ForecastPreview preview={preview} /> : null}
                    </ForecastScopeCard>
                  ))}
                </View>
              </View>

              <SegmentedField label="Length" options={lengthOptions} value={length} onChange={setLength} />

              <Pressable
                accessibilityRole="button"
                disabled={isGenerating}
                onPress={handleGenerate}
                style={({ pressed }) => [
                  styles.generateButton,
                  {
                    backgroundColor: theme.primary,
                    opacity: pressed || isGenerating ? 0.78 : 1,
                  },
                ]}>
                {isGenerating ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <ThemedText type="smallBold" style={styles.generateButtonText}>
                    Generate and play
                  </ThemedText>
                )}
              </Pressable>
            </SurfaceCard>
          ) : null}

          {script && context ? (
            <>
              <View style={styles.metricGrid}>
                <SurfaceCard tone="primaryMuted" style={styles.metricCard}>
                  <ThemedText type="smallBold">{context.people.length}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    People in briefing
                  </ThemedText>
                </SurfaceCard>
                <SurfaceCard tone="accentMuted" style={styles.metricCard}>
                  <ThemedText type="smallBold">{context.length.seconds}s</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    Target length
                  </ThemedText>
                </SurfaceCard>
                <SurfaceCard tone="highlightMuted" style={styles.metricCard}>
                  <ThemedText type="smallBold">{context.lifeItems.length}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    Life topics
                  </ThemedText>
                </SurfaceCard>
              </View>

              <SurfaceCard style={styles.playbackCard}>
                <View style={styles.rowHeader}>
                  <View style={styles.playbackTitle}>
                    <ThemedText type="smallBold">Playback</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {isSpeaking ? 'Speaking now' : 'Ready'}
                    </ThemedText>
                  </View>
                  <View
                    style={[
                      styles.playbackDot,
                      { backgroundColor: isSpeaking ? theme.primary : theme.textSecondary },
                    ]}
                  />
                </View>
                <View style={styles.actionRow}>
                  <Pressable
                    accessibilityRole="button"
                    onPress={handleReplay}
                    style={({ pressed }) => [
                      styles.secondaryButton,
                      {
                        backgroundColor: theme.backgroundSelected,
                        opacity: pressed ? 0.72 : 1,
                      },
                    ]}>
                    <ThemedText type="smallBold">Replay</ThemedText>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    onPress={handleStopSpeech}
                    style={({ pressed }) => [
                      styles.secondaryButton,
                      {
                        backgroundColor: theme.backgroundSelected,
                        opacity: pressed ? 0.72 : 1,
                      },
                    ]}>
                    <ThemedText type="smallBold">Stop</ThemedText>
                  </Pressable>
                </View>
              </SurfaceCard>

              <SurfaceCard tone="highlightMuted" style={styles.scriptCard}>
                <ThemedText type="smallBold">Transcript</ThemedText>
                <ThemedText selectable>{script}</ThemedText>
              </SurfaceCard>

              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <ThemedText type="smallBold">Briefing context</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {context.people.length + context.lifeItems.length}
                  </ThemedText>
                </View>

                {context.lifeItems.length > 0 ? (
                  <SurfaceCard style={styles.personCard}>
                    <ThemedText type="smallBold">Life updates</ThemedText>
                    {context.lifeItems.map((item) => (
                      <ThemedText key={item.text} type="small" themeColor="textSecondary" selectable>
                        {item.text}
                      </ThemedText>
                    ))}
                  </SurfaceCard>
                ) : null}

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

function ForecastScopeCard({
  avatarUri,
  children,
  isGeneral = false,
  isSelected,
  onPress,
  subtitle,
  title,
}: {
  avatarUri?: string | null;
  children?: ReactNode;
  isGeneral?: boolean;
  isSelected: boolean;
  onPress: () => void;
  subtitle?: string | null;
  title: string;
}) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: isSelected, expanded: isSelected }}
      onPress={onPress}
      style={({ pressed }) => [{ opacity: pressed ? 0.72 : 1 }]}>
      <SurfaceCard tone={isGeneral ? 'accentMuted' : isSelected ? 'primaryMuted' : 'backgroundElement'}>
        <View style={styles.scopeHeader}>
          {avatarUri ? (
            <Avatar name={title} uri={avatarUri} size={40} />
          ) : (
            <View
              style={[
                styles.scopeIcon,
                {
                  backgroundColor: isGeneral ? theme.background : theme.highlightMuted,
                },
              ]}>
              <ThemedText type="smallBold">{isGeneral ? 'G' : title.slice(0, 1).toUpperCase()}</ThemedText>
            </View>
          )}
          <View style={styles.scopeCopy}>
            <ThemedText type="smallBold">{title}</ThemedText>
            {subtitle ? (
              <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                {subtitle}
              </ThemedText>
            ) : null}
          </View>
        </View>
        {children}
      </SurfaceCard>
    </Pressable>
  );
}

function ForecastPreview({ preview }: { preview: ForecastRetrievedData | null }) {
  const theme = useTheme();

  if (!preview) {
    return (
      <View style={styles.previewBlock}>
        <ThemedText type="small" themeColor="textSecondary">
          Loading summary...
        </ThemedText>
      </View>
    );
  }

  if (preview.place.id === null) {
    return (
      <View style={styles.previewBlock}>
        <ThemedText type="smallBold">Life updates</ThemedText>
        {preview.lifeItems.length > 0 ? (
          preview.lifeItems.map((item) => (
            <ThemedText key={item.id} type="small" themeColor="textSecondary" selectable>
              {item.content}
            </ThemedText>
          ))
        ) : (
          <ThemedText type="small" themeColor="textSecondary">
            No current life updates yet.
          </ThemedText>
        )}
      </View>
    );
  }

  const conversationCount = preview.people.reduce((count, person) => count + person.conversations.length, 0);

  return (
    <View style={styles.previewBlock}>
      <View style={styles.previewGrid}>
        <View style={[styles.previewMetric, { backgroundColor: theme.background, borderColor: theme.border }]}>
          <ThemedText type="smallBold">{preview.people.length}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Linked people
          </ThemedText>
        </View>
        <View style={[styles.previewMetric, { backgroundColor: theme.background, borderColor: theme.border }]}>
          <ThemedText type="smallBold">{conversationCount}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Recent conversations
          </ThemedText>
        </View>
      </View>

      <ThemedText type="smallBold">People</ThemedText>
      {preview.people.length > 0 ? (
        preview.people.map((person) => (
          <ThemedText key={person.id} type="small" themeColor="textSecondary">
            {person.name}
            {person.conversations.length > 0 ? `: ${person.conversations[0]?.summary ?? 'recent context saved'}` : ''}
          </ThemedText>
        ))
      ) : (
        <ThemedText type="small" themeColor="textSecondary">
          No people are linked to this place yet.
        </ThemedText>
      )}

      {preview.lifeItems.length > 0 ? (
        <>
          <ThemedText type="smallBold">Relevant life topics</ThemedText>
          {preview.lifeItems.slice(0, 3).map((item) => (
            <ThemedText key={item.id} type="small" themeColor="textSecondary" selectable>
              {item.content}
            </ThemedText>
          ))}
        </>
      ) : null}
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
  form: {
    gap: Spacing.three,
  },
  field: {
    gap: Spacing.one,
  },
  placeList: {
    gap: Spacing.two,
  },
  scopeHeader: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  scopeIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  scopeCopy: {
    flex: 1,
    minWidth: 0,
    gap: Spacing.one,
  },
  previewBlock: {
    gap: Spacing.two,
  },
  previewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  previewMetric: {
    minWidth: 132,
    flexGrow: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.small,
    borderCurve: 'continuous',
    padding: Spacing.two,
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
  playbackCard: {
    gap: Spacing.three,
  },
  playbackTitle: {
    gap: Spacing.one,
  },
  playbackDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  secondaryButton: {
    flexGrow: 1,
    minHeight: 48,
    borderRadius: Radius.small,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
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
