import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View, type ListRenderItemInfo } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ExpandableSection } from '@/components/ui/expandable-section';
import { SegmentedField, TextField, formControlStyles } from '@/components/ui/form-controls';
import { FormScreen } from '@/components/ui/form-screen';
import { SearchableChipSelector } from '@/components/ui/searchable-chip-selector';
import { TagSelector } from '@/components/ui/tag-selector';
import { Radius, Spacing } from '@/constants/theme';
import { logStructuredConversation } from '@/db/queries/conversations';
import { createPerson, getAllPeople } from '@/db/queries/people';
import { createPlace, getAllPlaces } from '@/db/queries/places';
import { createTag, getAllTags, setTagsForItem } from '@/db/queries/tags';
import type { NewConversation, Person, Place, Tag, Topic } from '@/db/schema';
import { useTheme } from '@/hooks/use-theme';

type StructuredTopicDraft = {
  id: string;
  content: string;
  tone: Topic['tone'];
};
type StructuredFollowUpDraft = {
  id: string;
  question: string;
  tone: Topic['tone'];
};

const toneOptions: { label: string; value: Topic['tone'] }[] = [
  { label: 'Light', value: 'light' },
  { label: 'Medium', value: 'medium' },
  { label: 'Personal', value: 'personal' },
];

function createTopicDraft(): StructuredTopicDraft {
  return {
    id: `${Date.now()}-${Math.random()}`,
    content: '',
    tone: 'light',
  };
}

function createFollowUpDraft(): StructuredFollowUpDraft {
  return {
    id: `${Date.now()}-${Math.random()}`,
    question: '',
    tone: 'light',
  };
}

function describeOperationError(operation: string, err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  return `${operation} failed: ${message}`;
}

