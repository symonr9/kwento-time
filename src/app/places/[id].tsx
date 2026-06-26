import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/ui/surface-card';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import {
  getOpenFollowUpsForPlace,
  getPeopleForPlace,
  getPlaceById,
  getRecentConversationsForPlace,
} from '@/db/queries/places';
import type { Place } from '@/db/schema';
import { useTheme } from '@/hooks/use-theme';

type PlacePerson = Awaited<ReturnType<typeof getPeopleForPlace>>[number];
type PlaceConversation = Awaited<ReturnType<typeof getRecentConversationsForPlace>>[number];
type PlaceFollowUp = Awaited<ReturnType<typeof getOpenFollowUpsForPlace>>[number];

type PlaceDetails = {
  conversations: PlaceConversation[];
  followUps: PlaceFollowUp[];
  people: PlacePerson[];
  place: Place | null;
};

const initialDetails: PlaceDetails = {
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
          const [place, people, conversations, followUps] = await Promise.all([
            getPlaceById(placeId),
            getPeopleForPlace(placeId),
            getRecentConversationsForPlace(placeId, 10),
            getOpenFollowUpsForPlace(placeId, 20),
          ]);

          if (isActive) {
            setDetails({
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

  const { conversations, followUps, people, place } = details;
  const primaryPeople = people.filter((person) => person.isPrimary);
  const topFollowUps = followUps.slice(0, 3);
  const topConversations = conversations.slice(0, 3);

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
                <View style={[styles.iconBadge, { backgroundColor: theme.highlightMuted }]}>
                  <SymbolView
                    name={{ ios: 'map', android: 'map', web: 'map' }}
                    size={32}
                    tintColor={theme.text}
                    fallback={<View style={[styles.iconFallback, { backgroundColor: theme.text }]} />}
                  />
                </View>

                <View style={styles.heroCopy}>
                  <ThemedText type="smallBold" themeColor="primary">
                    Place Mode
                  </ThemedText>
                  <ThemedText type="title" style={styles.title}>
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
                        <ThemedText type="smallBold">{person.name}</ThemedText>
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
                    </SurfaceCard>
                  ))
                ) : (
                  <EmptyText text="No linked people yet." />
                )}
              </Section>

              <Section title="Open follow-ups" count={followUps.length}>
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

              <Section title="Recent conversations" count={conversations.length}>
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
  title,
}: {
  children: React.ReactNode;
  count?: number;
  title: string;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <ThemedText type="smallBold">{title}</ThemedText>
        {typeof count === 'number' ? (
          <ThemedText type="small" themeColor="textSecondary">
            {count}
          </ThemedText>
        ) : null}
      </View>
      {children}
    </View>
  );
}

function EmptyText({ text }: { text: string }) {
  return (
    <SurfaceCard style={styles.stateCard}>
      <ThemedText themeColor="textSecondary">{text}</ThemedText>
    </SurfaceCard>
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
  stateCard: {
    alignItems: 'center',
  },
});
