import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { AvatarPicker } from '@/components/ui/avatar-picker';
import { SurfaceCard } from '@/components/ui/surface-card';
import { TagSelector } from '@/components/ui/tag-selector';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { createPlace } from '@/db/queries/places';
import { createTag, getAllTags, setTagsForItem } from '@/db/queries/tags';
import type { NewPlace, Tag } from '@/db/schema';
import { useTheme } from '@/hooks/use-theme';

type PlaceForm = {
  avatarUri: string | null;
  name: string;
  address: string;
  notes: string;
};

const initialForm: PlaceForm = {
  avatarUri: null,
  name: '',
  address: '',
  notes: '',
};

function optionalText(value: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export default function NewPlaceScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [form, setForm] = useState<PlaceForm>(initialForm);
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [newTagName, setNewTagName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateField<Field extends keyof PlaceForm>(field: Field, value: PlaceForm[Field]) {
    setForm((current) => ({ ...current, [field]: value }));
  }

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
    const name = form.name.trim();

    if (!name) {
      setError('Name is required.');
      return;
    }

    const place: NewPlace = {
      name,
      address: optionalText(form.address),
      avatarUri: form.avatarUri ?? undefined,
      notes: optionalText(form.notes),
    };

    setIsSaving(true);
    setError(null);

    try {
      const savedPlace = await createPlace(place);
      await setTagsForItem('place', savedPlace.id, selectedTagIds);
      router.replace('/places');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save place.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.select({ ios: 'padding', default: undefined })}
      style={[styles.screen, { backgroundColor: theme.background }]}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: Math.max(insets.top, Spacing.three) + Spacing.two,
            paddingBottom: Math.max(insets.bottom, Spacing.three) + Spacing.four,
          },
        ]}
        keyboardShouldPersistTaps="handled"
        contentInsetAdjustmentBehavior="automatic">
        <View style={styles.inner}>
          <View style={styles.header}>
            <Pressable
              accessibilityLabel="Go back"
              accessibilityRole="button"
              onPress={() => router.back()}
              style={({ pressed }) => [
                styles.iconButton,
                {
                  backgroundColor: theme.backgroundElement,
                  borderColor: theme.border,
                  opacity: pressed ? 0.72 : 1,
                },
              ]}>
              <ThemedText type="smallBold">Back</ThemedText>
            </Pressable>
          </View>

          <View style={styles.hero}>
            <ThemedText type="smallBold" themeColor="primary">
              New place
            </ThemedText>
          </View>

          <SurfaceCard style={styles.form}>
            <AvatarPicker
              label="Place photo"
              name={form.name}
              uri={form.avatarUri}
              onChange={(uri) => updateField('avatarUri', uri)}
            />

            <View style={styles.field}>
              <ThemedText type="smallBold">Name</ThemedText>
              <TextInput
                value={form.name}
                onChangeText={(value) => updateField('name', value)}
                placeholder="Neighborhood cafe"
                placeholderTextColor={theme.textSecondary}
                autoCapitalize="words"
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.background,
                    borderColor: theme.border,
                    color: theme.text,
                  },
                ]}
              />
            </View>

            <View style={styles.field}>
              <ThemedText type="smallBold">Address</ThemedText>
              <TextInput
                value={form.address}
                onChangeText={(value) => updateField('address', value)}
                placeholder="Optional"
                placeholderTextColor={theme.textSecondary}
                autoCapitalize="words"
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.background,
                    borderColor: theme.border,
                    color: theme.text,
                  },
                ]}
              />
            </View>

            <View style={styles.field}>
              <ThemedText type="smallBold">Notes</ThemedText>
              <TextInput
                value={form.notes}
                onChangeText={(value) => updateField('notes', value)}
                placeholder="Optional context"
                placeholderTextColor={theme.textSecondary}
                multiline
                textAlignVertical="top"
                style={[
                  styles.input,
                  styles.notesInput,
                  {
                    backgroundColor: theme.background,
                    borderColor: theme.border,
                    color: theme.text,
                  },
                ]}
              />
            </View>

            <TagSelector
              availableTags={tags}
              newTagName={newTagName}
              selectedTagIds={selectedTagIds}
              onAddTag={() => void handleCreateTag()}
              onNewTagNameChange={setNewTagName}
              onSelectedTagIdsChange={setSelectedTagIds}
            />

            {error ? (
              <ThemedText selectable themeColor="accent">
                {error}
              </ThemedText>
            ) : null}

            <Pressable
              accessibilityRole="button"
              disabled={isSaving}
              onPress={handleSave}
              style={({ pressed }) => [
                styles.saveButton,
                {
                  backgroundColor: theme.primary,
                  opacity: pressed || isSaving ? 0.78 : 1,
                },
              ]}>
              {isSaving ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <ThemedText type="smallBold" style={styles.saveButtonText}>
                  Save
                </ThemedText>
              )}
            </Pressable>
          </SurfaceCard>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
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
  header: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    minHeight: 40,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.medium,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: 'center',
  },
  hero: {
    gap: Spacing.two,
  },
  form: {
    gap: Spacing.three,
  },
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
  notesInput: {
    minHeight: 112,
  },
  saveButton: {
    minHeight: 52,
    borderRadius: Radius.medium,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    color: '#FFFFFF',
  },
});
