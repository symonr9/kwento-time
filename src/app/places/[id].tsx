import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Avatar } from '@/components/ui/avatar';
import { EmptyState } from '@/components/ui/empty-state';
import { ExpandableSection } from '@/components/ui/expandable-section';
import { SurfaceCard } from '@/components/ui/surface-card';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { getAllPeople } from '@/db/queries/people';
import {
  addPersonToPlace,
  getOpenFollowUpsForPlace,
  getPeopleForPlace,
  getPlaceById,
  getRecentConversationsForPlace,
  removePersonFromPlace,
  setPrimaryPlaceForPerson,
} from '@/db/queries/places';
import type { Person, Place } from '@/db/schema';
import { useTheme } from '@/hooks/use-theme';

type PlacePerson = Awaited<ReturnType<typeof getPeopleForPlace>>[number];
type PlaceConversation = Awaited<ReturnType<typeof getRecentConversationsForPlace>>[number];
type PlaceFollowUp = Awaited<ReturnType<typeof getOpenFollowUpsForPlace>>[number];

type PlaceDetails = {
  allPeople: Person[];
  conversations: PlaceConversation[];
  followUps: PlaceFollowUp[];
  people: PlacePerson[];
  place: Place | null;
};

const initialDetails: PlaceDetails = {
  allPeople: [],
  conversations: [],
  followUps: [],
  people: [],
  place: null,
};

function formatShortDate(value: Date) {
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(value);
}

