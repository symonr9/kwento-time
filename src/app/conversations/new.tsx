import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { MultiTextFields, TextField, formControlStyles } from '@/components/ui/form-controls';
import { FormScreen } from '@/components/ui/form-screen';
import { Radius, Spacing } from '@/constants/theme';
import { logStructuredConversation } from '@/db/queries/conversations';
import { getAllPeople } from '@/db/queries/people';
import { getAllPlaces } from '@/db/queries/places';
import type { NewConversation, Person, Place } from '@/db/schema';
import { useTheme } from '@/hooks/use-theme';

function splitLines(value: string) {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

export default function NewConversationScreen() {
  const theme = useTheme();
  const [summary, setSummary] = useState('');
  const [topics, setTopics] = useState('');
  const [followUps, setFollowUps] = useState('');
  const [people, setPeople] = useState<Person[]>([]);
  const [places, setPlaces] = useState<Place[]>([]);
  const [selectedPersonId, setSelectedPersonId] = useState<number | null>(null);
  const [selectedPlaceId, setSelectedPlaceId] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // TODO: To implement  
  const [rawTranscript, setRawTranscript] = useState('');
  const [audioUri, setAudioUri] = useState('');

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      async function loadFormOptions() {
        try {
          const [peopleRows, placeRows] = await Promise.all([getAllPeople(), getAllPlaces()]);
          if (isActive) {
            setPeople(peopleRows);
            setPlaces(placeRows);
          }
        } catch (err) {
          if (isActive) {
            setError(err instanceof Error ? err.message : 'Unable to load form options.');
          }
        }
      }

      void loadFormOptions();

      return () => {
        isActive = false;
      };
    }, []),
  );

  async function handleSave() {
    const trimmedSummary = summary.trim();

    if (!trimmedSummary) {
      setError('Conversation note is required.');
      return;
    }

    const conversation: NewConversation = {
      audioUri: audioUri.trim() || undefined,
      placeId: selectedPlaceId ?? undefined,
      rawTranscript: rawTranscript.trim() || trimmedSummary,
      summary: trimmedSummary,
      personId: selectedPersonId ?? undefined,
      source: 'manual',
    };

    setIsSaving(true);
    setError(null);

    try {
      await logStructuredConversation({
        conversation,
        followUps: splitLines(followUps),
        placeId: selectedPlaceId,
        topics: splitLines(topics),
      });
      router.replace('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save conversation.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <FormScreen
      subtitle="What do you want to remember about the conversation?"
      title="New Conversation"
      error={error}
      isSaving={isSaving}
      onSave={handleSave}>
      <MultiTextFields
        label="Talking points"
        value={topics}
        onChange={setTopics}
        placeholder="Something talked about"
      />

      <MultiTextFields
        label="Follow-up Points"
        value={followUps}
        onChange={setFollowUps}
        placeholder="Something to follow up on"
      />

      <View style={styles.field}>
        <ThemedText type="smallBold">Person</ThemedText>
        <View style={styles.personList}>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: selectedPersonId === null }}
            onPress={() => setSelectedPersonId(null)}
            style={[
              styles.personChip,
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
                  styles.personChip,
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
        <ThemedText type="small" themeColor="textSecondary">
          Optional. Saved directly on the conversation and linked to the person when one is selected.
        </ThemedText>
        <View style={styles.personList}>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: selectedPlaceId === null }}
            onPress={() => setSelectedPlaceId(null)}
            style={[
              styles.personChip,
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
                  styles.personChip,
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
        label="Notes"
        value={summary}
        onChangeText={setSummary}
        placeholder="Anything else to remember?"
        multiline
        textAlignVertical="top"
        style={formControlStyles.notesInput}
      />
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: Spacing.one,
  },
  personList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  personChip: {
    minHeight: 40,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.small,
    borderCurve: 'continuous',
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
  },
});
