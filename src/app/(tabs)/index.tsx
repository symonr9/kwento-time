import { Link, useFocusEffect, type Href } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { EmptyState } from '@/components/ui/empty-state';
import { ExpandableSection } from '@/components/ui/expandable-section';
import { HorizontalFilterChipRow } from '@/components/ui/horizontal-filter-chip-row';
import { IconActionButton } from '@/components/ui/icon-action-button';
import { SearchField } from '@/components/ui/search-field';
import { SurfaceCard } from '@/components/ui/surface-card';
import { TabScreenHeader } from '@/components/ui/tab-screen-header';
import { BottomTabInset, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { getConversationsPendingStructure, getRecentConversations } from '@/db/queries/conversations';
import { getAllOpenFollowUpsWithPeople, resolveFollowUp } from '@/db/queries/follow-ups';
import { getActiveMyLifeItems, getLatestMyLifeItem } from '@/db/queries/my-life';
import {
  getUpcomingReminders,
  setReminderNotificationId,
  upsertReminderForRelated,
} from '@/db/queries/reminder';
import { getAllTags, getItemTagLinks } from '@/db/queries/tags';
import { extendTopicExpiry, getTopicsExpiringSoonWithPeople, resolveTopic } from '@/db/queries/topics';
import type { MyLifeItem, Reminder, Tag } from '@/db/schema';
import { useTheme } from '@/hooks/use-theme';
import { ensureNotificationPermissions, scheduleReminderNotification } from '@/services/notifications';
import {
  clearExpiredLifeUpdateReminderDismissal,
  dismissLifeUpdateReminderForOneDay,
} from '@/services/preferences';

type RecentConversation = Awaited<ReturnType<typeof getRecentConversations>>[number];
type PendingStructure = Awaited<ReturnType<typeof getConversationsPendingStructure>>[number];
type OpenFollowUp = Awaited<ReturnType<typeof getAllOpenFollowUpsWithPeople>>[number];
type ExpiringTopic = Awaited<ReturnType<typeof getTopicsExpiringSoonWithPeople>>[number];

const briefingHref = '/briefing' as Href;
const icebreakersHref = '/icebreakers' as Href;
const reviewHref = '/review' as Href;
const tagsHref = '/tags' as Href;
const DAY_MS = 24 * 60 * 60 * 1000;

function formatShortDate(value: Date) {
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(value);
}

export default function HomeScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [conversations, setConversations] = useState<RecentConversation[]>([]);
  const [pendingStructures, setPendingStructures] = useState<PendingStructure[]>([]);
  const [expiringTopics, setExpiringTopics] = useState<ExpiringTopic[]>([]);
  const [followUps, setFollowUps] = useState<OpenFollowUp[]>([]);
  const [lifeItems, setLifeItems] = useState<MyLifeItem[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [conversationTagLinks, setConversationTagLinks] = useState<{ itemId: number; tagId: number }[]>([]);
  const [lifeTagLinks, setLifeTagLinks] = useState<{ itemId: number; tagId: number }[]>([]);
  const [conversationSearch, setConversationSearch] = useState('');
  const [conversationPersonId, setConversationPersonId] = useState<number | null>(null);
  const [conversationPlaceId, setConversationPlaceId] = useState<number | null>(null);
  const [conversationTagId, setConversationTagId] = useState<number | null>(null);
  const [lifeSearch, setLifeSearch] = useState('');
  const [lifeTone, setLifeTone] = useState<MyLifeItem['tone'] | null>(null);
  const [lifeTagId, setLifeTagId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isScheduling, setIsScheduling] = useState(false);
  const [showLifeUpdateReminder, setShowLifeUpdateReminder] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const loadHome = useCallback(async (shouldApply: () => boolean = () => true) => {
    setIsLoading(true);
    setError(null);

    try {
      const [
        conversationRows,
        pendingStructureRows,
        expiringTopicRows,
        followUpRows,
        lifeRows,
        reminderRows,
        tagRows,
        conversationTagRows,
        lifeTagRows,
        latestLifeUpdate,
        dismissedUntil,
      ] = await Promise.all([
        getRecentConversations(10),
        getConversationsPendingStructure(10),
        getTopicsExpiringSoonWithPeople(new Date(), 10),
        getAllOpenFollowUpsWithPeople(10),
        getActiveMyLifeItems(),
        getUpcomingReminders(),
        getAllTags(),
        getItemTagLinks('conversation'),
        getItemTagLinks('my_life_item'),
        getLatestMyLifeItem(),
        clearExpiredLifeUpdateReminderDismissal(),
      ]);

      if (shouldApply()) {
        const now = new Date();
        const hasRecentLifeUpdate =
          latestLifeUpdate !== undefined && now.getTime() - latestLifeUpdate.createdAt.getTime() < DAY_MS;
        const isDismissed = dismissedUntil !== null && dismissedUntil > now;

        setConversations(conversationRows);
        setPendingStructures(pendingStructureRows);
        setExpiringTopics(expiringTopicRows);
        setFollowUps(followUpRows);
        setLifeItems(lifeRows);
        setReminders(reminderRows.slice(0, 10));
        setTags(tagRows);
        setConversationTagLinks(conversationTagRows);
        setLifeTagLinks(lifeTagRows);
        setShowLifeUpdateReminder(!hasRecentLifeUpdate && !isDismissed);
      }
    } catch (err) {
      if (shouldApply()) {
        setError(err instanceof Error ? err.message : 'Unable to load home.');
      }
    } finally {
      if (shouldApply()) {
        setIsLoading(false);
      }
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      void loadHome(() => isActive);

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

  const conversationPeople = conversations
    .filter((conversation) => conversation.personId && conversation.personName)
    .filter(
      (conversation, index, rows) =>
        rows.findIndex((row) => row.personId === conversation.personId) === index,
    );
  const conversationPlaces = conversations
    .filter((conversation) => conversation.placeId && conversation.placeName)
    .filter(
      (conversation, index, rows) =>
        rows.findIndex((row) => row.placeId === conversation.placeId) === index,
    );
  const filteredConversations = conversations.filter((conversation) => {
    const query = conversationSearch.trim().toLowerCase();
    const conversationTagIds = conversationTagLinks
      .filter((link) => link.itemId === conversation.id)
      .map((link) => link.tagId);
    const conversationTagNames = tags
      .filter((tag) => conversationTagIds.includes(tag.id))
      .map((tag) => tag.name);
    const matchesQuery =
      !query ||
      [
        conversation.summary,
        conversation.source,
        conversation.transcriptStatus,
        conversation.structureStatus,
        conversation.personName,
        conversation.placeName,
        conversation.occurredAt.toISOString(),
        ...conversationTagNames,
      ]
        .filter(Boolean)
        .some((value) => value?.toLowerCase().includes(query));
    const matchesPerson =
      conversationPersonId === null || conversation.personId === conversationPersonId;
    const matchesPlace = conversationPlaceId === null || conversation.placeId === conversationPlaceId;
    const matchesTag = conversationTagId === null || conversationTagIds.includes(conversationTagId);

    return matchesQuery && matchesPerson && matchesPlace && matchesTag;
  });
  const filteredLifeItems = lifeItems.filter((item) => {
    const query = lifeSearch.trim().toLowerCase();
    const itemTagIds = lifeTagLinks.filter((link) => link.itemId === item.id).map((link) => link.tagId);
    const itemTagNames = tags.filter((tag) => itemTagIds.includes(tag.id)).map((tag) => tag.name);
    const matchesQuery =
      !query ||
      [item.content, item.tone, item.createdAt.toISOString(), ...itemTagNames]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(query));
    const matchesTone = lifeTone === null || item.tone === lifeTone;
    const matchesTag = lifeTagId === null || itemTagIds.includes(lifeTagId);

    return matchesQuery && matchesTone && matchesTag;
  });

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

  async function handleDismissLifeUpdateReminder() {
    setError(null);

    try {
      await dismissLifeUpdateReminderForOneDay();
      setShowLifeUpdateReminder(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to dismiss life update reminder.');
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
          <TabScreenHeader title="Kwento Time" />

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
              {showLifeUpdateReminder ? (
                <SurfaceCard tone="highlightMuted" style={styles.lifeReminderCard}>
                  <View style={styles.lifeReminderHeader}>
                    <View style={styles.lifeReminderCopy}>
                      <ThemedText type="smallBold">How was your day?</ThemedText>
                      <ThemedText type="small" themeColor="textSecondary">
                        Add a quick life update so your briefings remember what is current for you.
                      </ThemedText>
                    </View>
                    <Pressable
                      accessibilityLabel="Dismiss life update reminder"
                      accessibilityRole="button"
                      onPress={() => void handleDismissLifeUpdateReminder()}
                      style={({ pressed }) => [
                        styles.dismissButton,
                        {
                          backgroundColor: theme.backgroundElement,
                          opacity: pressed ? 0.72 : 1,
                        },
                      ]}>
                      <SymbolView
                        name={{ ios: 'xmark', android: 'close', web: 'close' }}
                        size={16}
                        tintColor={theme.text}
                        fallback={<ThemedText type="smallBold">x</ThemedText>}
                      />
                    </Pressable>
                  </View>
                  <Link href="/my-life/new" asChild>
                    <Pressable
                      accessibilityRole="button"
                      style={({ pressed }) => [
                        styles.lifeReminderAction,
                        {
                          backgroundColor: theme.primary,
                          opacity: pressed ? 0.72 : 1,
                        },
                      ]}>
                      <ThemedText type="smallBold" themeColor="onPrimary">
                        Create life update
                      </ThemedText>
                    </Pressable>
                  </Link>
                </SurfaceCard>
              ) : null}

              <View style={styles.section}>
                <View style={styles.quickActions}>
                  <Link href="/conversations/new" asChild>
                    <IconActionButton
                      icon={{ ios: 'bubble.left.and.text.bubble.right', android: 'chat', web: 'chat' }}
                      label="Conversation"
                      style={styles.quickActionButton}
                    />
                  </Link>

                  <Link href="/my-life/new" asChild>
                    <IconActionButton
                      icon={{ ios: 'heart.text.square', android: 'favorite', web: 'favorite' }}
                      label="Life update"
                      style={styles.quickActionButton}
                    />
                  </Link>

                  <Link href={briefingHref} asChild>
                    <IconActionButton
                      icon={{ ios: 'sparkles', android: 'auto_awesome', web: 'auto_awesome' }}
                      label="Briefing"
                      style={styles.quickActionButton}
                    />
                  </Link>

                  <Link href={icebreakersHref} asChild>
                    <IconActionButton
                      icon={{ ios: 'cube', android: 'ac_unit', web: 'ac_unit' }}
                      label="Icebreakers"
                      style={styles.quickActionButton}
                    />
                  </Link>

                  <Link href={reviewHref} asChild>
                    <IconActionButton
                      icon={{ ios: 'checkmark.seal', android: 'task_alt', web: 'task_alt' }}
                      label="Keep Current"
                      style={styles.quickActionButton}
                    />
                  </Link>

                  <Link href="/conversations/voice" asChild>
                    <IconActionButton
                      icon={{ ios: 'waveform', android: 'mic', web: 'mic' }}
                      label="Voice note"
                      style={styles.quickActionButton}
                    />
                  </Link>

                  <Link href={tagsHref} asChild>
                    <IconActionButton
                      icon={{ ios: 'tag', android: 'sell', web: 'tag' }}
                      label="Tags"
                      style={styles.quickActionButton}
                    />
                  </Link>

                  <IconActionButton
                    disabled={isScheduling}
                    icon={{ ios: 'bell.badge', android: 'notifications', web: 'notifications' }}
                    label={isScheduling ? 'Scheduling...' : 'Schedule reminders'}
                    onPress={handleScheduleReminders}
                    style={styles.quickActionButton}
                  />
                </View>
              </View>

              <ExpandableSection title="Today at a glance">
                <View style={styles.metricGrid}>
                  <SurfaceCard tone="primaryMuted" style={styles.metricCard}>
                    <ThemedText type="title">{followUps.length}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      Follow-ups
                    </ThemedText>
                  </SurfaceCard>
                  <SurfaceCard tone="highlightMuted" style={styles.metricCard}>
                    <ThemedText type="title">{expiringTopics.length}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      Topics to review
                    </ThemedText>
                  </SurfaceCard>
                  <SurfaceCard tone="accentMuted" style={styles.metricCard}>
                    <ThemedText type="title">{conversations.length}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      Recent notes
                    </ThemedText>
                  </SurfaceCard>
                  <SurfaceCard tone="primaryMuted" style={styles.metricCard}>
                    <ThemedText type="title">{pendingStructures.length}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      Need structure
                    </ThemedText>
                  </SurfaceCard>
                </View>
              </ExpandableSection>

              {
                pendingStructures.length > 0 && (
                  <ExpandableSection
                    title="Needs structure"
                    count={pendingStructures.length}
                    defaultExpanded={pendingStructures.length > 0}>

                    {pendingStructures.length === 0 ? (
                      <EmptyState
                        title="No confirmed transcripts waiting"
                        body="Confirmed transcripts will appear here before topics and follow-ups are saved."
                      />
                    ) : (
                      <View style={styles.list}>
                        {pendingStructures.map((conversation) => (
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
                  </ExpandableSection>
                )
              }

              <ExpandableSection title="Upcoming reminders" count={reminders.length} defaultExpanded={false}>

                {reminders.length === 0 ? (
                  <EmptyState
                    title="No reminders scheduled"
                    body="Schedule reminders to turn follow-ups and expiring topics into local notifications."
                  />
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
              </ExpandableSection>

              <ExpandableSection
                title="Expiring soon"
                count={expiringTopics.length}
                defaultExpanded={expiringTopics.length > 0}>

                {expiringTopics.length === 0 ? (
                  <EmptyState
                    title="No expiring topics"
                    body="Talking points that need review will show up here."
                  />
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
              </ExpandableSection>

              <ExpandableSection
                title="Open follow-ups"
                count={followUps.length}
                defaultExpanded={followUps.length > 0}>

                {followUps.length === 0 ? (
                  <EmptyState
                    title="No open follow-ups"
                    body="Add questions from a person or conversation to close the loop later."
                  />
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
              </ExpandableSection>

              <ExpandableSection title="Recent conversations" count={filteredConversations.length}>

                <View style={styles.filterPanel}>
                  <SearchField
                    value={conversationSearch}
                    onChangeText={setConversationSearch}
                    placeholder="Search conversations"
                  />
                  <HorizontalFilterChipRow
                    selectedValue={conversationPersonId}
                    onChange={setConversationPersonId}
                    options={[
                      { label: 'Any person', value: null },
                      ...conversationPeople.map((conversation) => ({
                        label: conversation.personName ?? 'Person',
                        value: conversation.personId,
                      })),
                    ]}
                  />
                  <HorizontalFilterChipRow
                    selectedValue={conversationPlaceId}
                    onChange={setConversationPlaceId}
                    options={[
                      { label: 'Any place', value: null },
                      ...conversationPlaces.map((conversation) => ({
                        label: conversation.placeName ?? 'Place',
                        value: conversation.placeId,
                      })),
                    ]}
                  />
                  <HorizontalFilterChipRow
                    selectedValue={conversationTagId}
                    onChange={setConversationTagId}
                    options={[
                      { label: 'Any tag', value: null },
                      ...tags.map((tag) => ({ label: tag.name, value: tag.id })),
                    ]}
                  />
                </View>

                {conversations.length === 0 ? (
                  <EmptyState
                    title="No conversations yet"
                    body="Tap add and choose conversation to record the first note."
                  />
                ) : filteredConversations.length === 0 ? (
                  <EmptyState title="No conversations match" body="Try another keyword or filter." />
                ) : (
                  <View style={styles.list}>
                    {filteredConversations.map((conversation) => (
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
              </ExpandableSection>

              <ExpandableSection title="Life topics" count={filteredLifeItems.length}>

                <View style={styles.filterPanel}>
                  <SearchField
                    value={lifeSearch}
                    onChangeText={setLifeSearch}
                    placeholder="Search life topics"
                  />
                  <HorizontalFilterChipRow
                    selectedValue={lifeTone}
                    onChange={setLifeTone}
                    options={[
                      { label: 'Any tone', value: null },
                      { label: 'Light', value: 'light' },
                      { label: 'Medium', value: 'medium' },
                      { label: 'Personal', value: 'personal' },
                    ]}
                  />
                  <HorizontalFilterChipRow
                    selectedValue={lifeTagId}
                    onChange={setLifeTagId}
                    options={[
                      { label: 'Any tag', value: null },
                      ...tags.map((tag) => ({ label: tag.name, value: tag.id })),
                    ]}
                  />
                </View>

                {lifeItems.length === 0 ? (
                  <EmptyState
                    title="No life topics yet"
                    body="Tap add and choose life update to save what is happening recently."
                  />
                ) : filteredLifeItems.length === 0 ? (
                  <EmptyState title="No life topics match" body="Try another keyword or tone." />
                ) : (
                  <View style={styles.list}>
                    {filteredLifeItems.map((item) => (
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
              </ExpandableSection>
            </>
          ) : null}
        </View>
      </ScrollView >
    </View >
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
    width: 144,
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
    width: 144
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
  stateCard: {
    alignItems: 'center',
  },
  lifeReminderCard: {
    gap: Spacing.three,
  },
  lifeReminderHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  lifeReminderCopy: {
    flex: 1,
    minWidth: 0,
    gap: Spacing.one,
  },
  dismissButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.small,
    borderCurve: 'continuous',
  },
  lifeReminderAction: {
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
    borderRadius: Radius.small,
    borderCurve: 'continuous',
    paddingHorizontal: Spacing.three,
  },
  filterPanel: {
    gap: Spacing.two,
  },
});
