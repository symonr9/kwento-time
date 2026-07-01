import { Link, router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { EmptyState } from '@/components/ui/empty-state';
import { ExpandableSection } from '@/components/ui/expandable-section';
import { SurfaceCard } from '@/components/ui/surface-card';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { getConversationDetails } from '@/db/queries/conversations';
import { resolveFollowUp } from '@/db/queries/follow-ups';
import { useTheme } from '@/hooks/use-theme';

type ConversationDetails = Awaited<ReturnType<typeof getConversationDetails>>;
type ConversationDetailsState = Omit<ConversationDetails, 'conversation'> & {
  conversation: ConversationDetails['conversation'] | null;
};

const initialDetails: ConversationDetailsState = {
  conversation: null,
  followUps: [],
  topics: [],
};

function formatShortDate(value: Date | null) {
  if (!value) {
    return 'Not yet';
  }

  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(value);
}

export default function ConversationDetailsScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id?: string }>();
  const conversationId = Number(params.id);
  const [details, setDetails] = useState<ConversationDetailsState>(initialDetails);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadConversation = useCallback(
    async (isActive = true) => {
      if (!Number.isInteger(conversationId) || conversationId <= 0) {
        setError('Invalid conversation.');
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const nextDetails = await getConversationDetails(conversationId);

        if (isActive) {
          setDetails(nextDetails);
          setError(nextDetails.conversation ? null : 'Conversation not found.');
        }
      } catch (err) {
        if (isActive) {
          setError(err instanceof Error ? err.message : 'Unable to load conversation.');
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    },
    [conversationId],
  );

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      void loadConversation(isActive);

      return () => {
        isActive = false;
      };
    }, [loadConversation]),
  );

  async function handleResolveFollowUp(id: number) {
    setError(null);

    try {
      await resolveFollowUp(id);
      await loadConversation();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to resolve follow-up.');
    }
  }

  const { conversation, followUps, topics } = details;

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
              <ThemedText themeColor="textSecondary">Loading conversation...</ThemedText>
            </SurfaceCard>
          ) : null}

          {error ? (
            <SurfaceCard tone="accentMuted" style={styles.stateCard}>
              <ThemedText selectable>{error}</ThemedText>
            </SurfaceCard>
          ) : null}

          {!isLoading && !error && conversation ? (
            <>
              <Link
                href={{ pathname: '/conversations/[id]/edit', params: { id: String(conversation.id) } }}
                asChild>
                <Pressable
                  accessibilityRole="button"
                  style={({ pressed }) => [
                    styles.secondaryButton,
                    {
                      backgroundColor: theme.backgroundSelected,
                      opacity: pressed ? 0.72 : 1,
                    },
                  ]}>
                  <ThemedText type="smallBold">Edit conversation</ThemedText>
                </Pressable>
              </Link>

              <SurfaceCard style={styles.heroCard}>
                <View style={[styles.iconBadge, { backgroundColor: theme.primaryMuted }]}>
                  <SymbolView
                    name={{
                      ios: 'bubble.left.and.bubble.right',
                      android: 'forum',
                      web: 'forum',
                    }}
                    size={32}
                    tintColor={theme.text}
                    fallback={<View style={[styles.iconFallback, { backgroundColor: theme.text }]} />}
                  />
                </View>

                <View style={styles.heroCopy}>
                  <ThemedText type="smallBold" themeColor="primary">
                    Conversation
                  </ThemedText>
                  <ThemedText type="title">
                    {conversation.personName ?? 'Conversation note'}
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {formatShortDate(conversation.occurredAt)}
                  </ThemedText>
                </View>
              </SurfaceCard>

              <Section title="Summary">
                <SurfaceCard style={styles.row}>
                  <ThemedText type="small" themeColor="textSecondary" selectable>
                    {conversation.summary ?? 'No summary yet.'}
                  </ThemedText>
                </SurfaceCard>
              </Section>

              <Section title="Capture details" defaultExpanded={false}>
                <SurfaceCard style={styles.row}>
                  <View style={styles.rowHeader}>
                    <ThemedText type="smallBold">Source</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {conversation.source}
                  </ThemedText>
                </View>
                <View style={styles.rowHeader}>
                  <ThemedText type="smallBold">Transcript</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {conversation.transcriptStatus}
                  </ThemedText>
                </View>
                <View style={styles.rowHeader}>
                  <ThemedText type="smallBold">Structure</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {conversation.structureStatus}
                  </ThemedText>
                </View>
                  {conversation.audioUri ? (
                    <ThemedText type="small" themeColor="textSecondary" selectable>
                      Audio: {conversation.audioUri}
                    </ThemedText>
                  ) : null}
                  {conversation.placeId && conversation.placeName ? (
                    <Link
                      href={{ pathname: '/places/[id]', params: { id: String(conversation.placeId) } }}
                      asChild>
                      <Pressable
                        accessibilityRole="button"
                        style={({ pressed }) => [{ opacity: pressed ? 0.72 : 1 }]}>
                        <ThemedText type="smallBold">{conversation.placeName}</ThemedText>
                      </Pressable>
                    </Link>
                  ) : (
                    <ThemedText type="small" themeColor="textSecondary">
                      No place linked.
                    </ThemedText>
                  )}
                </SurfaceCard>
              </Section>

              <Section title="Raw transcript" defaultExpanded={false}>
                <SurfaceCard style={styles.row}>
                  <ThemedText type="small" themeColor="textSecondary" selectable>
                    {conversation.rawTranscript ?? 'No raw transcript saved yet.'}
                  </ThemedText>
                </SurfaceCard>
              </Section>

              {conversation.personId ? (
                <Section title="Person">
                  <Link
                    href={{ pathname: '/people/[id]', params: { id: String(conversation.personId) } }}
                    asChild>
                    <Pressable accessibilityRole="button" style={({ pressed }) => [{ opacity: pressed ? 0.72 : 1 }]}>
                      <SurfaceCard style={styles.row}>
                        <ThemedText type="smallBold">{conversation.personName}</ThemedText>
                        {conversation.personNickname ? (
                          <ThemedText type="small" themeColor="textSecondary">
                            {conversation.personNickname}
                          </ThemedText>
                        ) : null}
                      </SurfaceCard>
                    </Pressable>
                  </Link>
                </Section>
              ) : null}

              <Section
                title="Follow-ups"
                count={followUps.length}
                defaultExpanded={followUps.length > 0}
                action={
                  <Link
                    href={{
                      pathname: '/follow-ups/new',
                      params: {
                        conversationId: String(conversation.id),
                        ...(conversation.personId ? { personId: String(conversation.personId) } : {}),
                      },
                    }}
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
                            <View style={styles.rowHeader}>
                              <ThemedText type="smallBold">
                                {followUp.resolved ? 'Resolved' : 'Open'}
                              </ThemedText>
                              <ThemedText type="small" themeColor="textSecondary">
                                {formatShortDate(followUp.createdAt)}
                              </ThemedText>
                            </View>
                            <ThemedText type="small" themeColor="textSecondary" selectable>
                              {followUp.question}
                            </ThemedText>
                          </View>
                        </Pressable>
                      </Link>
                      {followUp.resolved ? (
                        <ThemedText type="small" themeColor="textSecondary">
                          Resolved {formatShortDate(followUp.resolvedAt)}
                        </ThemedText>
                      ) : (
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
                      )}
                    </SurfaceCard>
                  ))
                ) : (
                  <EmptyText text="No follow-ups from this conversation yet." />
                )}
              </Section>

              <Section
                title="Talking points"
                count={topics.length}
                defaultExpanded={topics.length > 0}
                action={
                  <Link
                    href={{
                      pathname: '/topics/new',
                      params: {
                        conversationId: String(conversation.id),
                        ...(conversation.personId ? { personId: String(conversation.personId) } : {}),
                      },
                    }}
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
                  topics.map((topic) => (
                    <SurfaceCard key={topic.id} style={styles.row}>
                      <View style={styles.rowHeader}>
                        <ThemedText type="smallBold">Talking point</ThemedText>
                        <ThemedText type="small" themeColor="textSecondary">
                          {topic.tone}
                        </ThemedText>
                      </View>
                      <ThemedText type="small" themeColor="textSecondary" selectable>
                        {topic.content}
                      </ThemedText>
                      <ThemedText type="small" themeColor="textSecondary">
                        {topic.resolved ? 'Resolved' : topic.expiryState ?? 'Active'}
                        {topic.expiresAt ? ` until ${formatShortDate(topic.expiresAt)}` : ''}
                      </ThemedText>
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
                    </SurfaceCard>
                  ))
                ) : (
                  <EmptyText text="No talking points from this conversation yet." />
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
  smallActionButton: {
    minHeight: 32,
    borderRadius: Radius.small,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.two,
  },
  secondaryButton: {
    minHeight: 40,
    borderRadius: Radius.small,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
  },
  stateCard: {
    alignItems: 'center',
  },
});
