import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { EmptyState } from '@/components/ui/empty-state';
import { TextField } from '@/components/ui/form-controls';
import { FormScreen } from '@/components/ui/form-screen';
import { SurfaceCard } from '@/components/ui/surface-card';
import { Radius, Spacing } from '@/constants/theme';
import { createTag, deleteTag, getTagsWithUsageCounts, type TagWithUsageCounts } from '@/db/queries/tags';
import { useTheme } from '@/hooks/use-theme';

export default function TagsScreen() {
  const theme = useTheme();
  const [tags, setTags] = useState<TagWithUsageCounts[]>([]);
  const [newTagName, setNewTagName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadTags = useCallback(async (isActive = true) => {
    setIsLoading(true);
    setError(null);

    try {
      const rows = await getTagsWithUsageCounts();
      if (isActive) {
        setTags(rows);
      }
    } catch (err) {
      if (isActive) {
        setError(err instanceof Error ? err.message : 'Unable to load tags.');
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
      void loadTags(isActive);

      return () => {
        isActive = false;
      };
    }, [loadTags]),
  );

  async function handleAddTag() {
    const name = newTagName.trim();
    if (!name) {
      setError('Tag name is required.');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      await createTag({ name });
      setNewTagName('');
      await loadTags();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to add tag.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteTag(id: number) {
    setError(null);

    try {
      await deleteTag(id);
      await loadTags();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to delete tag.');
    }
  }

  function confirmDeleteTag(tag: TagWithUsageCounts) {
    Alert.alert('Delete tag?', `Delete "${tag.name}" from every item?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => void handleDeleteTag(tag.id) },
    ]);
  }

  return (
    <FormScreen
      subtitle="Tags"
      title="Manage tags."
      error={error}
      isSaving={isSaving}
      saveLabel="Add tag"
      onSave={handleAddTag}>
      <TextField
        label="New tag"
        value={newTagName}
        onChangeText={setNewTagName}
        placeholder="Family, work, church..."
        returnKeyType="done"
        onSubmitEditing={() => void handleAddTag()}
      />

      {isLoading ? (
        <SurfaceCard style={styles.stateCard}>
          <ActivityIndicator color={theme.primary} />
          <ThemedText themeColor="textSecondary">Loading tags...</ThemedText>
        </SurfaceCard>
      ) : null}

      {!isLoading && tags.length === 0 ? (
        <EmptyState title="No tags yet" body="Add a tag to use it across your notes." />
      ) : null}

      {!isLoading && tags.length > 0 ? (
        <View style={styles.list}>
          {tags.map((tag) => (
            <SurfaceCard key={tag.id} style={styles.tagRow}>
              <View style={styles.tagHeader}>
                <ThemedText type="smallBold">{tag.name}</ThemedText>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => confirmDeleteTag(tag)}
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
              <ThemedText type="small" themeColor="textSecondary">
                {tag.peopleCount} people · {tag.placesCount} places · {tag.conversationsCount} conversations ·{' '}
                {tag.lifeUpdatesCount} life updates
              </ThemedText>
            </SurfaceCard>
          ))}
        </View>
      ) : null}
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: Spacing.two,
  },
  tagRow: {
    gap: Spacing.two,
  },
  tagHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
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
