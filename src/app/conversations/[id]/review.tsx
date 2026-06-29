import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { FormScreen } from '@/components/ui/form-screen';
import { SelectableChipField, TextField, formControlStyles } from '@/components/ui/form-controls';
import { Radius, Spacing } from '@/constants/theme';
import { getConversationById, updateConversation } from '@/db/queries/conversations';
import { getAllPeople } from '@/db/queries/people';
import { addPersonToPlace, getAllPlaces } from '@/db/queries/places';
import type { Person, Place } from '@/db/schema';
import { useTheme } from '@/hooks/use-theme';

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
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

      router.replace({ pathname: '/conversations/[id]', params: { id: String(conversationId) } });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to confirm transcript.');
    } finally {
      setIsSaving(false);
    }
  }

  const personOptions = [
    { label: 'No person', value: null },
    ...people.map((person) => ({ label: person.name, value: person.id })),
  ];
  const placeOptions = [
    { label: 'No place', value: null },
    ...places.map((place) => ({ label: place.name, value: place.id })),
  ];

  return (
    <FormScreen
      eyebrow="Transcript review"
      title="Confirm what was said."
      error={error}
      isSaving={isSaving}
      saveLabel="Confirm transcript"
      onSave={handleConfirmTranscript}>
      <View style={[styles.audioPanel, { backgroundColor: theme.primaryMuted, borderColor: theme.border }]}>
        <ThemedText type="smallBold">Saved audio</ThemedText>
        <ThemedText type="small" themeColor="textSecondary" selectable>
          {audioUri || 'No audio URI saved.'}
        </ThemedText>
      </View>

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
});
