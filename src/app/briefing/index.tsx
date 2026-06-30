import { router, useFocusEffect } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Avatar } from '@/components/ui/avatar';
import { AvatarPreview } from '@/components/ui/avatar-preview';
import { SegmentedField } from '@/components/ui/form-controls';
import { HorizontalFilterChipRow } from '@/components/ui/horizontal-filter-chip-row';
import { SurfaceCard } from '@/components/ui/surface-card';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import {
  getBriefingRetrieval,
  getCustomBriefingRetrieval,
  type BriefingRetrievedData,
} from '@/db/queries/briefing';
import { getPeopleListSummaries } from '@/db/queries/people';
import { getAllPlaces } from '@/db/queries/places';
import { getAllTags, getItemTagLinks } from '@/db/queries/tags';
import type { Place, Tag } from '@/db/schema';
import {
  buildBriefingContext,
  narrateBriefing,
  scoreBriefingData,
  type BriefingContext,
  type BriefingLength,
} from '@/features/briefing';
import { useTheme } from '@/hooks/use-theme';
import {
  pauseBriefingSpeech,
  resumeBriefingSpeech,
  speakBriefingScript,
  stopBriefingSpeech,
} from '@/services/speech';

const lengthOptions: { label: string; value: BriefingLength }[] = [
  { label: 'Short', value: 'short' },
  { label: 'Medium', value: 'medium' },
  { label: 'Long', value: 'long' },
];

type PlaybackStatus = 'idle' | 'paused' | 'playing';
type BriefingSetupMode = 'custom' | 'place' | null;
type PersonListItem = Awaited<ReturnType<typeof getPeopleListSummaries>>[number];

