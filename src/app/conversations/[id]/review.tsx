import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { SelectableChipField, TextField, formControlStyles } from '@/components/ui/form-controls';
import { FormScreen } from '@/components/ui/form-screen';
import { Radius, Spacing } from '@/constants/theme';
import { getConversationById, updateConversation } from '@/db/queries/conversations';
import { getAllPeople } from '@/db/queries/people';
import { addPersonToPlace, getAllPlaces } from '@/db/queries/places';
import type { Person, Place } from '@/db/schema';
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
  const [audioUri, setAudioUri] = useState('');
  const [rawTranscript, setRawTranscript] = useState('');
  const [summary, setSummary] = useState('');
  const [selectedPersonId, setSelectedPersonId] = useState<number | null>(null);
  const [selectedPlaceId, setSelectedPlaceId] = useState<number | null>(null);
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
          const [conversation, peopleRows, placeRows] = await Promise.all([
            getConversationById(conversationId),
            getAllPeople(),
            getAllPlaces(),
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

      router.replace({ pathname: '/conversations/[id]/structure', params: { id: String(conversationId) } });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to confirm transcript.');
    } finally {
      setIsSaving(false);
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

      <SelectableChipField
        label="Place"
        description="Optional. Saved directly on the conversation and linked to the person when one is selected."
        options={placeOptions}
        value={selectedPlaceId}
        onChange={setSelectedPlaceId}
      />
    </FormScreen>
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
});
