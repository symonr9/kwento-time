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
import { createPerson } from '@/db/queries/people';
import { createTag, getAllTags, setTagsForItem } from '@/db/queries/tags';
import type { NewPerson, Tag } from '@/db/schema';
import { useTheme } from '@/hooks/use-theme';

type PersonForm = {
  avatarUri: string | null;
  name: string;
  nickname: string;
  howWeMet: string;
  birthday: string;
  notes: string;
};

const initialForm: PersonForm = {
  avatarUri: null,
  name: '',
  nickname: '',
  howWeMet: '',
  birthday: '',
  notes: '',
};

function optionalText(value: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export default function NewPersonScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [form, setForm] = useState<PersonForm>(initialForm);
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [newTagName, setNewTagName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateField<Field extends keyof PersonForm>(field: Field, value: PersonForm[Field]) {
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

    const person: NewPerson = {
      name,
      nickname: optionalText(form.nickname),
      howWeMet: optionalText(form.howWeMet),
      birthday: optionalText(form.birthday),
      notes: optionalText(form.notes),
      avatarUri: form.avatarUri ?? undefined,
    };

    setIsSaving(true);
    setError(null);

    try {
      const savedPerson = await createPerson(person);
      await setTagsForItem('person', savedPerson.id, selectedTagIds);
      router.replace('/people');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save person.');
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
              New person
            </ThemedText>
          </View>

          <SurfaceCard style={styles.form}>
            <AvatarPicker
              label="Profile photo"
              name={form.name}
              uri={form.avatarUri}
              onChange={(uri) => updateField('avatarUri', uri)}
            />

            <View style={styles.field}>
              <ThemedText type="smallBold">Name</ThemedText>
              <TextInput
                value={form.name}
                onChangeText={(value) => updateField('name', value)}
                placeholder="Jane Doe"
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
              <ThemedText type="smallBold">Nickname</ThemedText>
              <TextInput
                value={form.nickname}
                onChangeText={(value) => updateField('nickname', value)}
                placeholder="Optional"
                placeholderTextColor={theme.textSecondary}
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
              <ThemedText type="smallBold">How we met</ThemedText>
              <TextInput
                value={form.howWeMet}
                onChangeText={(value) => updateField('howWeMet', value)}
                placeholder="Optional"
                placeholderTextColor={theme.textSecondary}
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
              <ThemedText type="smallBold">Birthday</ThemedText>
              <TextInput
                value={form.birthday}
                onChangeText={(value) => updateField('birthday', value)}
                placeholder="YYYY-MM-DD or --MM-DD"
                placeholderTextColor={theme.textSecondary}
                autoCapitalize="none"
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
