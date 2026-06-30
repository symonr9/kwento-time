import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { router } from 'expo-router';
import { useEffect, useState, type ChangeEvent, type CSSProperties } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { SegmentedField, TextField, formControlStyles } from '@/components/ui/form-controls';
import { FormScreen } from '@/components/ui/form-screen';
import { TagSelector } from '@/components/ui/tag-selector';
import { Radius, Spacing } from '@/constants/theme';
import { createMyLifeItem } from '@/db/queries/my-life';
import { createTag, getAllTags, setTagsForItem } from '@/db/queries/tags';
import type { MyLifeTone, NewMyLifeItem, Tag } from '@/db/schema';
import { useTheme } from '@/hooks/use-theme';

const toneOptions: { label: string; value: MyLifeTone }[] = [
  { label: 'Light', value: 'light' },
  { label: 'Medium', value: 'medium' },
  { label: 'Personal', value: 'personal' },
];

function getDefaultExpirationDateValue() {
  const date = new Date();
  date.setDate(date.getDate() + 30);
  return formatDateInputValue(date);
}

function formatDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseExpirationDate(value: string) {
  const trimmedValue = value.trim();
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmedValue);

  if (!match) {
    return null;
  }

  const [, yearValue, monthValue, dayValue] = match;
  const year = Number(yearValue);
  const month = Number(monthValue);
  const day = Number(dayValue);
  const date = new Date(year, month - 1, day, 23, 59, 59, 999);

  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null;
  }

  return date;
}

export default function NewMyLifeItemScreen() {
  const [content, setContent] = useState('');
  const [tone, setTone] = useState<MyLifeTone>('light');
  const [expiresAt, setExpiresAt] = useState(getDefaultExpirationDateValue);
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [newTagName, setNewTagName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    async function loadTags() {
      try {
        const rows = await getAllTags();
        if (isActive) {
          setTags(rows);
        }
      } catch (err) {
        if (isActive) {
          setError(err instanceof Error ? err.message : 'Unable to load tags.');
        }
      }
    }

    void loadTags();

    return () => {
      isActive = false;
    };
  }, []);

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

  async function handleSave() {
    const trimmedContent = content.trim();

    if (!trimmedContent) {
      setError('Life update is required.');
      return;
    }

    const parsedExpiresAt = parseExpirationDate(expiresAt);

    if (!parsedExpiresAt) {
      setError('Expiration date must use YYYY-MM-DD.');
      return;
    }

    const item: NewMyLifeItem = {
      content: trimmedContent,
      tone,
    };

    setIsSaving(true);
    setError(null);

    try {
      const savedItem = await createMyLifeItem(item, { expiresAt: parsedExpiresAt });
      await setTagsForItem('my_life_item', savedItem.id, selectedTagIds);
      router.replace('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save life update.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <FormScreen
      subtitle="What's something new in your life?"
      title="Life Update"
      error={error}
      isSaving={isSaving}
      onSave={handleSave}>
      <TextField
        label="Life update"
        value={content}
        onChangeText={setContent}
        placeholder="What has been happening recently?"
        multiline
        textAlignVertical="top"
        style={formControlStyles.notesInput}
      />
      <SegmentedField label="Tone" options={toneOptions} value={tone} onChange={setTone} />
      <DatePickerField
        label="Expiration date"
        value={expiresAt}
        onChange={setExpiresAt}
      />
      <TagSelector
        availableTags={tags}
        newTagName={newTagName}
        selectedTagIds={selectedTagIds}
        onAddTag={() => void handleCreateTag()}
        onNewTagNameChange={setNewTagName}
        onSelectedTagIdsChange={setSelectedTagIds}
      />
    </FormScreen>
  );
}

function DatePickerField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const theme = useTheme();
  const [isPickerVisible, setIsPickerVisible] = useState(Platform.OS === 'web');
  const date = parseExpirationDate(value) ?? new Date();

  function handleChange(event: DateTimePickerEvent, selectedDate?: Date) {
    if (Platform.OS !== 'web') {
      setIsPickerVisible(false);
    }

    if (event.type === 'dismissed' || !selectedDate) {
      return;
    }

    onChange(formatDateInputValue(selectedDate));
  }

  function handleWebChange(event: ChangeEvent<HTMLInputElement>) {
    onChange(event.currentTarget.value);
  }

  return (
    <View style={styles.dateField}>
      <ThemedText type="smallBold">{label}</ThemedText>
      {Platform.OS === 'web' ? (
        <input
          aria-label={label}
          type="date"
          value={value}
          onChange={handleWebChange}
          style={{
            ...webDateInputStyle,
            backgroundColor: theme.background,
            borderColor: theme.border,
            color: theme.text,
          }}
        />
      ) : (
        <>
          <Pressable
            accessibilityRole="button"
            onPress={() => setIsPickerVisible(true)}
            style={({ pressed }) => [
              styles.dateButton,
              {
                backgroundColor: theme.background,
                borderColor: theme.border,
                opacity: pressed ? 0.72 : 1,
              },
            ]}>
            <ThemedText type="smallBold">{value}</ThemedText>
          </Pressable>
          {isPickerVisible ? <DateTimePicker mode="date" value={date} onChange={handleChange} /> : null}
        </>
      )}
    </View>
  );
}

const webDateInputStyle: CSSProperties = {
  minHeight: 48,
  borderWidth: StyleSheet.hairlineWidth,
  borderStyle: 'solid',
  borderRadius: Radius.small,
  paddingInline: Spacing.three,
  fontSize: 16,
};

const styles = StyleSheet.create({
  dateField: {
    gap: Spacing.one,
  },
  dateButton: {
    minHeight: 48,
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.small,
    borderCurve: 'continuous',
    paddingHorizontal: Spacing.three,
  },
});
