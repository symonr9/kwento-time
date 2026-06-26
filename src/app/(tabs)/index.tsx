import { Link, useFocusEffect } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/ui/surface-card';
import { BottomTabInset, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { getRecentConversations } from '@/db/queries/conversations';
import { getActiveMyLifeItems } from '@/db/queries/my-life';
import type { MyLifeItem } from '@/db/schema';
import { useTheme } from '@/hooks/use-theme';

type RecentConversation = Awaited<ReturnType<typeof getRecentConversations>>[number];

function formatShortDate(value: Date) {
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(value);
}

export default function HomeScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [conversations, setConversations] = useState<RecentConversation[]>([]);
  const [lifeItems, setLifeItems] = useState<MyLifeItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      async function loadHome() {
        setIsLoading(true);
        setError(null);

        try {
          const [conversationRows, lifeRows] = await Promise.all([
            getRecentConversations(10),
            getActiveMyLifeItems(),
          ]);

          if (isActive) {
            setConversations(conversationRows);
            setLifeItems(lifeRows);
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
      }

      void loadHome();

      return () => {
        isActive = false;
      };
    }, []),
  );

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

          {!isLoading && !error ? (
            <>
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
                      <SurfaceCard key={conversation.id} style={styles.row}>
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
                      </SurfaceCard>
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
  row: {
    minHeight: 84,
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
