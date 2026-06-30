import { FlatList, Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type FilterValue = number | string | null;

export type HorizontalFilterChipOption<Value extends FilterValue> = {
  label: string;
  value: Value;
};

type HorizontalFilterChipRowProps<Value extends FilterValue> = {
  options: HorizontalFilterChipOption<Value>[];
  selectedValue: Value;
  onChange: (value: Value) => void;
};

export function HorizontalFilterChipRow<Value extends FilterValue>({
  options,
  selectedValue,
  onChange,
}: HorizontalFilterChipRowProps<Value>) {
  const theme = useTheme();
  const selectedKey = String(selectedValue);

  return (
    <FlatList
      data={options}
      horizontal
      keyboardShouldPersistTaps="handled"
      keyExtractor={(option) => String(option.value)}
      showsHorizontalScrollIndicator={false}
      initialNumToRender={12}
      maxToRenderPerBatch={12}
      windowSize={5}
      removeClippedSubviews
      contentContainerStyle={styles.list}
      renderItem={({ item }) => {
        const selected = String(item.value) === selectedKey;

        return (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={() => onChange(item.value)}
            style={[
              styles.chip,
              {
                backgroundColor: selected ? theme.primaryMuted : theme.background,
                borderColor: selected ? theme.primary : theme.border,
                boxShadow: selected
                  ? '0 8px 18px rgba(36, 48, 58, 0.12)'
                  : '0 5px 12px rgba(36, 48, 58, 0.06)',
              },
            ]}>
            <ThemedText type="smallBold" themeColor={selected ? 'text' : 'textSecondary'}>
              {item.label}
            </ThemedText>
          </Pressable>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  list: {
    gap: Spacing.two,
    paddingRight: Spacing.one,
    paddingVertical: Spacing.one,
  },
  chip: {
    minHeight: 38,
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.small,
    borderCurve: 'continuous',
    paddingHorizontal: Spacing.three,
  },
});
