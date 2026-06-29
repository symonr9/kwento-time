import { Link, router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { AvatarPreview } from '@/components/ui/avatar-preview';
import { EmptyState } from '@/components/ui/empty-state';
import { ExpandableSection } from '@/components/ui/expandable-section';
import { SurfaceCard } from '@/components/ui/surface-card';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { getConversationsForPerson } from '@/db/queries/conversations';
import { getOpenFollowUpsForPerson, resolveFollowUp } from '@/db/queries/follow-ups';
import { getPersonById } from '@/db/queries/people';
import {
  addPersonToPlace,
  getAllPlaces,
  getPlacesForPerson,
  removePersonFromPlace,
  setPrimaryPlaceForPerson,
} from '@/db/queries/places';
import { getTagsForItem } from '@/db/queries/tags';
import {
  extendTopicExpiry,
  getActiveTopicsWithExpiryForPerson,
  resolveTopic,
} from '@/db/queries/topics';
import type { Conversation, FollowUp, Person, Place } from '@/db/schema';
import { useTheme } from '@/hooks/use-theme';

type PersonPlace = Awaited<ReturnType<typeof getPlacesForPerson>>[number];
type PersonTag = Awaited<ReturnType<typeof getTagsForItem>>[number];
type PersonTopic = Awaited<ReturnType<typeof getActiveTopicsWithExpiryForPerson>>[number];

type PersonDetails = {
  allPlaces: Place[];
  person: Person | null;
  conversations: Conversation[];
  followUps: FollowUp[];
  places: PersonPlace[];
  tags: PersonTag[];
  topics: PersonTopic[];
};

const initialDetails: PersonDetails = {
  allPlaces: [],
  person: null,
  conversations: [],
  followUps: [],
  places: [],
  tags: [],
  topics: [],
};

function formatShortDate(value: Date | null) {
  if (!value) {
    return 'Not yet';
  }

  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(value);
}

export default function PersonDetailsScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id?: string }>();
  const personId = Number(params.id);
  const [details, setDetails] = useState<PersonDetails>(initialDetails);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPerson = useCallback(
    async (isActive = true) => {
      if (!Number.isInteger(personId) || personId <= 0) {
        setError('Invalid person.');
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const [person, conversations, followUps, places, allPlaces, tags, topics] = await Promise.all([
          getPersonById(personId),
          getConversationsForPerson(personId),
          getOpenFollowUpsForPerson(personId),
          getPlacesForPerson(personId),
          getAllPlaces(),
          getTagsForItem('person', personId),
          getActiveTopicsWithExpiryForPerson(personId),
        ]);

        if (isActive) {
          setDetails({
            allPlaces,
            person: person ?? null,
            conversations,
            followUps,
            places,
            tags,
            topics,
          });
          setError(person ? null : 'Person not found.');
        }
      } catch (err) {
        if (isActive) {
          setError(err instanceof Error ? err.message : 'Unable to load person.');
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    },
    [personId],
  );

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      void loadPerson(isActive);

      return () => {
        isActive = false;
      };
    }, [loadPerson]),
  );

  const { allPlaces, person, conversations, followUps, places, tags, topics } = details;
  const linkedPlaceIds = new Set(places.map((place) => place.id));
  const availablePlaces = allPlaces.filter((place) => !linkedPlaceIds.has(place.id));

  async function handleResolveFollowUp(id: number) {
    setError(null);

    try {
      await resolveFollowUp(id);
      await loadPerson();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to resolve follow-up.');
    }
  }

  async function handleExtendTopic(id: number) {
    setError(null);

    try {
      await extendTopicExpiry(id);
      await loadPerson();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to extend topic.');
    }
  }

  async function handleResolveTopic(id: number) {
    setError(null);

    try {
      await resolveTopic(id);
      await loadPerson();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to resolve topic.');
    }
  }

  async function handleAddPlace(placeId: number) {
    setError(null);

    try {
      await addPersonToPlace(personId, placeId);
      await loadPerson();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to link place.');
    }
  }

  async function handleRemovePlace(placeId: number) {
    setError(null);

    try {
      await removePersonFromPlace(personId, placeId);
      await loadPerson();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to remove place.');
    }
  }

  async function handleSetPrimaryPlace(placeId: number) {
    setError(null);

    try {
      await setPrimaryPlaceForPerson(personId, placeId);
      await loadPerson();
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
              <ThemedText themeColor="textSecondary">Loading person...</ThemedText>
            </SurfaceCard>
          ) : null}

          {error ? (
            <SurfaceCard tone="accentMuted" style={styles.stateCard}>
              <ThemedText selectable>{error}</ThemedText>
            </SurfaceCard>
          ) : null}

          {!isLoading && !error && person ? (
            <>
              <SurfaceCard style={styles.profileCard}>
                <AvatarPreview name={person.name} uri={person.avatarUri} size={72} />

                <View style={styles.profileCopy}>
                  <ThemedText type="smallBold" themeColor="primary">
                    Person
                  </ThemedText>
                  <ThemedText type="title">
                    {person.name}
                  </ThemedText>
                  {person.nickname ? (
                    <ThemedText themeColor="textSecondary">{person.nickname}</ThemedText>
                  ) : null}
                </View>
              </SurfaceCard>

              <Link href={{ pathname: '/people/[id]/edit', params: { id: String(person.id) } }} asChild>
                <Pressable
                  accessibilityRole="button"
                  style={({ pressed }) => [
                    styles.secondaryButton,
                    {
                      backgroundColor: theme.backgroundSelected,
                      opacity: pressed ? 0.72 : 1,
                    },
                  ]}>
                  <ThemedText type="smallBold">Edit person</ThemedText>
                </Pressable>
              </Link>

              <View style={styles.metricGrid}>
                <SurfaceCard tone="primaryMuted" style={styles.metricCard}>
                  <ThemedText type="smallBold">{person.connectionScore}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    Connection score
                  </ThemedText>
                </SurfaceCard>
                <SurfaceCard tone="accentMuted" style={styles.metricCard}>
                  <ThemedText type="smallBold">{formatShortDate(person.lastContactedAt)}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    Last contacted
                  </ThemedText>
                </SurfaceCard>
              </View>

              <Section title="Profile">
                {person.howWeMet ? <Detail label="How we met" value={person.howWeMet} /> : null}
                {person.birthday ? <Detail label="Birthday" value={person.birthday} /> : null}
                {person.notes ? <Detail label="Notes" value={person.notes} /> : null}
                {tags.length > 0 ? (
                  <View style={styles.chipRow}>
                    {tags.map((tag) => (
                      <View key={tag.id} style={[styles.chip, { backgroundColor: theme.backgroundSelected }]}>
                        <ThemedText type="smallBold">{tag.name}</ThemedText>
                      </View>
                    ))}
                  </View>
                ) : null}
                {!person.howWeMet && !person.birthday && !person.notes && tags.length === 0 ? (
                  <EmptyText text="No profile context yet." />
                ) : null}
              </Section>

              <Section
                title="Open follow-ups"
                count={followUps.length}
                defaultExpanded={followUps.length > 0}
                action={
                  <Link
                    href={{ pathname: '/follow-ups/new', params: { personId: String(person.id) } }}
                    asChild>
                    <Pressable
                      accessibilityRole="button"
                      style={({ pressed }) => [
                        styles.smallActionButton,
                        {
                          backgroundColor: theme.backgroundSelected,
                          opacity: pressed ? 0.72 : 1,
                        },
                      ]}>
                      <ThemedText type="smallBold">Add</ThemedText>
                    </Pressable>
                  </Link>
                }>
                {followUps.length > 0 ? (
                  followUps.map((followUp) => (
                    <SurfaceCard key={followUp.id} style={styles.row}>
                      <Link
                        href={{ pathname: '/follow-ups/[id]', params: { id: String(followUp.id) } }}
                        asChild>
                        <Pressable
                          accessibilityRole="button"
                          style={({ pressed }) => [{ opacity: pressed ? 0.72 : 1 }]}>
                          <View style={styles.linkedRowContent}>
                            <ThemedText type="small" selectable>
                              {followUp.question}
                            </ThemedText>
                            <ThemedText type="small" themeColor="textSecondary">
                              Added {formatShortDate(followUp.createdAt)}
                            </ThemedText>
                          </View>
                        </Pressable>
                      </Link>
                      <Pressable
                        accessibilityRole="button"
                        onPress={() => void handleResolveFollowUp(followUp.id)}
                        style={({ pressed }) => [
                          styles.secondaryButton,
                          {
                            backgroundColor: theme.backgroundSelected,
                            opacity: pressed ? 0.72 : 1,
                          },
                        ]}>
                        <ThemedText type="smallBold">Mark resolved</ThemedText>
                      </Pressable>
                    </SurfaceCard>
                  ))
                ) : (
                  <EmptyText text="No open follow-ups." />
                )}
              </Section>

              <Section
                title="Talking points"
                count={topics.length}
                defaultExpanded={topics.length > 0}
                action={
                  <Link
                    href={{ pathname: '/topics/new', params: { personId: String(person.id) } }}
                    asChild>
                    <Pressable
                      accessibilityRole="button"
                      style={({ pressed }) => [
                        styles.smallActionButton,
                        {
                          backgroundColor: theme.backgroundSelected,
                          opacity: pressed ? 0.72 : 1,
                        },
                      ]}>
                      <ThemedText type="smallBold">Add</ThemedText>
                    </Pressable>
                  </Link>
                }>
                {topics.length > 0 ? (
                  topics.map(({ topic, expiry }) => (
                    <SurfaceCard key={topic.id} style={styles.row}>
                      <View style={styles.rowHeader}>
                        <ThemedText type="smallBold">{topic.category ?? 'Topic'}</ThemedText>
                        <ThemedText type="small" themeColor="textSecondary">
                          Importance {topic.importance}
                        </ThemedText>
                      </View>
                      <ThemedText type="small" themeColor="textSecondary" selectable>
                        {topic.content}
                      </ThemedText>
                      {expiry ? (
                        <ThemedText type="small" themeColor="textSecondary">
                          {expiry.state} until {formatShortDate(expiry.expiresAt)}
                        </ThemedText>
                      ) : null}
                      <View style={styles.actionRow}>
                        <Pressable
                          accessibilityRole="button"
                          onPress={() => void handleExtendTopic(topic.id)}
                          style={({ pressed }) => [
                            styles.secondaryButton,
                            {
                              backgroundColor: theme.backgroundSelected,
                              opacity: pressed ? 0.72 : 1,
                            },
                          ]}>
                          <ThemedText type="smallBold">Still relevant</ThemedText>
                        </Pressable>
                        <Pressable
                          accessibilityRole="button"
                          onPress={() => void handleResolveTopic(topic.id)}
                          style={({ pressed }) => [
                            styles.secondaryButton,
                            {
                              backgroundColor: theme.backgroundSelected,
                              opacity: pressed ? 0.72 : 1,
                            },
                          ]}>
                          <ThemedText type="smallBold">Resolve</ThemedText>
                        </Pressable>
                        <Link href={{ pathname: '/topics/[id]', params: { id: String(topic.id) } }} asChild>
                          <Pressable
                            accessibilityRole="button"
                            style={({ pressed }) => [
                              styles.secondaryButton,
                              {
                                backgroundColor: theme.backgroundSelected,
                                opacity: pressed ? 0.72 : 1,
                              },
                            ]}>
                            <ThemedText type="smallBold">Edit</ThemedText>
                          </Pressable>
                        </Link>
                      </View>
                    </SurfaceCard>
                  ))
                ) : (
                  <EmptyText text="No active talking points." />
                )}
              </Section>

              <Section title="Places" count={places.length} defaultExpanded={false}>
                {places.length > 0 ? (
                  places.map((place) => (
                    <SurfaceCard key={place.id} style={styles.row}>
                      <View style={styles.rowHeader}>
                        <View style={styles.rowTitleWithAvatar}>
                          {place.avatarUri ? <AvatarPreview name={place.name} uri={place.avatarUri} size={28} /> : null}
                          <ThemedText type="smallBold">{place.name}</ThemedText>
                        </View>
                        {place.isPrimary ? (
                          <ThemedText type="smallBold" themeColor="primary">
                            Primary
                          </ThemedText>
                        ) : null}
                      </View>
                      {place.address ? (
                        <ThemedText type="small" themeColor="textSecondary">
                          {place.address}
                        </ThemedText>
                      ) : null}
                      <View style={styles.actionRow}>
                        {!place.isPrimary ? (
                          <Pressable
                            accessibilityRole="button"
                            onPress={() => void handleSetPrimaryPlace(place.id)}
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
                          onPress={() => void handleRemovePlace(place.id)}
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
                  <EmptyText text="No linked places." />
                )}
                {availablePlaces.length > 0 ? (
                  <View style={styles.linkPanel}>
                    <ThemedText type="smallBold">Add place</ThemedText>
                    <View style={styles.chipRow}>
                      {availablePlaces.map((place) => (
                        <Pressable
                          key={place.id}
                          accessibilityRole="button"
                          onPress={() => void handleAddPlace(place.id)}
                          style={({ pressed }) => [
                            styles.chip,
                            {
                              backgroundColor: theme.backgroundSelected,
                              opacity: pressed ? 0.72 : 1,
                            },
                          ]}>
                          {place.avatarUri ? <AvatarPreview name={place.name} uri={place.avatarUri} size={24} /> : null}
                          <ThemedText type="smallBold">{place.name}</ThemedText>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                ) : null}
              </Section>

              <Section title="Recent conversations" count={conversations.length} defaultExpanded={false}>
                {conversations.length > 0 ? (
                  conversations.map((conversation) => (
                    <Link
                      key={conversation.id}
                      href={{
                        pathname: '/conversations/[id]',
                        params: { id: String(conversation.id) },
                      }}
                      asChild>
                      <Pressable accessibilityRole="button" style={({ pressed }) => [{ opacity: pressed ? 0.72 : 1 }]}>
                        <SurfaceCard style={styles.row}>
                          <View style={styles.rowHeader}>
                            <ThemedText type="smallBold">
                              {formatShortDate(conversation.occurredAt)}
                            </ThemedText>
                            <SymbolView
                              name={{ ios: 'bubble.left.and.bubble.right', android: 'forum', web: 'forum' }}
                              size={18}
                              tintColor={theme.textSecondary}
                              fallback={<View style={[styles.symbolFallback, { backgroundColor: theme.textSecondary }]} />}
                            />
                          </View>
                          <ThemedText type="small" themeColor="textSecondary" selectable>
                            {conversation.summary ?? 'No summary yet'}
                          </ThemedText>
                        </SurfaceCard>
                      </Pressable>
                    </Link>
                  ))
                ) : (
                  <EmptyText text="No conversations recorded yet." />
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
  action,
  children,
  count,
  defaultExpanded = true,
  title,
}: {
  action?: React.ReactNode;
  children: React.ReactNode;
  count?: number;
  defaultExpanded?: boolean;
  title: string;
}) {
  return (
    <ExpandableSection action={action} count={count} defaultExpanded={defaultExpanded} title={title}>
      {children}
    </ExpandableSection>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <SurfaceCard style={styles.row}>
      <ThemedText type="smallBold">{label}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary" selectable>
        {value}
      </ThemedText>
    </SurfaceCard>
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
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  profileCopy: {
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
  sectionHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  row: {
    minHeight: 64,
    justifyContent: 'center',
  },
  linkedRowContent: {
    gap: Spacing.two,
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
  linkPanel: {
    gap: Spacing.two,
  },
  smallActionButton: {
    minHeight: 32,
    borderRadius: Radius.small,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.two,
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
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  symbolFallback: {
    width: 18,
    height: 18,
    borderRadius: Radius.small,
  },
  stateCard: {
    alignItems: 'center',
  },
});
