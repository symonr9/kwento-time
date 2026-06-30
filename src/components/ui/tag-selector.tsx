import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { TextField } from '@/components/ui/form-controls';
import { SearchableChipSelector } from '@/components/ui/searchable-chip-selector';
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

      <SearchableChipSelector
        label=""
        options={availableTags.map((tag) => ({ label: tag.name, value: tag.id }))}
        searchPlaceholder="Search tags"
        selectedValues={selectedTagIds}
        onSelectedValuesChange={onSelectedTagIdsChange}
      />
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
    minHeight: 40,
    minWidth: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.small,
    borderCurve: 'continuous',
    paddingHorizontal: Spacing.two,
  },
  addButtonText: {
    color: '#FFFFFF',
  },
});