export default function BriefingScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [places, setPlaces] = useState<Place[]>([]);
  const [people, setPeople] = useState<PersonListItem[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [personTagLinks, setPersonTagLinks] = useState<{ itemId: number; tagId: number }[]>([]);
  const [setupMode, setSetupMode] = useState<BriefingSetupMode>(null);
  const [selectedPlaceId, setSelectedPlaceId] = useState<number | null>(null);
  const [selectedPersonIds, setSelectedPersonIds] = useState<number[]>([]);
  const [includeLifeUpdates, setIncludeLifeUpdates] = useState(true);
  const [personSearch, setPersonSearch] = useState('');
  const [selectedTagId, setSelectedTagId] = useState<number | null>(null);
  const [length, setLength] = useState<BriefingLength>('medium');
  const [context, setContext] = useState<BriefingContext | null>(null);
  const [preview, setPreview] = useState<BriefingRetrievedData | null>(null);
  const [script, setScript] = useState<string | null>(null);
  const [playbackStatus, setPlaybackStatus] = useState<PlaybackStatus>('idle');
  const [playbackDurationSeconds, setPlaybackDurationSeconds] = useState(0);
  const [playbackElapsedSeconds, setPlaybackElapsedSeconds] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isSpeaking = playbackStatus === 'playing';
  const isPaused = playbackStatus === 'paused';
  const playbackProgress =
    playbackDurationSeconds > 0 ? Math.min(1, playbackElapsedSeconds / playbackDurationSeconds) : 0;
  const remainingSeconds = Math.max(0, playbackDurationSeconds - playbackElapsedSeconds);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      async function loadBriefingOptions() {
        setIsLoading(true);
        setError(null);

        try {
          const [placeRows, personRows, tagRows, tagLinkRows] = await Promise.all([
            getAllPlaces(),
            getPeopleListSummaries(),
            getAllTags(),
            getItemTagLinks('person'),
          ]);
          if (isActive) {
            setPlaces(placeRows);
            setPeople(personRows);
            setTags(tagRows);
            setPersonTagLinks(tagLinkRows);
            setSelectedPlaceId((current) => current ?? null);
          }
        } catch (err) {
          if (isActive) {
            setError(err instanceof Error ? err.message : 'Unable to load briefing options.');
          }
        } finally {
          if (isActive) {
            setIsLoading(false);
          }
        }
      }

      void loadBriefingOptions();

      return () => {
        isActive = false;
      };
    }, []),
  );

  useEffect(() => {
    return () => {
      void stopBriefingSpeech();
    };
  }, []);

  useEffect(() => {
    if (playbackStatus !== 'playing' || playbackDurationSeconds <= 0) {
      return undefined;
    }

    const interval = setInterval(() => {
      setPlaybackElapsedSeconds((current) => Math.min(playbackDurationSeconds, current + 1));
    }, 1000);

    return () => clearInterval(interval);
  }, [playbackDurationSeconds, playbackStatus]);

  useEffect(() => {
    let isActive = true;

    async function loadPreview() {
      if (isLoading) {
        return;
      }

      if (setupMode !== 'place' || selectedPlaceId === null) {
        setPreview(null);
        return;
      }

      setError(null);

      try {
        const generatedAt = new Date();
        const nextPreview = await getBriefingRetrieval(selectedPlaceId, generatedAt);

        if (isActive) {
          setPreview(nextPreview);
        }
      } catch (err) {
        if (isActive) {
          setError(err instanceof Error ? err.message : 'Unable to load briefing preview.');
        }
      }
    }

    void loadPreview();

    return () => {
      isActive = false;
    };
  }, [isLoading, selectedPlaceId, setupMode]);

  const filteredPeople = people.filter((person) => {
    const query = personSearch.trim().toLowerCase();
    const personTagIds = personTagLinks.filter((link) => link.itemId === person.id).map((link) => link.tagId);
    const personTagNames = tags
      .filter((tag) => personTagIds.includes(tag.id))
      .map((tag) => tag.name);
    const matchesTag = selectedTagId === null || personTagIds.includes(selectedTagId);

    if (!matchesTag) return false;
    if (!query) return true;

    return [
      person.name,
      person.nickname,
      person.howWeMet,
      person.birthday,
      person.notes,
      person.primaryPlaceName,
      ...personTagNames,
    ]
      .filter(Boolean)
      .some((value) => value?.toLowerCase().includes(query));
  });

  function toggleSelectedPerson(personId: number) {
    setSelectedPersonIds((current) =>
      current.includes(personId) ? current.filter((id) => id !== personId) : [...current, personId],
    );
  }

  async function playScript(nextScript: string, durationSeconds: number) {
    setError(null);
    setPlaybackDurationSeconds(durationSeconds);
    setPlaybackElapsedSeconds(0);
    setPlaybackStatus('idle');

    try {
      await speakBriefingScript(nextScript, {
        onDone: () => {
          setPlaybackElapsedSeconds(durationSeconds);
          setPlaybackStatus('idle');
        },
        onError: (err) => {
          setPlaybackStatus('idle');
          setError(err.message);
        },
        onStart: () => setPlaybackStatus('playing'),
        onStopped: () => setPlaybackStatus('idle'),
      });
    } catch (err) {
      setPlaybackStatus('idle');
      setError(err instanceof Error ? err.message : 'Unable to play briefing.');
    }
  }

  async function handleStopSpeech() {
    try {
      await stopBriefingSpeech();
      setPlaybackStatus('idle');
      setPlaybackElapsedSeconds(0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to stop playback.');
    }
  }

  async function handleReplay() {
    if (script && context) {
      await playScript(script, context.length.seconds);
    }
  }

  async function handlePauseResume() {
    try {
      if (isPaused) {
        await resumeBriefingSpeech();
        setPlaybackStatus('playing');
      } else if (isSpeaking) {
        await pauseBriefingSpeech();
        setPlaybackStatus('paused');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update playback.');
    }
  }

  async function handleGenerate() {
    const generatedAt = new Date();
    setIsGenerating(true);
    setError(null);

    try {
      if (setupMode === null) {
        setError('Choose how you want to build this briefing.');
        return;
      }

      if (setupMode === 'place' && selectedPlaceId === null) {
        setError('Choose a place for this briefing.');
        return;
      }

      if (setupMode === 'custom' && selectedPersonIds.length === 0 && !includeLifeUpdates) {
        setError('Choose at least one person or include life updates.');
        return;
      }

      const selectedPlace = selectedPlaceId;
      const retrieved =
        setupMode === 'place' && selectedPlace !== null
          ? await getBriefingRetrieval(selectedPlace, generatedAt)
          : await getCustomBriefingRetrieval({
              generatedAt,
              includeLifeItems: includeLifeUpdates,
              personIds: selectedPersonIds,
            });
      const scored = scoreBriefingData(retrieved, generatedAt);
      const nextContext = buildBriefingContext(retrieved, scored, length);
      const nextScript = narrateBriefing(nextContext);
      setContext(nextContext);
      setScript(nextScript);
      await playScript(nextScript, nextContext.length.seconds);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to generate briefing.');
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
            <ThemedText type="subtitle" themeColor="primary">
              Briefing
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
                <ThemedText type="smallBold">Build briefing</ThemedText>
                <View style={styles.modeGrid}>
                  <BriefingModeCard
                    isSelected={setupMode === 'place'}
                    title="Select by Place"
                    subtitle="Pick one known place and include everyone linked there."
                    onPress={() => setSetupMode('place')}
                  />
                  <BriefingModeCard
                    isSelected={setupMode === 'custom'}
                    title="Create your own"
                    subtitle="Choose individual people and whether to include life updates."
                    onPress={() => setSetupMode('custom')}
                  />
                </View>
              </View>

              {setupMode === 'place' ? (
                <View style={styles.field}>
                  <ThemedText type="smallBold">Choose a place</ThemedText>
                  <View style={styles.placeList}>
                    {places.map((place) => (
                      <BriefingScopeCard
                        key={place.id}
                        avatarUri={place.avatarUri}
                        isSelected={selectedPlaceId === place.id}
                        title={place.name}
                        subtitle={place.address}
                        onPress={() => setSelectedPlaceId(place.id)}>
                        {selectedPlaceId === place.id ? <BriefingPreview preview={preview} /> : null}
                      </BriefingScopeCard>
                    ))}
                  </View>
                </View>
              ) : null}

              {setupMode === 'custom' ? (
                <View style={styles.field}>
                  <ThemedText type="smallBold">Choose people</ThemedText>
                  <TextInput
                    value={personSearch}
                    onChangeText={setPersonSearch}
                    placeholder="Search people"
                    placeholderTextColor={theme.textSecondary}
                    autoCapitalize="none"
                    style={[
                      styles.searchInput,
                      {
                        backgroundColor: theme.background,
                        borderColor: theme.border,
                        color: theme.text,
                      },
                    ]}
                  />
                  <HorizontalFilterChipRow
                    selectedValue={selectedTagId}
                    onChange={setSelectedTagId}
                    options={[
                      { label: 'Any tag', value: null },
                      ...tags.map((tag) => ({ label: tag.name, value: tag.id })),
                    ]}
                  />
                  <CustomLifeUpdateOption selected={includeLifeUpdates} onPress={() => setIncludeLifeUpdates((v) => !v)} />
                  <View style={styles.customPeopleList}>
                    {filteredPeople.map((person) => (
                      <CustomPersonOption
                        key={person.id}
                        person={person}
                        selected={selectedPersonIds.includes(person.id)}
                        onPress={() => toggleSelectedPerson(person.id)}
                      />
                    ))}
                  </View>
                  {people.length === 0 ? (
                    <ThemedText type="small" themeColor="textSecondary">
                      Add people before creating a people-based briefing.
                    </ThemedText>
                  ) : filteredPeople.length === 0 ? (
                    <ThemedText type="small" themeColor="textSecondary">
                      No people match this search or tag.
                    </ThemedText>
                  ) : null}
                </View>
              ) : null}

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
                      {isSpeaking ? 'Speaking now' : isPaused ? 'Paused' : 'Ready'}
                    </ThemedText>
                  </View>
                  <View
                    style={[
                      styles.playbackDot,
                      { backgroundColor: isSpeaking ? theme.primary : theme.textSecondary },
                    ]}
                  />
                </View>
                <View style={styles.progressArea}>
                  <View style={[styles.progressTrack, { backgroundColor: theme.border }]}>
                    <View
                      style={[
                        styles.progressFill,
                        {
                          backgroundColor: theme.primary,
                          width: `${playbackProgress * 100}%`,
                        },
                      ]}
                    />
                  </View>
                  <ThemedText type="small" themeColor="textSecondary">
                    {isSpeaking || isPaused
                      ? `${remainingSeconds}s remaining`
                      : `${context.length.seconds}s narration target`}
                  </ThemedText>
                </View>
                <View style={styles.actionRow}>
                  <Pressable
                    accessibilityRole="button"
                    disabled={!isSpeaking && !isPaused}
                    onPress={handlePauseResume}
                    style={({ pressed }) => [
                      styles.secondaryButton,
                      {
                        backgroundColor: theme.backgroundSelected,
                        opacity: pressed || (!isSpeaking && !isPaused) ? 0.72 : 1,
                      },
                    ]}>
                    <ThemedText type="smallBold">{isPaused ? 'Resume' : 'Pause'}</ThemedText>
                  </Pressable>
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

function BriefingModeCard({
  isSelected,
  onPress,
  subtitle,
  title,
}: {
  isSelected: boolean;
  onPress: () => void;
  subtitle: string;
  title: string;
}) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: isSelected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.modeCard,
        {
          backgroundColor: isSelected ? theme.primaryMuted : theme.backgroundElement,
          borderColor: isSelected ? theme.primary : theme.border,
          opacity: pressed ? 0.72 : 1,
        },
      ]}>
      <ThemedText type="smallBold">{title}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {subtitle}
      </ThemedText>
    </Pressable>
  );
}

