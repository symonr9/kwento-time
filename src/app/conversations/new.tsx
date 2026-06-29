import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { SegmentedField, TextField, formControlStyles } from '@/components/ui/form-controls';
import { FormScreen } from '@/components/ui/form-screen';
import { Radius, Spacing } from '@/constants/theme';
import { logStructuredConversation } from '@/db/queries/conversations';
import { createPerson, getAllPeople } from '@/db/queries/people';
import { createPlace, getAllPlaces } from '@/db/queries/places';
import type { NewConversation, Person, Place, Topic } from '@/db/schema';
import { useTheme } from '@/hooks/use-theme';

type ImportanceValue = '1' | '2' | '3';
type StructuredTopicDraft = {
  id: string;
  content: string;
  category: string;
  tone: Topic['tone'];
  importance: ImportanceValue;
};
type StructuredFollowUpDraft = {
  id: string;
  question: string;
  category: string;
  tone: Topic['tone'];
  importance: ImportanceValue;
};

const toneOptions: { label: string; value: Topic['tone'] }[] = [
  { label: 'Light', value: 'light' },
  { label: 'Medium', value: 'medium' },
  { label: 'Personal', value: 'personal' },
];

const importanceOptions: { label: string; value: ImportanceValue }[] = [
  { label: 'Low', value: '1' },
  { label: 'Medium', value: '2' },
  { label: 'High', value: '3' },
];

function createTopicDraft(): StructuredTopicDraft {
  return {
    id: `${Date.now()}-${Math.random()}`,
    category: '',
    content: '',
    importance: '1',
    tone: 'light',
  };
}

function createFollowUpDraft(): StructuredFollowUpDraft {
  return {
    id: `${Date.now()}-${Math.random()}`,
    category: '',
    importance: '1',
    question: '',
    tone: 'light',
  };
}

export default function NewConversationScreen() {
  const theme = useTheme();
  const [summary, setSummary] = useState('');
  const [topics, setTopics] = useState<StructuredTopicDraft[]>([createTopicDraft()]);
  const [followUps, setFollowUps] = useState<StructuredFollowUpDraft[]>([createFollowUpDraft()]);
  const [people, setPeople] = useState<Person[]>([]);
  const [places, setPlaces] = useState<Place[]>([]);
  const [selectedPersonId, setSelectedPersonId] = useState<number | null>(null);
  const [selectedPlaceId, setSelectedPlaceId] = useState<number | null>(null);
  const [newPersonName, setNewPersonName] = useState('');
  const [newPlaceName, setNewPlaceName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isCreatingPerson, setIsCreatingPerson] = useState(false);
  const [isCreatingPlace, setIsCreatingPlace] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // TODO: To implement  
  const [rawTranscript] = useState('');
  const [audioUri] = useState('');

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
        followUps: followUps
          .map((followUp) => ({
            category: followUp.category.trim() || undefined,
            importance: Number(followUp.importance),
            question: followUp.question.trim(),
            tone: followUp.tone,
          }))
          .filter((followUp) => followUp.question.length > 0),
        placeId: selectedPlaceId,
        topics: topics
          .map((topic) => ({
            category: topic.category.trim() || undefined,
            content: topic.content.trim(),
            importance: Number(topic.importance),
            tone: topic.tone,
          }))
          .filter((topic) => topic.content.length > 0),
      });
      router.replace('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save conversation.');
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

  return (
    <FormScreen
      subtitle="What do you want to remember about the conversation?"
      title="New Conversation"
      error={error}
      isSaving={isSaving}
      onSave={handleSave}>
      <StructuredTopicsField topics={topics} onChange={setTopics} />

      <StructuredFollowUpsField followUps={followUps} onChange={setFollowUps} />

      <View style={styles.field}>
        <ThemedText type="smallBold">Person</ThemedText>
        <View style={styles.inlineCreateRow}>
          <View style={styles.inlineCreateInput}>
            <TextField
              label=""
              value={newPersonName}
              onChangeText={setNewPersonName}
              placeholder="Add a person by name"
              autoCapitalize="words"
              returnKeyType="done"
              onSubmitEditing={() => void handleCreatePerson()}
            />
          </View>
          <Pressable
            accessibilityRole="button"
            disabled={isCreatingPerson}
            onPress={() => void handleCreatePerson()}
            style={({ pressed }) => [
              styles.inlineCreateButton,
              {
                backgroundColor: theme.primary,
                opacity: pressed || isCreatingPerson ? 0.78 : 1,
              },
            ]}>
            <ThemedText type="smallBold" style={styles.inlineCreateButtonText}>
              Add
            </ThemedText>
          </Pressable>
        </View>
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
        <View style={styles.inlineCreateRow}>
          <View style={styles.inlineCreateInput}>
            <TextField
              label=""
              value={newPlaceName}
              onChangeText={setNewPlaceName}
              placeholder="Add a place by name"
              autoCapitalize="words"
              returnKeyType="done"
              onSubmitEditing={() => void handleCreatePlace()}
            />
          </View>
          <Pressable
            accessibilityRole="button"
            disabled={isCreatingPlace}
            onPress={() => void handleCreatePlace()}
            style={({ pressed }) => [
              styles.inlineCreateButton,
              {
                backgroundColor: theme.primary,
                opacity: pressed || isCreatingPlace ? 0.78 : 1,
              },
            ]}>
            <ThemedText type="smallBold" style={styles.inlineCreateButtonText}>
              Add
            </ThemedText>
          </Pressable>
        </View>
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
  structuredItem: {
    gap: Spacing.two,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.small,
    borderCurve: 'continuous',
    padding: Spacing.three,
  },
  addButton: {
    minHeight: 40,
    justifyContent: 'center',
  },
  removeButton: {
    minHeight: 36,
    justifyContent: 'center',
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

function StructuredTopicsField({
  topics,
  onChange,
}: {
  topics: StructuredTopicDraft[];
  onChange: (topics: StructuredTopicDraft[]) => void;
}) {
  function updateTopic(id: string, patch: Partial<StructuredTopicDraft>) {
    onChange(topics.map((topic) => (topic.id === id ? { ...topic, ...patch } : topic)));
  }

  function removeTopic(id: string) {
    const nextTopics = topics.filter((topic) => topic.id !== id);
    onChange(nextTopics.length ? nextTopics : [createTopicDraft()]);
  }

  return (
    <View style={styles.field}>
      <ThemedText type="smallBold">Talking points</ThemedText>
      {topics.map((topic, index) => (
        <View key={topic.id} style={styles.structuredItem}>
          <TextField
            label={`Talking point ${index + 1}`}
            value={topic.content}
            onChangeText={(content) => updateTopic(topic.id, { content })}
            placeholder="Something talked about"
          />
          <TextField
            label="Category"
            value={topic.category}
            onChangeText={(category) => updateTopic(topic.id, { category })}
            placeholder="Family, work, health..."
          />
          <SegmentedField
            label="Tone"
            options={toneOptions}
            value={topic.tone}
            onChange={(tone) => updateTopic(topic.id, { tone })}
          />
          <SegmentedField
            label="Importance"
            options={importanceOptions}
            value={topic.importance}
            onChange={(importance) => updateTopic(topic.id, { importance })}
          />
          {topics.length > 1 ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => removeTopic(topic.id)}
              style={styles.removeButton}>
              <ThemedText type="smallBold">Remove talking point</ThemedText>
            </Pressable>
          ) : null}
        </View>
      ))}
      <Pressable
        accessibilityRole="button"
        onPress={() => onChange([...topics, createTopicDraft()])}
        style={styles.addButton}>
        <ThemedText type="smallBold">+ Add talking point</ThemedText>
      </Pressable>
    </View>
  );
}

