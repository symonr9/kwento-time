import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { EmptyState } from '@/components/ui/empty-state';
import { SegmentedField, TextField, formControlStyles } from '@/components/ui/form-controls';
import { FormScreen } from '@/components/ui/form-screen';
import { HorizontalFilterChipRow } from '@/components/ui/horizontal-filter-chip-row';
import { SurfaceCard } from '@/components/ui/surface-card';
import { TagSelector } from '@/components/ui/tag-selector';
import { Radius, Spacing } from '@/constants/theme';
import { createIcebreaker, deleteIcebreaker, getAllIcebreakers } from '@/db/queries/icebreakers';
import { createTag, getAllTags, getItemTagLinks, setTagsForItem } from '@/db/queries/tags';
import type { Icebreaker, IcebreakerTone, Tag } from '@/db/schema';
import { useTheme } from '@/hooks/use-theme';

const toneOptions: { label: string; value: IcebreakerTone }[] = [
  { label: 'Light', value: 'light' },
  { label: 'Medium', value: 'medium' },
  { label: 'Personal', value: 'personal' },
];

function formatShortDate(value: Date) {
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(value);
}

export default function IcebreakersScreen() {
  const theme = useTheme();
  const [icebreakers, setIcebreakers] = useState<Icebreaker[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [tagLinks, setTagLinks] = useState<{ itemId: number; tagId: number }[]>([]);
  const [text, setText] = useState('');
  const [tone, setTone] = useState<IcebreakerTone>('light');
  const [newTagName, setNewTagName] = useState('');
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilterTagId, setSelectedFilterTagId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadIcebreakers = useCallback(async (isActive = true) => {
    setIsLoading(true);
    setError(null);

    try {
      const [icebreakerRows, tagRows, linkRows] = await Promise.all([
        getAllIcebreakers(),
        getAllTags(),
        getItemTagLinks('icebreaker'),
      ]);

      if (isActive) {
        setIcebreakers(icebreakerRows);
        setTags(tagRows);
        setTagLinks(linkRows);
      }
    } catch (err) {
      if (isActive) {
        setError(err instanceof Error ? err.message : 'Unable to load icebreakers.');
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
      void loadIcebreakers(isActive);

      return () => {
        isActive = false;
      };
    }, [loadIcebreakers]),
  );

  async function handleCreateTag() {
    const name = newTagName.trim();
    if (!name) return;

    try {
      const tag = await createTag({ name });
      setTags((current) => [...current, tag].sort((a, b) => a.name.localeCompare(b.name)));
      setSelectedTagIds((current) => [...current, tag.id]);
      setNewTagName('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to add tag.');
    }
  }

  async function handleAddIcebreaker() {
    const trimmedText = text.trim();

    if (!trimmedText) {
      setError('Icebreaker text is required.');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const row = await createIcebreaker({ text: trimmedText, tone });
      await setTagsForItem('icebreaker', row.id, selectedTagIds);
      setText('');
      setTone('light');
      setSelectedTagIds([]);
      await loadIcebreakers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to add icebreaker.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteIcebreaker(id: number) {
    setError(null);

    try {
      await deleteIcebreaker(id);
      await loadIcebreakers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to delete icebreaker.');
    }
  }

  function confirmDeleteIcebreaker(icebreaker: Icebreaker) {
    Alert.alert('Delete icebreaker?', icebreaker.text, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => void handleDeleteIcebreaker(icebreaker.id) },
    ]);
  }

  const filteredIcebreakers = icebreakers.filter((icebreaker) => {
    const query = searchQuery.trim().toLowerCase();
    const icebreakerTagIds = tagLinks
      .filter((link) => link.itemId === icebreaker.id)
      .map((link) => link.tagId);
    const icebreakerTagNames = tags
      .filter((tag) => icebreakerTagIds.includes(tag.id))
      .map((tag) => tag.name);
    const matchesTag = selectedFilterTagId === null || icebreakerTagIds.includes(selectedFilterTagId);

    if (!matchesTag) return false;
    if (!query) return true;

    return [icebreaker.text, icebreaker.tone, icebreaker.createdAt.toISOString(), ...icebreakerTagNames]
      .filter(Boolean)
      .some((value) => value.toLowerCase().includes(query));
  });

  return (
    <FormScreen
      subtitle="Your go-to questions to break the ice with someone"
      title="Icebreakers"
      error={error}
      isSaving={isSaving}
      saveLabel="Add icebreaker"
      onSave={handleAddIcebreaker}>
      <TextField
        label="Icebreaker"
        value={text}
        onChangeText={setText}
        placeholder="What did you do this weekend?"
        multiline
        textAlignVertical="top"
        style={formControlStyles.notesInput}
      />

      <SegmentedField label="Tone" options={toneOptions} value={tone} onChange={setTone} />

      <TagSelector
        availableTags={tags}
        newTagName={newTagName}
        selectedTagIds={selectedTagIds}
        onAddTag={() => void handleCreateTag()}
        onNewTagNameChange={setNewTagName}
        onSelectedTagIdsChange={setSelectedTagIds}
      />

      <View style={styles.filterPanel}>
        <TextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search icebreakers"
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
        <HorizontalFilterChipRow
          selectedValue={selectedFilterTagId}
          onChange={setSelectedFilterTagId}
          options={[
            { label: 'Any tag', value: null },
            ...tags.map((tag) => ({ label: tag.name, value: tag.id })),
          ]}
        />
      </View>

      {isLoading ? (
        <SurfaceCard style={styles.stateCard}>
          <ActivityIndicator color={theme.primary} />
          <ThemedText themeColor="textSecondary">Loading icebreakers...</ThemedText>
        </SurfaceCard>
      ) : null}

      {!isLoading && icebreakers.length === 0 ? (
        <EmptyState
          title="No icebreakers yet"
          body="Add a question you would be glad to ask again."
        />
      ) : null}

      {!isLoading && icebreakers.length > 0 && filteredIcebreakers.length === 0 ? (
        <EmptyState title="No icebreakers match" body="Try another keyword or tag." />
      ) : null}

      {!isLoading && filteredIcebreakers.length > 0 ? (
        <View style={styles.list}>
          {filteredIcebreakers.map((icebreaker) => {
            const icebreakerTagIds = tagLinks
              .filter((link) => link.itemId === icebreaker.id)
              .map((link) => link.tagId);
            const icebreakerTags = tags.filter((tag) => icebreakerTagIds.includes(tag.id));

            return (
              <SurfaceCard key={icebreaker.id} style={styles.icebreakerRow}>
                <View style={styles.rowHeader}>
                  <View style={styles.rowCopy}>
                    <ThemedText type="smallBold" selectable>
                      {icebreaker.text}
                    </ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {icebreaker.tone} · added {formatShortDate(icebreaker.createdAt)}
                    </ThemedText>
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => confirmDeleteIcebreaker(icebreaker)}
                    style={({ pressed }) => [
                      styles.deleteButton,
                      {
                        backgroundColor: theme.accentMuted,
                        opacity: pressed ? 0.72 : 1,
                      },
                    ]}>
                    <ThemedText type="smallBold">Delete</ThemedText>
                  </Pressable>
                </View>
                {icebreakerTags.length > 0 ? (
                  <ThemedText type="small" themeColor="textSecondary">
                    {icebreakerTags.map((tag) => tag.name).join(' · ')}
                  </ThemedText>
                ) : null}
              </SurfaceCard>
            );
          })}
        </View>
      ) : null}
    </FormScreen>
  );
}

const styles = StyleSheet.create({
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
  list: {
    gap: Spacing.two,
  },
  icebreakerRow: {
    gap: Spacing.two,
  },
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  rowCopy: {
    flex: 1,
    minWidth: 0,
    gap: Spacing.one,
  },
  deleteButton: {
    minHeight: 36,
    justifyContent: 'center',
    borderRadius: Radius.small,
    borderCurve: 'continuous',
    paddingHorizontal: Spacing.three,
  },
  stateCard: {
    alignItems: 'center',
  },
});
