import { Link, useFocusEffect } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/ui/surface-card';
import { BottomTabInset, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { getAllPeople } from '@/db/queries/people';
import { getAllTags, getItemTagLinks } from '@/db/queries/tags';
import type { Person, Tag } from '@/db/schema';
import { useTheme } from '@/hooks/use-theme';

export default function PeopleScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [people, setPeople] = useState<Person[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [tagLinks, setTagLinks] = useState<{ itemId: number; tagId: number }[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTagId, setSelectedTagId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      async function loadPeople() {
        setIsLoading(true);
        setError(null);

        try {
          const [rows, tagRows, linkRows] = await Promise.all([
            getAllPeople(),
            getAllTags(),
            getItemTagLinks('person'),
          ]);
          if (isActive) {
            setPeople(rows);
            setTags(tagRows);
            setTagLinks(linkRows);
          }
        } catch (err) {
          if (isActive) {
            setError(err instanceof Error ? err.message : 'Unable to load people.');
          }
        } finally {
          if (isActive) {
            setIsLoading(false);
          }
        }
      }

      void loadPeople();

      return () => {
        isActive = false;
      };
    }, []),
  );

  const filteredPeople = people.filter((person) => {
    const query = searchQuery.trim().toLowerCase();
    const personTagIds = tagLinks.filter((link) => link.itemId === person.id).map((link) => link.tagId);
    const personTagNames = tags
      .filter((tag) => personTagIds.includes(tag.id))
      .map((tag) => tag.name);
    const matchesTag = selectedTagId === null || personTagIds.includes(selectedTagId);
    if (!matchesTag) return false;
    if (!query) return true;

    return [person.name, person.nickname, person.howWeMet, person.birthday, person.notes, ...personTagNames]
      .filter(Boolean)
      .some((value) => value?.toLowerCase().includes(query));
  });

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
              People
            </ThemedText>
          </View>

          <View style={styles.filterPanel}>
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
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
            <View style={styles.filterChips}>
              <FilterChip label="Any tag" selected={selectedTagId === null} onPress={() => setSelectedTagId(null)} />
              {tags.map((tag) => (
                <FilterChip
                  key={tag.id}
                  label={tag.name}
                  selected={selectedTagId === tag.id}
                  onPress={() => setSelectedTagId(tag.id)}
                />
              ))}
            </View>
          </View>

          {isLoading ? (
            <SurfaceCard style={styles.stateCard}>
              <ActivityIndicator color={theme.primary} />
              <ThemedText themeColor="textSecondary">Loading people...</ThemedText>
            </SurfaceCard>
          ) : null}

          {error ? (
            <SurfaceCard tone="accentMuted" style={styles.stateCard}>
              <ThemedText selectable>{error}</ThemedText>
            </SurfaceCard>
          ) : null}

          {!isLoading && !error && people.length === 0 ? (
            <SurfaceCard style={styles.stateCard}>
              <ThemedText type="smallBold">No people yet</ThemedText>
              <ThemedText themeColor="textSecondary">
                Tap the add button to create the first person.
              </ThemedText>
            </SurfaceCard>
          ) : null}

          {!isLoading && !error && people.length > 0 && filteredPeople.length === 0 ? (
            <SurfaceCard style={styles.stateCard}>
              <ThemedText type="smallBold">No people match</ThemedText>
              <ThemedText themeColor="textSecondary">Try a different keyword.</ThemedText>
            </SurfaceCard>
          ) : null}

          {!isLoading && !error && filteredPeople.length > 0 ? (
            <View style={styles.list}>
              {filteredPeople.map((person) => (
                <Link
                  key={person.id}
                  href={{ pathname: '/people/[id]', params: { id: String(person.id) } }}
                  asChild>
                  <Pressable
                    accessibilityRole="button"
                    style={({ pressed }) => [{ opacity: pressed ? 0.72 : 1 }]}>
                    <SurfaceCard style={styles.personRow}>
                      <ThemedText type="smallBold">{person.name}</ThemedText>
                      {person.nickname ? (
                        <ThemedText type="small" themeColor="textSecondary">
                          {person.nickname}
                        </ThemedText>
                      ) : null}
                    </SurfaceCard>
                  </Pressable>
                </Link>
              ))}
            </View>
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
  filterPanel: {
    gap: Spacing.two,
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
  filterChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  filterChip: {
    minHeight: 34,
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.small,
    borderCurve: 'continuous',
    paddingHorizontal: Spacing.three,
  },
  list: {
    gap: Spacing.two,
  },
  personRow: {
    minHeight: 72,
    justifyContent: 'center',
  },
  stateCard: {
    alignItems: 'center',
  },
});

function FilterChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[
        styles.filterChip,
        {
          backgroundColor: selected ? theme.primaryMuted : theme.background,
          borderColor: theme.border,
        },
      ]}>
      <ThemedText type="smallBold" themeColor={selected ? 'text' : 'textSecondary'}>
        {label}
      </ThemedText>
    </Pressable>
  );
}
