import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { EmptyState } from '@/components/ui/empty-state';
import { SurfaceCard } from '@/components/ui/surface-card';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import {
  extendFollowUpExpiry,
  getFollowUpsExpiringSoonWithPeople,
  resolveFollowUp,
} from '@/db/queries/follow-ups';
import {
  extendMyLifeItemExpiry,
  getMyLifeItemsExpiringSoon,
  resolveMyLifeItem,
} from '@/db/queries/my-life';
import { extendTopicExpiry, getTopicsExpiringSoonWithPeople, resolveTopic } from '@/db/queries/topics';
import { useTheme } from '@/hooks/use-theme';

type ReviewTopic = Awaited<ReturnType<typeof getTopicsExpiringSoonWithPeople>>[number];
type ReviewFollowUp = Awaited<ReturnType<typeof getFollowUpsExpiringSoonWithPeople>>[number];
type ReviewLifeItem = Awaited<ReturnType<typeof getMyLifeItemsExpiringSoon>>[number];

function formatShortDate(value: Date) {
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(value);
}

export default function KeepCurrentScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [topics, setTopics] = useState<ReviewTopic[]>([]);
  const [followUps, setFollowUps] = useState<ReviewFollowUp[]>([]);
  const [lifeItems, setLifeItems] = useState<ReviewLifeItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const loadReviewItems = useCallback(async (isActive = true) => {
    setIsLoading(true);
    setError(null);

    try {
      const now = new Date();
      const [topicRows, followUpRows, lifeRows] = await Promise.all([
        getTopicsExpiringSoonWithPeople(now, 50),
        getFollowUpsExpiringSoonWithPeople(now, 50),
        getMyLifeItemsExpiringSoon(now, 50),
      ]);

      if (isActive) {
        setTopics(topicRows);
        setFollowUps(followUpRows);
        setLifeItems(lifeRows);
      }
    } catch (err) {
      if (isActive) {
        setError(err instanceof Error ? err.message : 'Unable to load review items.');
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
      void loadReviewItems(isActive);

      return () => {
        isActive = false;
      };
    }, [loadReviewItems]),
  );

  async function runAction(action: () => Promise<unknown>, message: string) {
    setError(null);
    setNotice(null);

    try {
      await action();
      setNotice(message);
      await loadReviewItems();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update item.');
    }
  }

  const totalCount = topics.length + followUps.length + lifeItems.length;

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
                styles.backButton,
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
            <ThemedText type="title">Keep Current</ThemedText>
            <ThemedText type="smallBold" themeColor="primary">
              Review what may be stale.
            </ThemedText>
          </View>

          {isLoading ? (
            <SurfaceCard style={styles.stateCard}>
              <ActivityIndicator color={theme.primary} />
              <ThemedText themeColor="textSecondary">Loading review...</ThemedText>
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

          {!isLoading && !error && totalCount === 0 ? (
            <EmptyState title="Everything looks current" body="Items that need review will show up here." />
          ) : null}

          {!isLoading && !error && topics.length > 0 ? (
            <ReviewSection title="Talking points" count={topics.length}>
              {topics.map((topic) => (
                <ReviewCard
                  key={`topic-${topic.topicId}`}
                  eyebrow={topic.personName ?? 'Talking point'}
                  title={topic.content}
                  meta={`Expires ${formatShortDate(topic.expiresAt)} · ${topic.state ?? 'active'}`}
                  primaryActionLabel="Keep"
                  secondaryActionLabel="Resolve"
                  archiveActionLabel="Archive"
                  onPrimaryAction={() =>
                    void runAction(() => extendTopicExpiry(topic.topicId), 'Talking point extended.')
                  }
                  onSecondaryAction={() =>
                    void runAction(() => resolveTopic(topic.topicId), 'Talking point resolved.')
                  }
                  onArchiveAction={() =>
                    void runAction(() => resolveTopic(topic.topicId), 'Talking point archived.')
                  }
                />
              ))}
            </ReviewSection>
          ) : null}

          {!isLoading && !error && followUps.length > 0 ? (
            <ReviewSection title="Follow-ups" count={followUps.length}>
              {followUps.map((followUp) => (
                <ReviewCard
                  key={`follow-up-${followUp.id}`}
                  eyebrow={followUp.personName ?? 'Follow-up'}
                  title={followUp.question}
                  meta={`Expires ${formatShortDate(followUp.expiresAt)} · ${followUp.state}`}
                  primaryActionLabel="Keep"
                  secondaryActionLabel="Resolve"
                  archiveActionLabel="Archive"
                  onPrimaryAction={() =>
                    void runAction(() => extendFollowUpExpiry(followUp.id), 'Follow-up extended.')
                  }
                  onSecondaryAction={() =>
                    void runAction(() => resolveFollowUp(followUp.id), 'Follow-up resolved.')
                  }
                  onArchiveAction={() =>
                    void runAction(() => resolveFollowUp(followUp.id), 'Follow-up archived.')
                  }
                />
              ))}
            </ReviewSection>
          ) : null}

          {!isLoading && !error && lifeItems.length > 0 ? (
            <ReviewSection title="Life updates" count={lifeItems.length}>
              {lifeItems.map((item) => (
                <ReviewCard
                  key={`life-${item.id}`}
                  eyebrow={item.tone}
                  title={item.content}
                  meta={`Expires ${formatShortDate(item.expiresAt)} · ${item.state}`}
                  primaryActionLabel="Keep"
                  secondaryActionLabel="Resolve"
                  archiveActionLabel="Archive"
                  onPrimaryAction={() =>
                    void runAction(() => extendMyLifeItemExpiry(item.id), 'Life update extended.')
                  }
                  onSecondaryAction={() =>
                    void runAction(() => resolveMyLifeItem(item.id), 'Life update resolved.')
                  }
                  onArchiveAction={() =>
                    void runAction(() => resolveMyLifeItem(item.id), 'Life update archived.')
                  }
                />
              ))}
            </ReviewSection>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

function ReviewSection({ children, count, title }: { children: ReactNode; count: number; title: string }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <ThemedText type="smallBold">{title}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {count}
        </ThemedText>
      </View>
      <View style={styles.list}>{children}</View>
    </View>
  );
}

function ReviewCard({
  archiveActionLabel,
  eyebrow,
  meta,
  onArchiveAction,
  onPrimaryAction,
  onSecondaryAction,
  primaryActionLabel,
  secondaryActionLabel,
  title,
}: {
  archiveActionLabel: string;
  eyebrow: string;
  meta: string;
  onArchiveAction: () => void;
  onPrimaryAction: () => void;
  onSecondaryAction: () => void;
  primaryActionLabel: string;
  secondaryActionLabel: string;
  title: string;
}) {
  return (
    <SurfaceCard style={styles.reviewCard}>
      <View style={styles.cardCopy}>
        <ThemedText type="smallBold">{eyebrow}</ThemedText>
        <ThemedText themeColor="textSecondary" selectable>
          {title}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {meta}
        </ThemedText>
      </View>
      <View style={styles.actionRow}>
        <ReviewButton label={primaryActionLabel} tone="primary" onPress={onPrimaryAction} />
        <ReviewButton label={secondaryActionLabel} onPress={onSecondaryAction} />
        <ReviewButton label={archiveActionLabel} accent onPress={onArchiveAction} />
      </View>
    </SurfaceCard>
  );
}

function ReviewButton({
  accent = false,
  label,
  onPress,
  tone,
}: {
  accent?: boolean;
  label: string;
  onPress: () => void;
  tone?: 'primary';
}) {
  const theme = useTheme();
  const backgroundColor = tone === 'primary' ? theme.primary : accent ? theme.accentMuted : theme.backgroundElement;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionButton,
        {
          backgroundColor,
          borderColor: theme.border,
          opacity: pressed ? 0.72 : 1,
        },
      ]}>
      <ThemedText type="smallBold" style={tone === 'primary' ? styles.primaryButtonText : undefined}>
        {label}
      </ThemedText>
    </Pressable>
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
  backButton: {
    minHeight: 40,
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.medium,
    borderCurve: 'continuous',
    paddingHorizontal: Spacing.three,
  },
  hero: {
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
  list: {
    gap: Spacing.two,
  },
  reviewCard: {
    gap: Spacing.three,
  },
  cardCopy: {
    gap: Spacing.one,
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  actionButton: {
    minHeight: 40,
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.small,
    borderCurve: 'continuous',
    paddingHorizontal: Spacing.three,
  },
  primaryButtonText: {
    color: '#FFFFFF',
  },
  stateCard: {
    alignItems: 'center',
  },
});
