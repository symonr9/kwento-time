import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
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
import { getPersonById, updatePerson } from '@/db/queries/people';
import { createTag, getAllTags, getTagsForItem, setTagsForItem } from '@/db/queries/tags';
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

function optionalText(value: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export default function EditPersonScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id?: string }>();
  const personId = Number(params.id);
  const [form, setForm] = useState<PersonForm>({
    avatarUri: null,
    name: '',
    nickname: '',
    howWeMet: '',
    birthday: '',
    notes: '',
  });
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [newTagName, setNewTagName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPerson = useCallback(async () => {
    if (!Number.isInteger(personId) || personId <= 0) {
      setError('Invalid person.');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const [person, tagRows, selectedRows] = await Promise.all([
        getPersonById(personId),
        getAllTags(),
        getTagsForItem('person', personId),
      ]);

      if (!person) {
        setError('Person not found.');
        return;
      }

      setForm({
        avatarUri: person.avatarUri ?? null,
        name: person.name,
        nickname: person.nickname ?? '',
        howWeMet: person.howWeMet ?? '',
        birthday: person.birthday ?? '',
        notes: person.notes ?? '',
      });
      setTags(tagRows);
      setSelectedTagIds(selectedRows.map((tag) => tag.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load person.');
    } finally {
      setIsLoading(false);
    }
  }, [personId]);

  useFocusEffect(
    useCallback(() => {
      void loadPerson();
    }, [loadPerson]),
  );

  function updateField<Field extends keyof PersonForm>(field: Field, value: PersonForm[Field]) {
    setForm((current) => ({ ...current, [field]: value }));
  }

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

    const person: Partial<NewPerson> = {
      name,
      nickname: optionalText(form.nickname),
      howWeMet: optionalText(form.howWeMet),
      birthday: optionalText(form.birthday),
      notes: optionalText(form.notes),
      avatarUri: form.avatarUri,
    };

    setIsSaving(true);
    setError(null);

    try {
      await updatePerson(personId, person);
      await setTagsForItem('person', personId, selectedTagIds);
      router.replace({ pathname: '/people/[id]', params: { id: String(personId) } });
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
              Edit person
            </ThemedText>
          </View>

          {isLoading ? (
            <SurfaceCard style={styles.stateCard}>
              <ActivityIndicator color={theme.primary} />
              <ThemedText themeColor="textSecondary">Loading person...</ThemedText>
            </SurfaceCard>
          ) : null}

          {!isLoading ? (
            <SurfaceCard style={styles.form}>
              <AvatarPicker
                label="Profile photo"
                name={form.name}
                uri={form.avatarUri}
                onChange={(uri) => updateField('avatarUri', uri)}
              />

              <Field label="Name" value={form.name} onChangeText={(value) => updateField('name', value)} placeholder="Jane Doe" />
              <Field label="Nickname" value={form.nickname} onChangeText={(value) => updateField('nickname', value)} placeholder="Optional" />
              <Field label="How we met" value={form.howWeMet} onChangeText={(value) => updateField('howWeMet', value)} placeholder="Optional" />
              <Field
                label="Birthday"
                value={form.birthday}
                onChangeText={(value) => updateField('birthday', value)}
                placeholder="YYYY-MM-DD or --MM-DD"
                autoCapitalize="none"
              />
              <Field
                label="Notes"
                value={form.notes}
                onChangeText={(value) => updateField('notes', value)}
                placeholder="Optional context"
                multiline
              />

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
          ) : null}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({
  autoCapitalize = 'sentences',
  label,
  multiline = false,
  onChangeText,
  placeholder,
  value,
}: {
  autoCapitalize?: 'none' | 'sentences' | 'words';
  label: string;
  multiline?: boolean;
  onChangeText: (value: string) => void;
  placeholder: string;
  value: string;
}) {
  const theme = useTheme();

  return (
    <View style={styles.field}>
      <ThemedText type="smallBold">{label}</ThemedText>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.textSecondary}
        autoCapitalize={autoCapitalize}
        multiline={multiline}
        textAlignVertical={multiline ? 'top' : undefined}
        style={[
          styles.input,
          multiline ? styles.notesInput : null,
          {
            backgroundColor: theme.background,
            borderColor: theme.border,
            color: theme.text,
          },
        ]}
      />
    </View>
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
  stateCard: {
    alignItems: 'center',
  },
});
