import { Link, useFocusEffect } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/ui/surface-card';
import { BottomTabInset, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { getConversationsPendingExtraction, getRecentConversations } from '@/db/queries/conversations';
import { getAllOpenFollowUpsWithPeople, resolveFollowUp } from '@/db/queries/follow-ups';
import { getActiveMyLifeItems } from '@/db/queries/my-life';
import {
  getUpcomingReminders,
  setReminderNotificationId,
  upsertReminderForRelated,
} from '@/db/queries/reminder';
import { extendTopicExpiry, getTopicsExpiringSoonWithPeople, resolveTopic } from '@/db/queries/topics';
import type { MyLifeItem, Reminder } from '@/db/schema';
import { useTheme } from '@/hooks/use-theme';
import { ensureNotificationPermissions, scheduleReminderNotification } from '@/services/notifications';

type RecentConversation = Awaited<ReturnType<typeof getRecentConversations>>[number];
type PendingExtraction = Awaited<ReturnType<typeof getConversationsPendingExtraction>>[number];
type OpenFollowUp = Awaited<ReturnType<typeof getAllOpenFollowUpsWithPeople>>[number];
type ExpiringTopic = Awaited<ReturnType<typeof getTopicsExpiringSoonWithPeople>>[number];

function formatShortDate(value: Date) {
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(value);
}

export default function HomeScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [conversations, setConversations] = useState<RecentConversation[]>([]);
  const [pendingExtractions, setPendingExtractions] = useState<PendingExtraction[]>([]);
  const [expiringTopics, setExpiringTopics] = useState<ExpiringTopic[]>([]);
  const [followUps, setFollowUps] = useState<OpenFollowUp[]>([]);
  const [lifeItems, setLifeItems] = useState<MyLifeItem[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isScheduling, setIsScheduling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const loadHome = useCallback(async (isActive = true) => {
    setIsLoading(true);
    setError(null);

    try {
      const [
        conversationRows,
        pendingExtractionRows,
        expiringTopicRows,
        followUpRows,
        lifeRows,
        reminderRows,
      ] = await Promise.all([
        getRecentConversations(10),
        getConversationsPendingExtraction(10),
        getTopicsExpiringSoonWithPeople(new Date(), 10),
        getAllOpenFollowUpsWithPeople(10),
        getActiveMyLifeItems(),
        getUpcomingReminders(),
      ]);

      if (isActive) {
        setConversations(conversationRows);
        setPendingExtractions(pendingExtractionRows);
        setExpiringTopics(expiringTopicRows);
        setFollowUps(followUpRows);
        setLifeItems(lifeRows);
        setReminders(reminderRows.slice(0, 10));
      }
    } catch (err) {
      if (isActive) {
        setError(err instanceof Error ? err.message : 'Unable to load home.');
      }
    } finally {
      if (isActive) {
        setIsLoading(false);
      }
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      void loadHome(isActive);

      return () => {
        isActive = false;
      };
    }, [loadHome]),
  );

  async function handleResolveFollowUp(id: number) {
    setError(null);

    try {
      await resolveFollowUp(id);
      await loadHome();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to resolve follow-up.');
    }
  }

  async function handleExtendTopic(id: number) {
    setError(null);

    try {
      await extendTopicExpiry(id);
      await loadHome();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to extend topic.');
    }
  }

  async function handleResolveTopic(id: number) {
    setError(null);

    try {
      await resolveTopic(id);
      await loadHome();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to resolve topic.');
    }
  }

  function nextReminderDate(index: number) {
    const scheduledAt = new Date();
    scheduledAt.setDate(scheduledAt.getDate() + 1);
    scheduledAt.setHours(9, index * 10, 0, 0);
    return scheduledAt;
  }

  async function handleScheduleReminders() {
    setIsScheduling(true);
    setError(null);
    setNotice(null);

    try {
      const hasPermission = await ensureNotificationPermissions();

      if (!hasPermission) {
        setError('Notification permission is required to schedule reminders.');
        return;
      }

      const reminderInputs = [
        ...followUps.map((followUp, index) => ({
          personId: followUp.personId ?? undefined,
          relatedId: followUp.id,
          scheduledAt: nextReminderDate(index),
          type: 'follow_up' as const,
        })),
        ...expiringTopics.map((topic, index) => ({
          personId: topic.personId ?? undefined,
          relatedId: topic.topicId,
          scheduledAt: nextReminderDate(followUps.length + index),
          type: 'topic_expiry' as const,
        })),
      ];

      let scheduledCount = 0;

      for (const input of reminderInputs) {
        const reminder = await upsertReminderForRelated(input);
        const notificationId = await scheduleReminderNotification(reminder);
        await setReminderNotificationId(reminder.id, notificationId);
        scheduledCount += 1;
      }

      setNotice(`Scheduled ${scheduledCount} reminder${scheduledCount === 1 ? '' : 's'}.`);
      await loadHome();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to schedule reminders.');
    } finally {
      setIsScheduling(false);
    }
  }

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: Math.max(insets.top, Spacing.three) + Spacing.two,
            paddingBottom: BottomTabInset + Spacing.six,
          },
        ]}
        contentInsetAdjustmentBehavior="automatic">
        <View style={styles.inner}>
          <View style={styles.header}>
            <View style={[styles.headerMark, { backgroundColor: theme.primary }]} />
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
          </View>

          <View style={styles.hero}>
            <ThemedText type="smallBold" themeColor="primary">
              Today
            </ThemedText>
            <ThemedText type="title" style={styles.title}>
              Keep the next conversation close.
            </ThemedText>
            <ThemedText themeColor="textSecondary">
              Capture recent conversations and what is current in your own life.
            </ThemedText>
          </View>

          {isLoading ? (
            <SurfaceCard style={styles.stateCard}>
              <ActivityIndicator color={theme.primary} />
              <ThemedText themeColor="textSecondary">Loading home...</ThemedText>
            </SurfaceCard>
          ) : null}

          {error ? (
            <SurfaceCard tone="accentMuted" style={styles.stateCard}>
              <ThemedText selectable>{error}</ThemedText>
            </SurfaceCard>
          ) : null}

          {notice ? (
            <SurfaceCard tone="primaryMuted" style={styles.stateCard}>
              <ThemedText selectable>{notice}</ThemedText>
            </SurfaceCard>
          ) : null}

          {!isLoading && !error ? (
            <>
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <ThemedText type="smallBold">Today at a glance</ThemedText>
                </View>
                <View style={styles.metricGrid}>
                  <SurfaceCard tone="primaryMuted" style={styles.metricCard}>
                    <ThemedText type="smallBold">{followUps.length}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      Follow-ups
                    </ThemedText>
                  </SurfaceCard>
                  <SurfaceCard tone="highlightMuted" style={styles.metricCard}>
                    <ThemedText type="smallBold">{expiringTopics.length}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      Topics to review
                    </ThemedText>
                  </SurfaceCard>
                  <SurfaceCard tone="accentMuted" style={styles.metricCard}>
                    <ThemedText type="smallBold">{conversations.length}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      Recent notes
                    </ThemedText>
                  </SurfaceCard>
                  <SurfaceCard tone="primaryMuted" style={styles.metricCard}>
                    <ThemedText type="smallBold">{pendingExtractions.length}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      Need structure
                    </ThemedText>
                  </SurfaceCard>
                </View>
                <View style={styles.quickActions}>
                  <Link href="/conversations/new" asChild>
                    <Pressable
                      accessibilityRole="button"
                      style={({ pressed }) => [
                        styles.quickActionButton,
                        {
                          backgroundColor: theme.primary,
                          opacity: pressed ? 0.78 : 1,
                        },
                      ]}>
                      <ThemedText type="smallBold" style={styles.primaryButtonText}>
                        Conversation
                      </ThemedText>
                    </Pressable>
                  </Link>
                  <Link href="/conversations/voice" asChild>
                    <Pressable
                      accessibilityRole="button"
                      style={({ pressed }) => [
                        styles.quickActionButton,
                        {
                          backgroundColor: theme.backgroundSelected,
                          opacity: pressed ? 0.72 : 1,
                        },
                      ]}>
                      <ThemedText type="smallBold">Voice note</ThemedText>
                    </Pressable>
                  </Link>
                  <Link href="/forecast/index" asChild>
                    <Pressable
                      accessibilityRole="button"
                      style={({ pressed }) => [
                        styles.quickActionButton,
                        {
                          backgroundColor: theme.backgroundSelected,
                          opacity: pressed ? 0.72 : 1,
                        },
                      ]}>
                      <ThemedText type="smallBold">Briefing</ThemedText>
                    </Pressable>
                  </Link>
                  <Link href="/my-life/new" asChild>
                    <Pressable
                      accessibilityRole="button"
                      style={({ pressed }) => [
                        styles.quickActionButton,
                        {
                          backgroundColor: theme.backgroundSelected,
                          opacity: pressed ? 0.72 : 1,
                        },
                      ]}>
                      <ThemedText type="smallBold">Life update</ThemedText>
                    </Pressable>
                  </Link>
                  <Pressable
                    accessibilityRole="button"
                    disabled={isScheduling}
                    onPress={handleScheduleReminders}
                    style={({ pressed }) => [
                      styles.quickActionButton,
                      {
                        backgroundColor: theme.backgroundSelected,
                        opacity: pressed || isScheduling ? 0.72 : 1,
                      },
                    ]}>
                    <ThemedText type="smallBold">
                      {isScheduling ? 'Scheduling...' : 'Schedule reminders'}
                    </ThemedText>
                  </Pressable>
                </View>
              </View>

              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <ThemedText type="smallBold">Needs structure</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {pendingExtractions.length}
                  </ThemedText>
                </View>

                {pendingExtractions.length === 0 ? (
                  <SurfaceCard style={styles.stateCard}>
                    <ThemedText type="smallBold">No confirmed transcripts waiting</ThemedText>
                    <ThemedText themeColor="textSecondary">
                      Confirmed transcripts will appear here before topics and follow-ups are saved.
                    </ThemedText>
                  </SurfaceCard>
                ) : (
                  <View style={styles.list}>
                    {pendingExtractions.map((conversation) => (
                      <Link
                        key={conversation.id}
                        href={{
                          pathname: '/conversations/[id]/structure',
                          params: { id: String(conversation.id) },
                        }}
                        asChild>
                        <Pressable
                          accessibilityRole="button"
                          style={({ pressed }) => [{ opacity: pressed ? 0.72 : 1 }]}>
                          <SurfaceCard tone="primaryMuted" style={styles.row}>
                            <View style={styles.rowHeader}>
                              <ThemedText type="smallBold">
                                {conversation.personName ?? 'Transcript'}
                              </ThemedText>
                              <ThemedText type="small" themeColor="textSecondary">
                                {formatShortDate(conversation.occurredAt)}
                              </ThemedText>
                            </View>
                            <ThemedText type="small" themeColor="textSecondary" selectable>
                              {conversation.summary ?? conversation.rawTranscript ?? 'Ready for structure'}
                            </ThemedText>
                            <ThemedText type="small" themeColor="textSecondary">
                              {conversation.source}
                              {conversation.placeName ? ` at ${conversation.placeName}` : ''}
                            </ThemedText>
                          </SurfaceCard>
                        </Pressable>
                      </Link>
                    ))}
                  </View>
                )}
              </View>

              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <ThemedText type="smallBold">Upcoming reminders</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {reminders.length}
                  </ThemedText>
                </View>

                {reminders.length === 0 ? (
                  <SurfaceCard style={styles.stateCard}>
                    <ThemedText type="smallBold">No reminders scheduled</ThemedText>
                    <ThemedText themeColor="textSecondary">
                      Schedule reminders to turn follow-ups and expiring topics into local notifications.
                    </ThemedText>
                  </SurfaceCard>
                ) : (
                  <View style={styles.list}>
                    {reminders.map((reminder) => (
                      <SurfaceCard key={reminder.id} style={styles.row}>
                        <View style={styles.rowHeader}>
                          <ThemedText type="smallBold">
                            {reminder.type === 'follow_up' ? 'Follow-up' : 'Topic review'}
                          </ThemedText>
                          <ThemedText type="small" themeColor="textSecondary">
                            {formatShortDate(reminder.scheduledAt)}
                          </ThemedText>
                        </View>
                        <ThemedText type="small" themeColor="textSecondary">
                          {reminder.notificationId ? 'Scheduled on device' : 'Saved locally'}
                        </ThemedText>
                      </SurfaceCard>
                    ))}
                  </View>
                )}
              </View>

              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <ThemedText type="smallBold">Expiring soon</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {expiringTopics.length}
                  </ThemedText>
                </View>

                {expiringTopics.length === 0 ? (
                  <SurfaceCard style={styles.stateCard}>
                    <ThemedText type="smallBold">No expiring topics</ThemedText>
                    <ThemedText themeColor="textSecondary">
                      Talking points that need review will show up here.
                    </ThemedText>
                  </SurfaceCard>
                ) : (
                  <View style={styles.list}>
                    {expiringTopics.map((item) => (
                      <SurfaceCard key={item.topicId} tone="highlightMuted" style={styles.row}>
                        <View style={styles.rowHeader}>
                          <ThemedText type="smallBold">{item.personName ?? 'Topic'}</ThemedText>
                          <ThemedText type="small" themeColor="textSecondary">
                            {formatShortDate(item.expiresAt)}
                          </ThemedText>
                        </View>
                        <ThemedText type="small" themeColor="textSecondary" selectable>
                          {item.content}
                        </ThemedText>
                        <View style={styles.actionRow}>
                          <Pressable
                            accessibilityRole="button"
                            onPress={() => void handleExtendTopic(item.topicId)}
                            style={({ pressed }) => [
                              styles.secondaryButton,
                              {
                                backgroundColor: theme.backgroundElement,
                                opacity: pressed ? 0.72 : 1,
                              },
                            ]}>
                            <ThemedText type="smallBold">Still relevant</ThemedText>
                          </Pressable>
                          <Pressable
                            accessibilityRole="button"
                            onPress={() => void handleResolveTopic(item.topicId)}
                            style={({ pressed }) => [
                              styles.secondaryButton,
                              {
                                backgroundColor: theme.backgroundElement,
                                opacity: pressed ? 0.72 : 1,
                              },
                            ]}>
                            <ThemedText type="smallBold">Resolve</ThemedText>
                          </Pressable>
                        </View>
                      </SurfaceCard>
                    ))}
                  </View>
                )}
              </View>

              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <ThemedText type="smallBold">Open follow-ups</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {followUps.length}
                  </ThemedText>
                </View>

                {followUps.length === 0 ? (
                  <SurfaceCard style={styles.stateCard}>
                    <ThemedText type="smallBold">No open follow-ups</ThemedText>
                    <ThemedText themeColor="textSecondary">
                      Add questions from a person or conversation to close the loop later.
                    </ThemedText>
                  </SurfaceCard>
                ) : (
                  <View style={styles.list}>
                    {followUps.map((followUp) => (
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
                                  {followUp.personName ?? 'Follow-up'}
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
                    ))}
                  </View>
                )}
              </View>

              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <ThemedText type="smallBold">Recent conversations</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {conversations.length}
                  </ThemedText>
                </View>

                {conversations.length === 0 ? (
                  <SurfaceCard style={styles.stateCard}>
                    <ThemedText type="smallBold">No conversations yet</ThemedText>
                    <ThemedText themeColor="textSecondary">
                      Tap add and choose conversation to record the first note.
                    </ThemedText>
                  </SurfaceCard>
                ) : (
                  <View style={styles.list}>
                    {conversations.map((conversation) => (
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
                                {conversation.personName ?? 'Conversation'}
                              </ThemedText>
                              <ThemedText type="small" themeColor="textSecondary">
                                {formatShortDate(conversation.occurredAt)}
                              </ThemedText>
                            </View>
                            <ThemedText type="small" themeColor="textSecondary" selectable>
                              {conversation.summary ?? 'No summary yet'}
                            </ThemedText>
                            <ThemedText type="small" themeColor="textSecondary">
                              {conversation.source}
                              {conversation.placeName ? ` at ${conversation.placeName}` : ''}
                            </ThemedText>
                          </SurfaceCard>
                        </Pressable>
                      </Link>
                    ))}
                  </View>
                )}
              </View>

              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <ThemedText type="smallBold">Life topics</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {lifeItems.length}
                  </ThemedText>
                </View>

                {lifeItems.length === 0 ? (
                  <SurfaceCard style={styles.stateCard}>
                    <ThemedText type="smallBold">No life topics yet</ThemedText>
                    <ThemedText themeColor="textSecondary">
                      Tap add and choose life update to save what is happening recently.
                    </ThemedText>
                  </SurfaceCard>
                ) : (
                  <View style={styles.list}>
                    {lifeItems.map((item) => (
                      <SurfaceCard key={item.id} style={styles.row}>
                        <View style={styles.rowHeader}>
                          <ThemedText type="smallBold">
                            {item.tone[0].toUpperCase()}
                            {item.tone.slice(1)}
                          </ThemedText>
                          <ThemedText type="small" themeColor="textSecondary">
                            {formatShortDate(item.createdAt)}
                          </ThemedText>
                        </View>
                        <ThemedText type="small" themeColor="textSecondary" selectable>
                          {item.content}
                        </ThemedText>
                      </SurfaceCard>
                    ))}
                  </View>
                )}
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
  title: {
    fontSize: 36,
    lineHeight: 42,
    letterSpacing: 0,
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
  list: {
    gap: Spacing.two,
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
  quickActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  quickActionButton: {
    flexGrow: 1,
    minHeight: 48,
    borderRadius: Radius.medium,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
  },
  row: {
    minHeight: 84,
    justifyContent: 'center',
  },
  linkedRowContent: {
    gap: Spacing.two,
  },
  rowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
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
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  primaryButtonText: {
    color: '#FFFFFF',
  },
  stateCard: {
    alignItems: 'center',
  },
});
