import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';

import { SegmentedField, TextField, formControlStyles } from '@/components/ui/form-controls';
import { FormScreen } from '@/components/ui/form-screen';
import { SearchableChipSelector } from '@/components/ui/searchable-chip-selector';
import { getConversationById, updateConversation } from '@/db/queries/conversations';
import { getAllPeople } from '@/db/queries/people';
import { addPersonToPlace, getAllPlaces } from '@/db/queries/places';
import type { Conversation, Person, Place } from '@/db/schema';

const sourceOptions: { label: string; value: Conversation['source'] }[] = [
  { label: 'Manual', value: 'manual' },
  { label: 'Voice', value: 'voice' },
  { label: 'Import', value: 'import' },
];

export default function EditConversationScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const conversationId = Number(params.id);
  const [people, setPeople] = useState<Person[]>([]);
  const [places, setPlaces] = useState<Place[]>([]);
  const [summary, setSummary] = useState('');
  const [source, setSource] = useState<Conversation['source']>('manual');
  const [selectedPersonId, setSelectedPersonId] = useState<number | null>(null);
  const [selectedPlaceId, setSelectedPlaceId] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // TODO: To Implement
  const [rawTranscript, setRawTranscript] = useState('');
  const [audioUri, setAudioUri] = useState('');

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      async function loadForm() {
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

          if (isActive) {
            if (!conversation) {
              setError('Conversation not found.');
              return;
            }

            setPeople(peopleRows);
            setPlaces(placeRows);
            setSummary(conversation.summary ?? '');
            setRawTranscript(conversation.rawTranscript ?? '');
            setAudioUri(conversation.audioUri ?? '');
            setSource(conversation.source);
            setSelectedPersonId(conversation.personId);
            setSelectedPlaceId(conversation.placeId);
          }
        } catch (err) {
          if (isActive) {
            setError(err instanceof Error ? err.message : 'Unable to load conversation form.');
          }
        }
      }

      void loadForm();

      return () => {
        isActive = false;
      };
    }, [conversationId]),
  );

  async function handleSave() {
    const trimmedSummary = summary.trim();
    const trimmedRawTranscript = rawTranscript.trim();
    const trimmedAudioUri = audioUri.trim();

    if (!trimmedSummary && !trimmedRawTranscript) {
      setError('Add either a summary or a raw transcript.');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      await updateConversation(conversationId, {
        audioUri: trimmedAudioUri || null,
        personId: selectedPersonId,
        placeId: selectedPlaceId,
        rawTranscript: trimmedRawTranscript || null,
        source,
        summary: trimmedSummary || null,
      });

      if (selectedPersonId && selectedPlaceId) {
        await addPersonToPlace(selectedPersonId, selectedPlaceId);
      }

      router.replace({ pathname: '/conversations/[id]', params: { id: String(conversationId) } });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save conversation.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <FormScreen
      subtitle="Edit conversation"
      title="Update the note."
      error={error}
      isSaving={isSaving}
      onSave={handleSave}>
      <TextField
        label="Summary"
        value={summary}
        onChangeText={setSummary}
        placeholder="What did you talk about?"
        multiline
        textAlignVertical="top"
        style={formControlStyles.notesInput}
      />

      <SegmentedField label="Source" options={sourceOptions} value={source} onChange={setSource} />

      <SearchableChipSelector
        label="Person"
        options={[
          { label: 'No person', value: null },
          ...people.map((person) => ({
            avatarUri: person.avatarUri,
            description: person.nickname,
            label: person.name,
            value: person.id,
          })),
        ]}
        searchPlaceholder="Search people"
        selectedValues={[selectedPersonId]}
        selectionMode="single"
        onSelectedValuesChange={(values) => setSelectedPersonId(values[0] ?? null)}
      />

      <SearchableChipSelector
        label="Place"
        options={[
          { label: 'No place', value: null },
          ...places.map((place) => ({
            avatarUri: place.avatarUri,
            description: place.address,
            label: place.name,
            value: place.id,
          })),
        ]}
        searchPlaceholder="Search places"
        selectedValues={[selectedPlaceId]}
        selectionMode="single"
        onSelectedValuesChange={(values) => setSelectedPlaceId(values[0] ?? null)}
      />
    </FormScreen>
  );
}
