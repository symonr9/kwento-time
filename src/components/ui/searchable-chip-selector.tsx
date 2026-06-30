import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Avatar } from '@/components/ui/avatar';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type SearchableChipOption<Value extends number | string | null> = {
  avatarUri?: string | null;
  description?: string | null;
  label: string;
  value: Value;
};

type SearchableChipSelectorProps<Value extends number | string | null> = {
  description?: string;
  label?: string;
  options: SearchableChipOption<Value>[];
  searchPlaceholder?: string;
  selectedValues: Value[];
  selectionMode?: 'single' | 'multiple';
  onSelectedValuesChange: (values: Value[]) => void;
};

export function SearchableChipSelector<Value extends number | string | null>({
  description,
  label,
  options,
  searchPlaceholder = 'Search',
  selectedValues,
  selectionMode = 'multiple',
  onSelectedValuesChange,
}: SearchableChipSelectorProps<Value>) {
  const theme = useTheme();
  const [query, setQuery] = useState('');
  const normalizedQuery = query.trim().toLowerCase();
  const selectedKeys = new Set(selectedValues.map((value) => String(value)));
  const matchingOptions = options.filter((option) => {
    if (!normalizedQuery) return true;

    return [option.label, option.description]
      .filter(Boolean)
      .some((value) => value?.toLowerCase().includes(normalizedQuery));
  });
  const sortedOptions = [
    ...matchingOptions.filter((option) => selectedKeys.has(String(option.value))),
    ...matchingOptions.filter((option) => !selectedKeys.has(String(option.value))),
  ];
  function toggleValue(value: Value) {
    const isSelected = selectedKeys.has(String(value));

    if (selectionMode === 'single') {
      onSelectedValuesChange([value]);
      return;
    }

    if (isSelected) {
      onSelectedValuesChange(selectedValues.filter((selectedValue) => String(selectedValue) !== String(value)));
      return;
    }

    onSelectedValuesChange([...selectedValues, value]);
  }

  return (
    <View style={styles.field}>
      {label ? <ThemedText type="smallBold">{label}</ThemedText> : null}
      {description ? (
        <ThemedText type="small" themeColor="textSecondary">
          {description}
        </ThemedText>
      ) : null}
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder={searchPlaceholder}
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
      <FlatList
        data={sortedOptions}
        horizontal
        keyboardShouldPersistTaps="handled"
        keyExtractor={(option) => String(option.value)}
        showsHorizontalScrollIndicator={false}
        initialNumToRender={12}
        maxToRenderPerBatch={12}
        windowSize={5}
        removeClippedSubviews
        contentContainerStyle={styles.chipList}
        renderItem={({ item: option }) => {
          const isSelected = selectedKeys.has(String(option.value));

          return (
            <Pressable
              key={String(option.value)}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              onPress={() => toggleValue(option.value)}
              style={[
                styles.chip,
                {
                  backgroundColor: isSelected ? theme.primaryMuted : theme.backgroundElement,
                  borderColor: isSelected ? theme.primary : theme.border,
                  boxShadow: isSelected
                    ? '0 8px 18px rgba(36, 48, 58, 0.14)'
                    : '0 5px 12px rgba(36, 48, 58, 0.08)',
                },
              ]}>
              {option.avatarUri ? <Avatar name={option.label} uri={option.avatarUri} size={28} /> : null}
              <ThemedText
                type="smallBold"
                themeColor={isSelected ? 'text' : 'textSecondary'}
                style={styles.chipLabel}>
                {option.label}
              </ThemedText>
            </Pressable>
          );
        }}
      />
      {sortedOptions.length === 0 ? (
        <ThemedText type="small" themeColor="textSecondary">
          No matches.
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: Spacing.one,
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
  chipList: {
    gap: Spacing.two,
    paddingRight: Spacing.one,
    paddingVertical: Spacing.one,
  },
  chip: {
    maxWidth: '100%',
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.small,
    borderCurve: 'continuous',
    paddingHorizontal: Spacing.three,
  },
  chipLabel: {
    flexShrink: 1,
  },
});