export default function NewConversationScreen() {
  const theme = useTheme();
  const [summary, setSummary] = useState('');
  const [topics, setTopics] = useState<StructuredTopicDraft[]>([createTopicDraft()]);
  const [followUps, setFollowUps] = useState<StructuredFollowUpDraft[]>([createFollowUpDraft()]);
  const [people, setPeople] = useState<Person[]>([]);
  const [places, setPlaces] = useState<Place[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [newTagName, setNewTagName] = useState('');
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
          const [peopleRows, placeRows, tagRows] = await Promise.all([
            getAllPeople(),
            getAllPlaces(),
            getAllTags(),
          ]);
          if (isActive) {
            setPeople(peopleRows);
            setPlaces(placeRows);
            setTags(tagRows);
          }
        } catch (err) {
          if (isActive) {
            setError(describeOperationError('Loading conversation form people, places, and tags', err));
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

    const conversation: NewConversation = {
      audioUri: audioUri.trim() || null,
      placeId: selectedPlaceId,
      rawTranscript: rawTranscript.trim() || null,
      summary: trimmedSummary || null,
      personId: selectedPersonId,
      source: 'manual',
    };

    setIsSaving(true);
    setError(null);

    try {
      const savedConversation = await logStructuredConversation({
        conversation,
        followUps: followUps
          .map((followUp) => ({
            question: followUp.question.trim(),
            tone: followUp.tone,
          }))
          .filter((followUp) => followUp.question.length > 0),
        placeId: selectedPlaceId,
        topics: topics
          .map((topic) => ({
            content: topic.content.trim(),
            tone: topic.tone,
          }))
          .filter((topic) => topic.content.length > 0),
      });
      await setTagsForItem('conversation', savedConversation.id, selectedTagIds);
      router.replace('/');
    } catch (err) {
      setError(describeOperationError('Saving conversation with selected person/place/tags', err));
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
      setError(describeOperationError(`Adding person "${name}" from conversation form`, err));
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
      setError(describeOperationError(`Adding place "${name}" from conversation form`, err));
    } finally {
      setIsCreatingPlace(false);
    }
  }

  async function handleCreateTag() {
    const name = newTagName.trim();
    if (!name) {
      return;
    }

    try {
      const tag = await createTag({ name });
      setTags((current) => [...current, tag].sort((a, b) => a.name.localeCompare(b.name)));
      setSelectedTagIds((current) => [...current, tag.id]);
      setNewTagName('');
    } catch (err) {
      setError(describeOperationError(`Adding tag "${name}" from conversation form`, err));
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
        <SearchableChipSelector
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
        <SearchableChipSelector
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
      </View>

      <TagSelector
        availableTags={tags}
        newTagName={newTagName}
        selectedTagIds={selectedTagIds}
        onAddTag={() => void handleCreateTag()}
        onNewTagNameChange={setNewTagName}
        onSelectedTagIdsChange={setSelectedTagIds}
      />

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
  structuredItem: {
    gap: Spacing.two,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.small,
    borderCurve: 'continuous',
    padding: Spacing.three,
  },
  addButton: {
    minHeight: 36,
    alignSelf: 'flex-start',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.small,
    borderCurve: 'continuous',
    paddingHorizontal: Spacing.three,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
  },
  addButtonText: {
    textAlign: 'center',
  },
  removeButtonText: {
    textAlign: 'center',
  },
  removeButton: {
    minHeight: 40,
    alignSelf: 'flex-start',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.small,
    borderCurve: 'continuous',
    paddingHorizontal: Spacing.three,
  },
  structuredList: {
    maxHeight: 420,
  },
  structuredListContent: {
    gap: Spacing.two,
    paddingBottom: Spacing.one,
  },
  inlineCreateRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.two,
  },
  inlineCreateInput: {
    flex: 1,
    minWidth: 0
  },
  inlineCreateButton: {
    minHeight: 36,
    minWidth: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.small,
    borderCurve: 'continuous',
    paddingHorizontal: Spacing.two,
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
  const theme = useTheme();

  function updateTopic(id: string, patch: Partial<StructuredTopicDraft>) {
    onChange(topics.map((topic) => (topic.id === id ? { ...topic, ...patch } : topic)));
  }

  function removeTopic(id: string) {
    const nextTopics = topics.filter((topic) => topic.id !== id);
    onChange(nextTopics.length ? nextTopics : [createTopicDraft()]);
  }

  function renderTopic({ item: topic, index }: ListRenderItemInfo<StructuredTopicDraft>) {
    return (
      <View style={styles.structuredItem}>
        <TextField
          label={`Talking point ${index + 1}`}
          value={topic.content}
          onChangeText={(content) => updateTopic(topic.id, { content })}
          placeholder="Something talked about"
        />
        <SegmentedField
          label="Tone"
          options={toneOptions}
          value={topic.tone}
          onChange={(tone) => updateTopic(topic.id, { tone })}
        />
        {topics.length > 1 ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => removeTopic(topic.id)}
            style={({ pressed }) => [
              styles.removeButton,
              {
                borderColor: theme.border,
                opacity: pressed ? 0.72 : 1,
              },
            ]}>
            <ThemedText type="smallBold" style={styles.removeButtonText}>
              Remove talking point
            </ThemedText>
          </Pressable>
        ) : null}
      </View>
    );
  }

  return (
    <ExpandableSection title="Talking points" count={topics.length}>
      <FlatList
        data={topics}
        keyExtractor={(topic) => topic.id}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled
        renderItem={renderTopic}
        scrollEnabled={topics.length > 2}
        showsVerticalScrollIndicator={topics.length > 2}
        initialNumToRender={3}
        maxToRenderPerBatch={4}
        windowSize={5}
        removeClippedSubviews
        style={styles.structuredList}
        contentContainerStyle={styles.structuredListContent}
      />
      <Pressable
        accessibilityRole="button"
        onPress={() => onChange([...topics, createTopicDraft()])}
        style={({ pressed }) => [
          styles.addButton,
          {
            borderColor: theme.border,
            opacity: pressed ? 0.72 : 1,
          },
        ]}>
        <ThemedText type="smallBold" style={styles.addButtonText}>
          + Add talking point
        </ThemedText>
      </Pressable>
    </ExpandableSection>
  );
}

function StructuredFollowUpsField({
  followUps,
  onChange,
}: {
  followUps: StructuredFollowUpDraft[];
  onChange: (followUps: StructuredFollowUpDraft[]) => void;
}) {
  const theme = useTheme();

  function updateFollowUp(id: string, patch: Partial<StructuredFollowUpDraft>) {
    onChange(followUps.map((followUp) => (followUp.id === id ? { ...followUp, ...patch } : followUp)));
  }

  function removeFollowUp(id: string) {
    const nextFollowUps = followUps.filter((followUp) => followUp.id !== id);
    onChange(nextFollowUps.length ? nextFollowUps : [createFollowUpDraft()]);
  }

  function renderFollowUp({ item: followUp, index }: ListRenderItemInfo<StructuredFollowUpDraft>) {
    return (
      <View style={styles.structuredItem}>
        <TextField
          label={`Follow-up ${index + 1}`}
          value={followUp.question}
          onChangeText={(question) => updateFollowUp(followUp.id, { question })}
          placeholder="Something to follow up on"
        />
        <SegmentedField
          label="Tone"
          options={toneOptions}
          value={followUp.tone}
          onChange={(tone) => updateFollowUp(followUp.id, { tone })}
        />
        {followUps.length > 1 ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => removeFollowUp(followUp.id)}
            style={({ pressed }) => [
              styles.removeButton,
              {
                borderColor: theme.border,
                opacity: pressed ? 0.72 : 1,
              },
            ]}>
            <ThemedText type="smallBold" style={styles.removeButtonText}>
              Remove follow-up
            </ThemedText>
          </Pressable>
        ) : null}
      </View>
    );
  }

  return (
    <ExpandableSection title="Follow-up points" count={followUps.length}>
      <FlatList
        data={followUps}
        keyExtractor={(followUp) => followUp.id}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled
        renderItem={renderFollowUp}
        scrollEnabled={followUps.length > 2}
        showsVerticalScrollIndicator={followUps.length > 2}
        initialNumToRender={3}
        maxToRenderPerBatch={4}
        windowSize={5}
        removeClippedSubviews
        style={styles.structuredList}
        contentContainerStyle={styles.structuredListContent}
      />
      <Pressable
        accessibilityRole="button"
        onPress={() => onChange([...followUps, createFollowUpDraft()])}
        style={({ pressed }) => [
          styles.addButton,
          {
            borderColor: theme.border,
            opacity: pressed ? 0.72 : 1,
          },
        ]}>
        <ThemedText type="smallBold" style={styles.addButtonText}>
          + Add follow-up
        </ThemedText>
      </Pressable>
    </ExpandableSection>
  );
}