function StructuredFollowUpsField({
  followUps,
  onChange,
}: {
  followUps: StructuredFollowUpDraft[];
  onChange: (followUps: StructuredFollowUpDraft[]) => void;
}) {
  function updateFollowUp(id: string, patch: Partial<StructuredFollowUpDraft>) {
    onChange(followUps.map((followUp) => (followUp.id === id ? { ...followUp, ...patch } : followUp)));
  }

  function removeFollowUp(id: string) {
    const nextFollowUps = followUps.filter((followUp) => followUp.id !== id);
    onChange(nextFollowUps.length ? nextFollowUps : [createFollowUpDraft()]);
  }

  return (
    <View style={styles.field}>
      <ThemedText type="smallBold">Follow-up points</ThemedText>
      {followUps.map((followUp, index) => (
        <View key={followUp.id} style={styles.structuredItem}>
          <TextField
            label={`Follow-up ${index + 1}`}
            value={followUp.question}
            onChangeText={(question) => updateFollowUp(followUp.id, { question })}
            placeholder="Something to follow up on"
          />
          <TextField
            label="Category"
            value={followUp.category}
            onChangeText={(category) => updateFollowUp(followUp.id, { category })}
            placeholder="Family, work, health..."
          />
          <SegmentedField
            label="Tone"
            options={toneOptions}
            value={followUp.tone}
            onChange={(tone) => updateFollowUp(followUp.id, { tone })}
          />
          <SegmentedField
            label="Importance"
            options={importanceOptions}
            value={followUp.importance}
            onChange={(importance) => updateFollowUp(followUp.id, { importance })}
          />
          {followUps.length > 1 ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => removeFollowUp(followUp.id)}
              style={styles.removeButton}>
              <ThemedText type="smallBold">Remove follow-up</ThemedText>
            </Pressable>
          ) : null}
        </View>
      ))}
      <Pressable
        accessibilityRole="button"
        onPress={() => onChange([...followUps, createFollowUpDraft()])}
        style={styles.addButton}>
        <ThemedText type="smallBold">+ Add follow-up</ThemedText>
      </Pressable>
    </View>
  );
}
