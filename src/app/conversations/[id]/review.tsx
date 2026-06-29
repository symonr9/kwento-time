import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { SelectableChipField, TextField, formControlStyles } from '@/components/ui/form-controls';
import { FormScreen } from '@/components/ui/form-screen';
import { TagSelector } from '@/components/ui/tag-selector';
import { Radius, Spacing } from '@/constants/theme';
import { getConversationById, updateConversation } from '@/db/queries/conversations';
import { createPerson, getAllPeople } from '@/db/queries/people';
import { addPersonToPlace, createPlace, getAllPlaces } from '@/db/queries/places';
import { createTag, getAllTags, getTagsForItem, setTagsForItem } from '@/db/queries/tags';
import type { Person, Place, Tag } from '@/db/schema';
import { useTheme } from '@/hooks/use-theme';
import {
  TranscriptionUnavailableError,
  isLocalTranscriptionConfigured,
  transcribeAudio,
} from '@/services/audio';

function summarizeTranscript(rawTranscript: string) {
  const normalized = rawTranscript.replace(/\s+/g, ' ').trim();
  return normalized.length > 220 ? `${normalized.slice(0, 217)}...` : normalized;
}

export default function ReviewConversationTranscriptScreen() {
  const theme = useTheme();
  const params = useLocalSearchParams<{ id?: string }>();
  const conversationId = Number(params.id);
  const [people, setPeople] = useState<Person[]>([]);
  const [places, setPlaces] = useState<Place[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [audioUri, setAudioUri] = useState('');
  const [rawTranscript, setRawTranscript] = useState('');
  const [summary, setSummary] = useState('');
  const [selectedPersonId, setSelectedPersonId] = useState<number | null>(null);
  const [selectedPlaceId, setSelectedPlaceId] = useState<number | null>(null);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [newPersonName, setNewPersonName] = useState('');
  const [newPlaceName, setNewPlaceName] = useState('');
  const [newTagName, setNewTagName] = useState('');
  const [isCreatingPerson, setIsCreatingPerson] = useState(false);
  const [isCreatingPlace, setIsCreatingPlace] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      async function loadReviewForm() {
        if (!Number.isInteger(conversationId) || conversationId <= 0) {
          setError('Invalid conversation.');
          return;
        }

        setError(null);

        try {
          const [conversation, peopleRows, placeRows, tagRows, selectedTags] = await Promise.all([
            getConversationById(conversationId),
            getAllPeople(),
            getAllPlaces(),
            getAllTags(),
            getTagsForItem('conversation', conversationId),
          ]);

          if (!isActive) {
            return;
          }

          if (!conversation) {
            setError('Conversation not found.');
            return;
          }

          setPeople(peopleRows);
          setPlaces(placeRows);
          setTags(tagRows);
          setSelectedTagIds(selectedTags.map((tag) => tag.id));
          setAudioUri(conversation.audioUri ?? '');
          setRawTranscript(conversation.rawTranscript ?? '');
          setSummary(conversation.summary ?? '');
          setSelectedPersonId(conversation.personId);
          setSelectedPlaceId(conversation.placeId);
        } catch (err) {
          if (isActive) {
            setError(err instanceof Error ? err.message : 'Unable to load transcript review.');
          }
        }
      }

      void loadReviewForm();

      return () => {
        isActive = false;
      };
    }, [conversationId]),
  );

  async function handleConfirmTranscript() {
    const trimmedTranscript = rawTranscript.trim();
    const trimmedSummary = summary.trim();

    if (!trimmedTranscript) {
      setError('Transcript is required before confirming.');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      await updateConversation(conversationId, {
        extractionStatus: 'pending',
        personId: selectedPersonId,
        placeId: selectedPlaceId,
        rawTranscript: trimmedTranscript,
        summary: trimmedSummary || summarizeTranscript(trimmedTranscript),
        transcriptStatus: 'confirmed',
      });

      if (selectedPersonId && selectedPlaceId) {
        await addPersonToPlace(selectedPersonId, selectedPlaceId);
      }

      await setTagsForItem('conversation', conversationId, selectedTagIds);

      router.replace({ pathname: '/conversations/[id]/structure', params: { id: String(conversationId) } });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to confirm transcript.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleCreatePerson() {
    const name = newPersonName.trim();
    if (!name) {
      setError('Person name is required.');
      return;
    }

    setIsCreatingPerson(true);
    setError(null);

    try {
      const person = await createPerson({ name });
      setPeople((current) => [...current, person].sort((a, b) => a.name.localeCompare(b.name)));
      setSelectedPersonId(person.id);
      setNewPersonName('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to add person.');
    } finally {
      setIsCreatingPerson(false);
    }
  }

  async function handleCreatePlace() {
    const name = newPlaceName.trim();
    if (!name) {
      setError('Place name is required.');
      return;
    }

    setIsCreatingPlace(true);
    setError(null);

    try {
      const place = await createPlace({ name });
      setPlaces((current) => [...current, place].sort((a, b) => a.name.localeCompare(b.name)));
      setSelectedPlaceId(place.id);
      setNewPlaceName('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to add place.');
    } finally {
      setIsCreatingPlace(false);
    }
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

  async function handleTranscribeAudio() {
    if (!audioUri) {
      setError('No saved audio is available to transcribe.');
      return;
    }

    setIsTranscribing(true);
    setError(null);
    setNotice(null);

    try {
      await updateConversation(conversationId, { transcriptStatus: 'pending_transcription' });
      const result = await transcribeAudio({ audioUri });

      if (!result.text) {
        throw new Error('Transcription completed without text.');
      }

      setRawTranscript(result.text);
      await updateConversation(conversationId, {
        rawTranscript: result.text,
        transcriptStatus: 'ready_for_review',
      });
      setNotice('Transcript generated locally. Review it before confirming.');
    } catch (err) {
      await updateConversation(conversationId, { transcriptStatus: 'failed' });
      setError(
        err instanceof TranscriptionUnavailableError
          ? `${err.message} You can enter the transcript manually for now.`
          : err instanceof Error
            ? err.message
            : 'Unable to transcribe audio.',
      );
    } finally {
      setIsTranscribing(false);
    }
  }

  const personOptions = [
    { label: 'No person', value: null },
    ...people.map((person) => ({ avatarUri: person.avatarUri, label: person.name, value: person.id })),
  ];
  const placeOptions = [
    { label: 'No place', value: null },
    ...places.map((place) => ({ avatarUri: place.avatarUri, label: place.name, value: place.id })),
  ];

  return (
    <FormScreen
      subtitle="Transcript review"
      title="Confirm what was said."
      error={error}
      isSaving={isSaving}
      saveLabel="Confirm transcript"
      onSave={handleConfirmTranscript}>
      <View style={[styles.audioPanel, { backgroundColor: theme.primaryMuted, borderColor: theme.border }]}>
        <View style={styles.audioHeader}>
          <View style={styles.audioCopy}>
            <ThemedText type="smallBold">Saved audio</ThemedText>
            <ThemedText type="small" themeColor="textSecondary" selectable>
              {audioUri || 'No audio URI saved.'}
            </ThemedText>
          </View>
          {isTranscribing ? <ActivityIndicator color={theme.primary} /> : null}
        </View>
        <Pressable
          accessibilityRole="button"
          disabled={isTranscribing || !audioUri}
          onPress={handleTranscribeAudio}
          style={({ pressed }) => [
            styles.transcribeButton,
            {
              backgroundColor: theme.backgroundElement,
              borderColor: theme.border,
              opacity: pressed || isTranscribing || !audioUri ? 0.72 : 1,
            },
          ]}>
          <ThemedText type="smallBold">
            {isTranscribing
              ? 'Transcribing...'
              : isLocalTranscriptionConfigured()
                ? 'Transcribe audio'
                : 'Try local transcription'}
          </ThemedText>
        </Pressable>
      </View>

      {notice ? (
        <ThemedText type="small" themeColor="primary" selectable>
          {notice}
        </ThemedText>
      ) : null}

      <TextField
        label="Transcript"
        value={rawTranscript}
        onChangeText={setRawTranscript}
        placeholder="Review or enter the transcript before confirming."
        multiline
        textAlignVertical="top"
        style={formControlStyles.notesInput}
      />

      <TextField
        label="Summary"
        value={summary}
        onChangeText={setSummary}
        placeholder="Optional. A short summary will be generated from the transcript if blank."
        multiline
        textAlignVertical="top"
        style={formControlStyles.notesInput}
      />

      <SelectableChipField
        label="Person"
        options={personOptions}
        value={selectedPersonId}
        onChange={setSelectedPersonId}
      />
      <InlineCreateField
        buttonLabel="Add"
        disabled={isCreatingPerson}
        placeholder="Add a person by name"
        value={newPersonName}
        onChangeText={setNewPersonName}
        onSubmit={() => void handleCreatePerson()}
      />

      <SelectableChipField
        label="Place"
        description="Optional. Saved directly on the conversation and linked to the person when one is selected."
        options={placeOptions}
        value={selectedPlaceId}
        onChange={setSelectedPlaceId}
      />
      <InlineCreateField
        buttonLabel="Add"
        disabled={isCreatingPlace}
        placeholder="Add a place by name"
        value={newPlaceName}
        onChangeText={setNewPlaceName}
        onSubmit={() => void handleCreatePlace()}
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

function InlineCreateField({
  buttonLabel,
  disabled,
  onChangeText,
  onSubmit,
  placeholder,
  value,
}: {
  buttonLabel: string;
  disabled: boolean;
  onChangeText: (value: string) => void;
  onSubmit: () => void;
  placeholder: string;
  value: string;
}) {
  const theme = useTheme();

  return (
    <View style={styles.inlineCreateRow}>
      <View style={styles.inlineCreateInput}>
        <TextField
          label=""
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          autoCapitalize="words"
          returnKeyType="done"
          onSubmitEditing={onSubmit}
        />
      </View>
      <Pressable
        accessibilityRole="button"
        disabled={disabled}
        onPress={onSubmit}
        style={({ pressed }) => [
          styles.inlineCreateButton,
          {
            backgroundColor: theme.primary,
            opacity: pressed || disabled ? 0.78 : 1,
          },
        ]}>
        <ThemedText type="smallBold" style={styles.inlineCreateButtonText}>
          {buttonLabel}
        </ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  audioPanel: {
    gap: Spacing.one,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.small,
    borderCurve: 'continuous',
    padding: Spacing.three,
  },
  audioHeader: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  audioCopy: {
    flex: 1,
    minWidth: 0,
    gap: Spacing.one,
  },
  transcribeButton: {
    minHeight: 44,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.small,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
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
  inlineCreateButton: {
    minHeight: 52,
    minWidth: 72,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.small,
    borderCurve: 'continuous',
    paddingHorizontal: Spacing.three,
  },
  inlineCreateButtonText: {
    color: '#FFFFFF',
  },
});
