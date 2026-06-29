import { Pressable, StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type TextFieldProps = TextInputProps & {
  label: string;
};

type SegmentedOption<T extends string> = {
  label: string;
  value: T;
};

type SelectableChipOption<T extends number | string | null> = {
  label: string;
  value: T;
};

type SegmentedFieldProps<T extends string> = {
  label: string;
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
};

type SelectableChipFieldProps<T extends number | string | null> = {
  description?: string;
  label: string;
  options: SelectableChipOption<T>[];
  value: T;
  onChange: (value: T) => void;
};

export function TextField({ label, style, ...props }: TextFieldProps) {
  const theme = useTheme();

  return (
    <View style={styles.field}>
      <ThemedText type="smallBold">{label}</ThemedText>
      <TextInput
        placeholderTextColor={theme.textSecondary}
        style={[
          styles.input,
          {
            backgroundColor: theme.background,
            borderColor: theme.border,
            color: theme.text,
          },
          style,
        ]}
        {...props}
      />
    </View>
  );
}

export function SegmentedField<T extends string>({
  label,
  options,
  value,
  onChange,
}: SegmentedFieldProps<T>) {
  const theme = useTheme();

  return (
    <View style={styles.field}>
      <ThemedText type="smallBold">{label}</ThemedText>
      <View style={[styles.segmented, { backgroundColor: theme.background, borderColor: theme.border }]}>
        {options.map((option) => {
          const isSelected = option.value === value;

          return (
            <Pressable
              key={option.value}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              onPress={() => onChange(option.value)}
              style={[
                styles.segment,
                {
                  backgroundColor: isSelected ? theme.primaryMuted : 'transparent',
                },
              ]}>
              <ThemedText
                type="smallBold"
                themeColor={isSelected ? 'text' : 'textSecondary'}
                style={styles.segmentLabel}>
                {option.label}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function SelectableChipField<T extends number | string | null>({
  description,
  label,
  options,
  value,
  onChange,
}: SelectableChipFieldProps<T>) {
  const theme = useTheme();

  return (
    <View style={styles.field}>
      <ThemedText type="smallBold">{label}</ThemedText>
      {description ? (
        <ThemedText type="small" themeColor="textSecondary">
          {description}
        </ThemedText>
      ) : null}
      <View style={styles.chipList}>
        {options.map((option) => {
          const isSelected = option.value === value;

          return (
            <Pressable
              key={String(option.value)}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              onPress={() => onChange(option.value)}
              style={[
                styles.chip,
                {
                  backgroundColor: isSelected ? theme.primaryMuted : theme.background,
                  borderColor: theme.border,
                },
              ]}>
              <ThemedText type="smallBold" themeColor={isSelected ? 'text' : 'textSecondary'}>
                {option.label}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export const formControlStyles = StyleSheet.create({
  notesInput: {
    minHeight: 132,
  },
});

const styles = StyleSheet.create({
  field: {
    gap: Spacing.one,
  },
  input: {
    minHeight: 48,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.small,
    borderCurve: 'continuous',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
  },
  segmented: {
    minHeight: 48,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.small,
    borderCurve: 'continuous',
    padding: Spacing.one,
    flexDirection: 'row',
    gap: Spacing.one,
  },
  segment: {
    flex: 1,
    minHeight: 40,
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.small,
    borderCurve: 'continuous',
    paddingHorizontal: Spacing.two,
  },
  segmentLabel: {
    textAlign: 'center',
  },
  chipList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  chip: {
    minHeight: 40,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.small,
    borderCurve: 'continuous',
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
  },
});
