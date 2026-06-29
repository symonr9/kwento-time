import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { SegmentedField, TextField, formControlStyles } from '@/components/ui/form-controls';
import { FormScreen } from '@/components/ui/form-screen';
import { Radius, Spacing } from '@/constants/theme';
import { getConversationById, updateConversation } from '@/db/queries/conversations';
import { getAllPeople } from '@/db/queries/people';
import { addPersonToPlace, getAllPlaces } from '@/db/queries/places';
import type { Conversation, Person, Place } from '@/db/schema';
import { useTheme } from '@/hooks/use-theme';

const sourceOptions: { label: string; value: Conversation['source'] }[] = [
  { label: 'Manual', value: 'manual' },
  { label: 'Voice', value: 'voice' },
  { label: 'Import', value: 'import' },
];

export default function EditConversationScreen() {
  const theme = useTheme();
  const params = useLocalSearchParams<{ id?: string }>();
  const conversationId = Number(params.id);
  const [people, setPeople] = useState<Person[]>([]);
  const [places, setPlaces] = useState<Place[]>([]);
  const [summary, setSummary] = useState('');
  const [rawTranscript, setRawTranscript] = useState('');
  const [audioUri, setAudioUri] = useState('');
  const [source, setSource] = useState<Conversation['source']>('manual');
  const [selectedPersonId, setSelectedPersonId] = useState<number | null>(null);
  const [selectedPlaceId, setSelectedPlaceId] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      eyebrow="Edit conversation"
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

      <TextField
        label="Raw transcript"
        value={rawTranscript}
        onChangeText={setRawTranscript}
        placeholder="Full note or transcript"
        multiline
        textAlignVertical="top"
        style={formControlStyles.notesInput}
      />

      <SegmentedField label="Source" options={sourceOptions} value={source} onChange={setSource} />

      <View style={styles.field}>
        <ThemedText type="smallBold">Person</ThemedText>
        <View style={styles.optionList}>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: selectedPersonId === null }}
            onPress={() => setSelectedPersonId(null)}
            style={[
              styles.optionChip,
              {
                backgroundColor: selectedPersonId === null ? theme.primaryMuted : theme.background,
                borderColor: theme.border,
              },
            ]}>
            <ThemedText
              type="smallBold"
              themeColor={selectedPersonId === null ? 'text' : 'textSecondary'}>
              No person
            </ThemedText>
          </Pressable>

          {people.map((person) => {
            const isSelected = selectedPersonId === person.id;

            return (
              <Pressable
                key={person.id}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                onPress={() => setSelectedPersonId(person.id)}
                style={[
                  styles.optionChip,
                  {
                    backgroundColor: isSelected ? theme.primaryMuted : theme.background,
                    borderColor: theme.border,
                  },
                ]}>
                <ThemedText type="smallBold" themeColor={isSelected ? 'text' : 'textSecondary'}>
                  {person.name}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.field}>
        <ThemedText type="smallBold">Place</ThemedText>
        <View style={styles.optionList}>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: selectedPlaceId === null }}
            onPress={() => setSelectedPlaceId(null)}
            style={[
              styles.optionChip,
              {
                backgroundColor: selectedPlaceId === null ? theme.primaryMuted : theme.background,
                borderColor: theme.border,
              },
            ]}>
            <ThemedText
              type="smallBold"
              themeColor={selectedPlaceId === null ? 'text' : 'textSecondary'}>
              No place
            </ThemedText>
          </Pressable>

          {places.map((place) => {
            const isSelected = selectedPlaceId === place.id;

            return (
              <Pressable
                key={place.id}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                onPress={() => setSelectedPlaceId(place.id)}
                style={[
                  styles.optionChip,
                  {
                    backgroundColor: isSelected ? theme.primaryMuted : theme.background,
                    borderColor: theme.border,
                  },
                ]}>
                <ThemedText type="smallBold" themeColor={isSelected ? 'text' : 'textSecondary'}>
                  {place.name}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
      </View>

      <TextField
        label="Audio URI"
        value={audioUri}
        onChangeText={setAudioUri}
        placeholder="Optional recording path"
      />
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: Spacing.one,
  },
  optionList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  optionChip: {
    minHeight: 40,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.small,
    borderCurve: 'continuous',
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
  },
});