function CustomLifeUpdateOption({ onPress, selected }: { onPress: () => void; selected: boolean }) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.customOption,
        {
          backgroundColor: selected ? theme.primaryMuted : theme.backgroundElement,
          borderColor: selected ? theme.primary : theme.border,
          opacity: pressed ? 0.72 : 1,
        },
      ]}>
      <View style={[styles.checkCircle, { backgroundColor: selected ? theme.primary : theme.background }]}>
        {selected ? (
          <SymbolView
            name={{ ios: 'checkmark', android: 'check', web: 'check' }}
            size={14}
            tintColor="#FFFFFF"
            fallback={<ThemedText type="smallBold" style={styles.checkFallback}>✓</ThemedText>}
          />
        ) : null}
      </View>
      <View style={styles.scopeCopy}>
        <ThemedText type="smallBold">Life updates</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Include your current life context in this briefing.
        </ThemedText>
      </View>
    </Pressable>
  );
}

function CustomPersonOption({
  onPress,
  person,
  selected,
}: {
  onPress: () => void;
  person: PersonListItem;
  selected: boolean;
}) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.customOption,
        {
          backgroundColor: selected ? theme.primaryMuted : theme.backgroundElement,
          borderColor: selected ? theme.primary : theme.border,
          opacity: pressed ? 0.72 : 1,
        },
      ]}>
      <AvatarPreview name={person.name} uri={person.avatarUri} size={44} />
      <View style={styles.scopeCopy}>
        <ThemedText type="smallBold">{person.name}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {person.primaryPlaceName ?? `${person.talkingPointsCount} talking points`}
        </ThemedText>
      </View>
      <View style={[styles.checkCircle, { backgroundColor: selected ? theme.primary : theme.background }]}>
        {selected ? (
          <SymbolView
            name={{ ios: 'checkmark', android: 'check', web: 'check' }}
            size={14}
            tintColor="#FFFFFF"
            fallback={<ThemedText type="smallBold" style={styles.checkFallback}>✓</ThemedText>}
          />
        ) : null}
      </View>
    </Pressable>
  );
}

function BriefingScopeCard({
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

function BriefingPreview({ preview }: { preview: BriefingRetrievedData | null }) {
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
    paddingBottom: Spacing.three,
  },
  form: {
    gap: Spacing.three,
  },
  field: {
    gap: Spacing.one,
  },
  modeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  modeCard: {
    flexGrow: 1,
    width: 148,
    minHeight: 96,
    justifyContent: 'center',
    gap: Spacing.one,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.small,
    borderCurve: 'continuous',
    padding: Spacing.three,
  },
  placeList: {
    gap: Spacing.two,
  },
  customPeopleList: {
    gap: Spacing.two,
  },
  customOption: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.small,
    borderCurve: 'continuous',
    padding: Spacing.two,
  },
  checkCircle: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
  },
  checkFallback: {
    color: '#FFFFFF',
  },
  searchInput: {
    minHeight: 44,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.small,
    borderCurve: 'continuous',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
  },
  scopeHeader: {
    minHeight: 20,
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
  progressArea: {
    gap: Spacing.one,
  },
  progressTrack: {
    height: 8,
    overflow: 'hidden',
    borderRadius: 4,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
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
