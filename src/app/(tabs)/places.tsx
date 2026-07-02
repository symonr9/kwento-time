import { Link, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { AvatarPreview } from '@/components/ui/avatar-preview';
import { EmptyState } from '@/components/ui/empty-state';
import { HorizontalFilterChipRow } from '@/components/ui/horizontal-filter-chip-row';
import { SearchField } from '@/components/ui/search-field';
import { SurfaceCard } from '@/components/ui/surface-card';
import { TabScreenHeader } from '@/components/ui/tab-screen-header';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { getPlacesListSummaries } from '@/db/queries/places';
import { getAllTags, getItemTagLinks } from '@/db/queries/tags';
import type { Tag } from '@/db/schema';
import { useTheme } from '@/hooks/use-theme';

type PlaceListItem = Awaited<ReturnType<typeof getPlacesListSummaries>>[number];

export default function PlacesScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [places, setPlaces] = useState<PlaceListItem[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [tagLinks, setTagLinks] = useState<{ itemId: number; tagId: number }[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTagId, setSelectedTagId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      async function loadPlaces() {
        setIsLoading(true);
        setError(null);

        try {
          const [rows, tagRows, linkRows] = await Promise.all([
            getPlacesListSummaries(),
            getAllTags(),
            getItemTagLinks('place'),
          ]);
          if (isActive) {
            setPlaces(rows);
            setTags(tagRows);
            setTagLinks(linkRows);
          }
        } catch (err) {
          if (isActive) {
            setError(err instanceof Error ? err.message : 'Unable to load places.');
          }
        } finally {
          if (isActive) {
            setIsLoading(false);
          }
        }
      }

      void loadPlaces();

      return () => {
        isActive = false;
      };
    }, []),
  );

  const filteredPlaces = places.filter((place) => {
    const query = searchQuery.trim().toLowerCase();
    const placeTagIds = tagLinks.filter((link) => link.itemId === place.id).map((link) => link.tagId);
    const placeTagNames = tags.filter((tag) => placeTagIds.includes(tag.id)).map((tag) => tag.name);
    const matchesTag = selectedTagId === null || placeTagIds.includes(selectedTagId);
    if (!matchesTag) return false;
    if (!query) return true;

    return [place.name, place.address, place.notes, ...placeTagNames]
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
          <TabScreenHeader title="Places" />

          <View style={styles.filterPanel}>
            <SearchField
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search places"
            />
            <HorizontalFilterChipRow
              selectedValue={selectedTagId}
              onChange={setSelectedTagId}
              options={[
                { label: 'Any tag', value: null },
                ...tags.map((tag) => ({ label: tag.name, value: tag.id })),
              ]}
            />
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

          {!isLoading && !error && places.length === 0 ? (
            <EmptyState title="No places yet" body="Tap the add button to create the first place." />
          ) : null}

          {!isLoading && !error && places.length > 0 && filteredPlaces.length === 0 ? (
            <EmptyState title="No places match" body="Try a different keyword." />
          ) : null}

          {!isLoading && !error && filteredPlaces.length > 0 ? (
            <View style={styles.list}>
              {filteredPlaces.map((place) => (
                <SurfaceCard key={place.id} style={styles.placeRow}>
                  <AvatarPreview name={place.name} uri={place.avatarUri} size={48} />
                  <Link href={{ pathname: '/places/[id]', params: { id: String(place.id) } }} asChild>
                    <Pressable
                      accessibilityRole="button"
                      style={({ pressed }) => [styles.rowLink, { opacity: pressed ? 0.72 : 1 }]}>
                      <ThemedText type="subtitle">{place.name}</ThemedText>
                      <ThemedText type="small" themeColor="textSecondary">
                        {place.peopleCount} linked {place.peopleCount === 1 ? 'person' : 'people'}
                      </ThemedText>
                      {place.address ? (
                        <ThemedText type="small" themeColor="textSecondary">
                          {place.address}
                        </ThemedText>
                      ) : null}
                      {place.notes ? (
                        <ThemedText type="small" themeColor="textSecondary">
                          {place.notes}
                        </ThemedText>
                      ) : null}
                    </Pressable>
                  </Link>
                </SurfaceCard>
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
  filterPanel: {
    gap: Spacing.two,
  },
  list: {
    gap: Spacing.two,
  },
  placeRow: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  rowLink: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
  },
  stateCard: {
    alignItems: 'center',
  },
});
