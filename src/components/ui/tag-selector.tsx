import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { TextField } from '@/components/ui/form-controls';
import { Radius, Spacing } from '@/constants/theme';
import type { Tag } from '@/db/schema';
import { useTheme } from '@/hooks/use-theme';

type TagSelectorProps = {
  availableTags: Tag[];
  newTagName: string;
  selectedTagIds: number[];
  onAddTag: () => void;
  onNewTagNameChange: (name: string) => void;
  onSelectedTagIdsChange: (tagIds: number[]) => void;
};

export function TagSelector({
  availableTags,
  newTagName,
  selectedTagIds,
  onAddTag,
  onNewTagNameChange,
  onSelectedTagIdsChange,
}: TagSelectorProps) {
  const theme = useTheme();

  function toggleTag(tagId: number) {
    if (selectedTagIds.includes(tagId)) {
      onSelectedTagIdsChange(selectedTagIds.filter((id) => id !== tagId));
      return;
    }

    onSelectedTagIdsChange([...selectedTagIds, tagId]);
  }

  return (
    <View style={styles.field}>
      <ThemedText type="smallBold">Tags</ThemedText>
      <View style={styles.inlineCreateRow}>
        <View style={styles.inlineCreateInput}>
          <TextField
            label=""
            value={newTagName}
            onChangeText={onNewTagNameChange}
            placeholder="Create a tag"
            returnKeyType="done"
            onSubmitEditing={onAddTag}
          />
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={onAddTag}
          style={({ pressed }) => [
            styles.addButton,
            {
              backgroundColor: theme.primary,
              opacity: pressed ? 0.78 : 1,
            },
          ]}>
          <ThemedText type="smallBold" style={styles.addButtonText}>
            Add
          </ThemedText>
        </Pressable>
      </View>

      <View style={styles.chipList}>
        {availableTags.map((tag) => {
          const selected = selectedTagIds.includes(tag.id);

          return (
            <Pressable
              key={tag.id}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => toggleTag(tag.id)}
              style={[
                styles.chip,
                {
                  backgroundColor: selected ? theme.primaryMuted : theme.background,
                  borderColor: theme.border,
                },
              ]}>
              <ThemedText type="smallBold" themeColor={selected ? 'text' : 'textSecondary'}>
                {tag.name}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: Spacing.one,
  },
  inlineCreateRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.two,
  },
  inlineCreateInput: {
    flex: 1,
    minWidth: 0,
  },
  addButton: {
    minHeight: 52,
    minWidth: 72,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.small,
    borderCurve: 'continuous',
    paddingHorizontal: Spacing.three,
  },
  addButtonText: {
    color: '#FFFFFF',
  },
  chipList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  chip: {
    minHeight: 34,
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.small,
    borderCurve: 'continuous',
    paddingHorizontal: Spacing.three,
  },
});
