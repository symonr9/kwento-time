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
import { getPlaceById, updatePlace } from '@/db/queries/places';
import { createTag, getAllTags, getTagsForItem, setTagsForItem } from '@/db/queries/tags';
import type { NewPlace, Tag } from '@/db/schema';
import { useTheme } from '@/hooks/use-theme';

type PlaceForm = {
  avatarUri: string | null;
  name: string;
  address: string;
  notes: string;
};

function optionalText(value: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export default function EditPlaceScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id?: string }>();
  const placeId = Number(params.id);
  const [form, setForm] = useState<PlaceForm>({
    avatarUri: null,
    name: '',
    address: '',
    notes: '',
  });
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [newTagName, setNewTagName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPlace = useCallback(async () => {
    if (!Number.isInteger(placeId) || placeId <= 0) {
      setError('Invalid place.');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const [place, tagRows, selectedRows] = await Promise.all([
        getPlaceById(placeId),
        getAllTags(),
        getTagsForItem('place', placeId),
      ]);

      if (!place) {
        setError('Place not found.');
        return;
      }

      setForm({
        avatarUri: place.avatarUri ?? null,
        name: place.name,
        address: place.address ?? '',
        notes: place.notes ?? '',
      });
      setTags(tagRows);
      setSelectedTagIds(selectedRows.map((tag) => tag.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load place.');
    } finally {
      setIsLoading(false);
    }
  }, [placeId]);

  useFocusEffect(
    useCallback(() => {
      void loadPlace();
    }, [loadPlace]),
  );

  function updateField<Field extends keyof PlaceForm>(field: Field, value: PlaceForm[Field]) {
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

    const place: Partial<NewPlace> = {
      name,
      address: optionalText(form.address),
      avatarUri: form.avatarUri,
      notes: optionalText(form.notes),
    };

    setIsSaving(true);
    setError(null);

    try {
      await updatePlace(placeId, place);
      await setTagsForItem('place', placeId, selectedTagIds);
      router.replace({ pathname: '/places/[id]', params: { id: String(placeId) } });
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
            <ThemedText type="subtitle" themeColor="primary">
              Edit place
            </ThemedText>
          </View>

          {isLoading ? (
            <SurfaceCard style={styles.stateCard}>
              <ActivityIndicator color={theme.primary} />
              <ThemedText themeColor="textSecondary">Loading place...</ThemedText>
            </SurfaceCard>
          ) : null}

          {!isLoading ? (
            <SurfaceCard style={styles.form}>
              <AvatarPicker
                label="Place photo"
                name={form.name}
                uri={form.avatarUri}
                onChange={(uri) => updateField('avatarUri', uri)}
              />

              <Field label="Name" value={form.name} onChangeText={(value) => updateField('name', value)} placeholder="Neighborhood cafe" autoCapitalize="words" />
              <Field label="Address" value={form.address} onChangeText={(value) => updateField('address', value)} placeholder="Optional" autoCapitalize="words" />
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
    minHeight: 20,
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