export default function PlaceDetailsScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id?: string }>();
  const placeId = Number(params.id);
  const [details, setDetails] = useState<PlaceDetails>(initialDetails);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      async function loadPlace() {
        if (!Number.isInteger(placeId) || placeId <= 0) {
          setError('Invalid place.');
          setIsLoading(false);
          return;
        }

        setIsLoading(true);
        setError(null);

        try {
          const [place, people, allPeople, conversations, followUps] = await Promise.all([
            getPlaceById(placeId),
            getPeopleForPlace(placeId),
            getAllPeople(),
            getRecentConversationsForPlace(placeId, 10),
            getOpenFollowUpsForPlace(placeId, 20),
          ]);

          if (isActive) {
            setDetails({
              allPeople,
              conversations,
              followUps,
              people,
              place: place ?? null,
            });
            setError(place ? null : 'Place not found.');
          }
        } catch (err) {
          if (isActive) {
            setError(err instanceof Error ? err.message : 'Unable to load place.');
          }
        } finally {
          if (isActive) {
            setIsLoading(false);
          }
        }
      }

      void loadPlace();

      return () => {
        isActive = false;
      };
    }, [placeId]),
  );

  const { allPeople, conversations, followUps, people, place } = details;
  const linkedPersonIds = new Set(people.map((person) => person.id));
  const availablePeople = allPeople.filter((person) => !linkedPersonIds.has(person.id));
  const primaryPeople = people.filter((person) => person.isPrimary);
  const topFollowUps = followUps.slice(0, 3);
  const topConversations = conversations.slice(0, 3);

  async function loadPlaceDetails() {
    const [nextPlace, nextPeople, nextAllPeople, nextConversations, nextFollowUps] = await Promise.all([
      getPlaceById(placeId),
      getPeopleForPlace(placeId),
      getAllPeople(),
      getRecentConversationsForPlace(placeId, 10),
      getOpenFollowUpsForPlace(placeId, 20),
    ]);

    setDetails({
      allPeople: nextAllPeople,
      conversations: nextConversations,
      followUps: nextFollowUps,
      people: nextPeople,
      place: nextPlace ?? null,
    });
  }

  async function handleAddPerson(personId: number) {
    setError(null);

    try {
      await addPersonToPlace(personId, placeId);
      await loadPlaceDetails();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to link person.');
    }
  }

  async function handleRemovePerson(personId: number) {
    setError(null);

    try {
      await removePersonFromPlace(personId, placeId);
      await loadPlaceDetails();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to remove person.');
    }
  }

  async function handleSetPrimaryPerson(personId: number) {
    setError(null);

    try {
      await setPrimaryPlaceForPerson(personId, placeId);
      await loadPlaceDetails();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to set primary place.');
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

          {isLoading ? (
            <SurfaceCard style={styles.stateCard}>
              <ActivityIndicator color={theme.primary} />
              <ThemedText themeColor="textSecondary">Loading place...</ThemedText>
            </SurfaceCard>
          ) : null}

          {error ? (
            <SurfaceCard tone="accentMuted" style={styles.stateCard}>
              <ThemedText selectable>{error}</ThemedText>
            </SurfaceCard>
          ) : null}

          {!isLoading && !error && place ? (
            <>
              <SurfaceCard style={styles.heroCard}>
                {place.avatarUri ? (
                  <Avatar name={place.name} uri={place.avatarUri} size={72} />
                ) : (
                  <View style={[styles.iconBadge, { backgroundColor: theme.highlightMuted }]}>
                    <SymbolView
                      name={{ ios: 'map', android: 'map', web: 'map' }}
                      size={32}
                      tintColor={theme.text}
                      fallback={<View style={[styles.iconFallback, { backgroundColor: theme.text }]} />}
                    />
                  </View>
                )}

                <View style={styles.heroCopy}>
                  <ThemedText type="smallBold" themeColor="primary">
                    Place Mode
                  </ThemedText>
                  <ThemedText type="title">
                    {place.name}
                  </ThemedText>
                  {place.address ? (
                    <ThemedText themeColor="textSecondary" selectable>
                      {place.address}
                    </ThemedText>
                  ) : null}
                  {place.notes ? (
                    <ThemedText type="small" themeColor="textSecondary" selectable>
                      {place.notes}
                    </ThemedText>
                  ) : null}
                </View>
              </SurfaceCard>

              <Pressable
                accessibilityRole="button"
                onPress={() => router.push({ pathname: '/places/[id]/edit', params: { id: String(place.id) } })}
                style={({ pressed }) => [
                  styles.secondaryButton,
                  {
                    backgroundColor: theme.backgroundSelected,
                    opacity: pressed ? 0.72 : 1,
                  },
                ]}>
                <ThemedText type="smallBold">Edit place</ThemedText>
              </Pressable>

              <View style={styles.metricGrid}>
                <SurfaceCard tone="primaryMuted" style={styles.metricCard}>
                  <ThemedText type="smallBold">{people.length}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    Linked people
                  </ThemedText>
                </SurfaceCard>
                <SurfaceCard tone="accentMuted" style={styles.metricCard}>
                  <ThemedText type="smallBold">{followUps.length}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    Open follow-ups
                  </ThemedText>
                </SurfaceCard>
              </View>

              <Section title="Before you go">
                {people.length === 0 ? (
                  <EmptyText text="No people are linked to this place yet." />
                ) : (
                  <>
                    <SurfaceCard style={styles.row}>
                      <ThemedText type="smallBold">Likely people</ThemedText>
                      <ThemedText type="small" themeColor="textSecondary">
                        {primaryPeople.length > 0
                          ? primaryPeople.map((person) => person.name).join(', ')
                          : people.slice(0, 5).map((person) => person.name).join(', ')}
                      </ThemedText>
                    </SurfaceCard>

                    {topFollowUps.length > 0 ? (
                      <SurfaceCard style={styles.row}>
                        <ThemedText type="smallBold">Ask next</ThemedText>
                        {topFollowUps.map((followUp) => (
                          <ThemedText key={followUp.id} type="small" themeColor="textSecondary" selectable>
                            {followUp.personName}: {followUp.question}
                          </ThemedText>
                        ))}
                      </SurfaceCard>
                    ) : null}

                    {topConversations.length > 0 ? (
                      <SurfaceCard style={styles.row}>
                        <ThemedText type="smallBold">Recent context</ThemedText>
                        {topConversations.map((conversation) => (
                          <ThemedText
                            key={conversation.id}
                            type="small"
                            themeColor="textSecondary"
                            selectable>
                            {conversation.personName}: {conversation.summary ?? 'No summary yet'}
                          </ThemedText>
                        ))}
                      </SurfaceCard>
                    ) : null}
                  </>
                )}
              </Section>

              <Section title="People" count={people.length}>
                {people.length > 0 ? (
                  people.map((person) => (
                    <SurfaceCard key={person.id} style={styles.row}>
                      <View style={styles.rowHeader}>
                        <View style={styles.rowTitleWithAvatar}>
                          {person.avatarUri ? <Avatar name={person.name} uri={person.avatarUri} size={28} /> : null}
                          <ThemedText type="smallBold">{person.name}</ThemedText>
                        </View>
                        {person.isPrimary ? (
                          <ThemedText type="smallBold" themeColor="primary">
                            Primary
                          </ThemedText>
                        ) : null}
                      </View>
                      {person.nickname ? (
                        <ThemedText type="small" themeColor="textSecondary">
                          {person.nickname}
                        </ThemedText>
                      ) : null}
                      <View style={styles.actionRow}>
                        {!person.isPrimary ? (
                          <Pressable
                            accessibilityRole="button"
                            onPress={() => void handleSetPrimaryPerson(person.id)}
                            style={({ pressed }) => [
                              styles.secondaryButton,
                              {
                                backgroundColor: theme.backgroundSelected,
                                opacity: pressed ? 0.72 : 1,
                              },
                            ]}>
                            <ThemedText type="smallBold">Make primary</ThemedText>
                          </Pressable>
                        ) : null}
                        <Pressable
                          accessibilityRole="button"
                          onPress={() => void handleRemovePerson(person.id)}
                          style={({ pressed }) => [
                            styles.secondaryButton,
                            {
                              backgroundColor: theme.backgroundSelected,
                              opacity: pressed ? 0.72 : 1,
                            },
                          ]}>
                          <ThemedText type="smallBold">Remove</ThemedText>
                        </Pressable>
                      </View>
                    </SurfaceCard>
                  ))
                ) : (
                  <EmptyText text="No linked people yet." />
                )}
                {availablePeople.length > 0 ? (
                  <View style={styles.linkPanel}>
                    <ThemedText type="smallBold">Add person</ThemedText>
                    <View style={styles.chipRow}>
                      {availablePeople.map((person) => (
                        <Pressable
                          key={person.id}
                          accessibilityRole="button"
                          onPress={() => void handleAddPerson(person.id)}
                          style={({ pressed }) => [
                            styles.chip,
                            {
                              backgroundColor: theme.backgroundSelected,
                              opacity: pressed ? 0.72 : 1,
                            },
                          ]}>
                          {person.avatarUri ? <Avatar name={person.name} uri={person.avatarUri} size={24} /> : null}
                          <ThemedText type="smallBold">{person.name}</ThemedText>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                ) : null}
              </Section>

              <Section title="Open follow-ups" count={followUps.length} defaultExpanded={false}>
                {followUps.length > 0 ? (
                  followUps.map((followUp) => (
                    <SurfaceCard key={followUp.id} style={styles.row}>
                      <View style={styles.rowHeader}>
                        <ThemedText type="smallBold">{followUp.personName}</ThemedText>
                        <ThemedText type="small" themeColor="textSecondary">
                          {formatShortDate(followUp.createdAt)}
                        </ThemedText>
                      </View>
                      <ThemedText type="small" themeColor="textSecondary" selectable>
                        {followUp.question}
                      </ThemedText>
                    </SurfaceCard>
                  ))
                ) : (
                  <EmptyText text="No open follow-ups for this place." />
                )}
              </Section>

              <Section title="Recent conversations" count={conversations.length} defaultExpanded={false}>
                {conversations.length > 0 ? (
                  conversations.map((conversation) => (
                    <SurfaceCard key={conversation.id} style={styles.row}>
                      <View style={styles.rowHeader}>
                        <ThemedText type="smallBold">{conversation.personName}</ThemedText>
                        <ThemedText type="small" themeColor="textSecondary">
                          {formatShortDate(conversation.occurredAt)}
                        </ThemedText>
                      </View>
                      <ThemedText type="small" themeColor="textSecondary" selectable>
                        {conversation.summary ?? 'No summary yet'}
                      </ThemedText>
                    </SurfaceCard>
                  ))
                ) : (
                  <EmptyText text="No recent conversations for linked people." />
                )}
              </Section>
            </>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

function Section({
  children,
  count,
  defaultExpanded = true,
  title,
}: {
  children: React.ReactNode;
  count?: number;
  defaultExpanded?: boolean;
  title: string;
}) {
  return (
    <ExpandableSection count={count} defaultExpanded={defaultExpanded} title={title}>
      {children}
    </ExpandableSection>
  );
}

function EmptyText({ text }: { text: string }) {
  return <EmptyState title={text} />;
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
  heroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  iconBadge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconFallback: {
    width: 32,
    height: 32,
    borderRadius: Radius.small,
  },
  heroCopy: {
    flex: 1,
    minWidth: 0,
    gap: Spacing.one,
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
    gap: Spacing.two,
  },
  sectionHeader: {
    minHeight: 32,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  row: {
    minHeight: 64,
    justifyContent: 'center',
  },
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  rowTitleWithAvatar: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  secondaryButton: {
    flexGrow: 1,
    minHeight: 40,
    borderRadius: Radius.small,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
  },
  linkPanel: {
    gap: Spacing.two,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  chip: {
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    borderRadius: Radius.small,
    borderCurve: 'continuous',
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
  },
  stateCard: {
    alignItems: 'center',
  },
});
