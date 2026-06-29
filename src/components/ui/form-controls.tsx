import { Pressable, StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { SearchableChipSelector } from '@/components/ui/searchable-chip-selector';
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
  avatarUri?: string | null;
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

type MultiTextFieldsProps = {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  maxItems?: number;
};

export function TextField({ label = '', style, ...props }: TextFieldProps) {
  const theme = useTheme();

  return (
    <View style={styles.field}>
      {label ? <ThemedText type="smallBold">{label}</ThemedText> : null}
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
  return (
    <SearchableChipSelector
      description={description}
      label={label}
      options={options}
      searchPlaceholder={`Search ${label.toLowerCase()}`}
      selectedValues={[value]}
      selectionMode="single"
      onSelectedValuesChange={(values) => onChange(values[0] ?? value)}
    />
  );
}

export function MultiTextFields({
  label,
  value,
  onChange,
  placeholder = 'Add another field',
  maxItems = 10,
}: MultiTextFieldsProps) {
  const points = value
    ? value.split(',').map((point) => point.trim())
    : [''];

  const normalizedPoints = points.length ? points : [''];
  const canAddMore = normalizedPoints.length < maxItems;

  const updatePoints = (nextPoints: string[]) => {
    onChange(
      nextPoints
        .map((point) => point.trim())
        .filter(Boolean)
        .join(', ')
    );
  };

  const handleChangePoint = (index: number, text: string) => {
    const nextPoints = [...normalizedPoints];
    nextPoints[index] = text;
    updatePoints(nextPoints);
  };

  const handleAddPoint = () => {
    if (!canAddMore) return;

    onChange([...normalizedPoints, ''].join(', '));
  };

  const handleRemovePoint = (index: number) => {
    const nextPoints = normalizedPoints.filter((_, pointIndex) => pointIndex !== index);
    updatePoints(nextPoints.length ? nextPoints : ['']);
  };

  return (
    <View style={styles.field}>
      <ThemedText type="smallBold">{label}</ThemedText>

      <View style={styles.multiTextFieldList}>
        {normalizedPoints.map((point, index) => (
          <View key={index} style={styles.multiTextFieldRow}>
            <View style={styles.multiTextInputWrapper}>
              <TextField
                label=''
                value={point}
                onChangeText={(text) => handleChangePoint(index, text)}
                placeholder={placeholder}
                style={styles.multiTextInput}
              />
            </View>

            {normalizedPoints.length > 1 ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Remove field"
                onPress={() => handleRemovePoint(index)}
                style={styles.iconButton}>
                <ThemedText type="smallBold">−</ThemedText>
              </Pressable>
            ) : null}
          </View>
        ))}
      </View>

      {canAddMore ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add field"
          onPress={handleAddPoint}
          style={styles.addMultiTextFieldButton}>
          <ThemedText type="smallBold">+ Add field</ThemedText>
        </Pressable>
      ) : null}
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
    minHeight: 36,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.small,
    borderCurve: 'continuous',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
  },
  segmented: {
    minHeight: 36,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.small,
    borderCurve: 'continuous',
    padding: Spacing.one,
    flexDirection: 'row',
    gap: Spacing.one,
  },
  segment: {
    flex: 1,
    minHeight: 32,
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
  multiTextFieldList: {
    gap: Spacing.two,
    alignSelf: 'stretch',
  },
  multiTextFieldRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.two,
  },
  multiTextInput: {
    flex: 1,
  },
  multiTextInputWrapper: {
    flex: 1,
    minWidth: 0,
  },
  iconButton: {
    minHeight: 48,
    minWidth: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addMultiTextFieldButton: {
    minHeight: 40,
    justifyContent: 'center',
  },
});
