import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { SegmentedField, TextField, formControlStyles } from '@/components/ui/form-controls';
import { FormScreen } from '@/components/ui/form-screen';
import { Radius, Spacing } from '@/constants/theme';
import {
  applyStructuredConversationDetails,
  getConversationById,
  updateConversation,
} from '@/db/queries/conversations';
import type { Topic } from '@/db/schema';
import { buildStructuredConversationDraft } from '@/features/conversations';
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

function createTopicDraft(content = ''): StructuredTopicDraft {
  return {
    id: `${Date.now()}-${Math.random()}`,
    category: '',
    content,
    importance: '1',
    tone: 'light',
  };
}

function createFollowUpDraft(question = ''): StructuredFollowUpDraft {
  return {
    id: `${Date.now()}-${Math.random()}`,
    category: '',
    importance: '1',
    question,
    tone: 'light',
  };
}

export default function ConversationStructureScreen() {
  const theme = useTheme();
  const params = useLocalSearchParams<{ id?: string }>();
  const conversationId = Number(params.id);
  const [summary, setSummary] = useState('');
  const [rawTranscript, setRawTranscript] = useState('');
  const [topics, setTopics] = useState<StructuredTopicDraft[]>([createTopicDraft()]);
  const [followUps, setFollowUps] = useState<StructuredFollowUpDraft[]>([createFollowUpDraft()]);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      async function loadStructureForm() {
        if (!Number.isInteger(conversationId) || conversationId <= 0) {
          setError('Invalid conversation.');
          return;
        }

        setError(null);

        try {
          const conversation = await getConversationById(conversationId);

          if (!isActive) {
            return;
          }

          if (!conversation) {
            setError('Conversation not found.');
            return;
          }

          const draft = buildStructuredConversationDraft(conversation.rawTranscript ?? '');
          setSummary(conversation.summary ?? '');
          setRawTranscript(conversation.rawTranscript ?? '');
          setTopics(draft.topics.length > 0 ? draft.topics.map(createTopicDraft) : [createTopicDraft()]);
          setFollowUps(
            draft.followUps.length > 0 ? draft.followUps.map(createFollowUpDraft) : [createFollowUpDraft()],
          );
        } catch (err) {
          if (isActive) {
            setError(err instanceof Error ? err.message : 'Unable to load structured details.');
          }
        }
      }

      void loadStructureForm();

      return () => {
        isActive = false;
      };
    }, [conversationId]),
  );

  async function handleSaveStructure() {
    setIsSaving(true);
    setError(null);

    try {
      await updateConversation(conversationId, {
        summary: summary.trim() || null,
      });
      const updatedConversation = await applyStructuredConversationDetails(conversationId, {
        followUps: followUps
          .map((followUp) => ({
            category: followUp.category.trim() || undefined,
            importance: Number(followUp.importance),
            question: followUp.question.trim(),
            tone: followUp.tone,
          }))
          .filter((followUp) => followUp.question.length > 0),
        topics: topics
          .map((topic) => ({
            category: topic.category.trim() || undefined,
            content: topic.content.trim(),
            importance: Number(topic.importance),
            tone: topic.tone,
          }))
          .filter((topic) => topic.content.length > 0),
      });

      if (!updatedConversation) {
        setError('Conversation not found.');
        return;
      }

      router.replace({ pathname: '/conversations/[id]', params: { id: String(conversationId) } });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save structured details.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <FormScreen
      subtitle="Structured details"
      title="Confirm what to remember."
      error={error}
      isSaving={isSaving}
      saveLabel="Save structure"
      onSave={handleSaveStructure}>
      <View style={[styles.transcriptPanel, { backgroundColor: theme.primaryMuted, borderColor: theme.border }]}>
        <ThemedText type="smallBold">Transcript source</ThemedText>
        <ThemedText type="small" themeColor="textSecondary" selectable>
          {rawTranscript || 'No transcript saved.'}
        </ThemedText>
      </View>

      <TextField
        label="Summary"
        value={summary}
        onChangeText={setSummary}
        placeholder="Optional short summary"
        multiline
        textAlignVertical="top"
        style={formControlStyles.notesInput}
      />

      <StructuredTopicsField topics={topics} onChange={setTopics} />

      <StructuredFollowUpsField followUps={followUps} onChange={setFollowUps} />
    </FormScreen>
  );
}

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
              style={({ pressed }) => [
                styles.removeButton,
                {
                  borderColor: theme.border,
                  opacity: pressed ? 0.72 : 1,
                },
              ]}>
              <ThemedText type="smallBold" style={styles.actionButtonText}>
                Remove talking point
              </ThemedText>
            </Pressable>
          ) : null}
        </View>
      ))}
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
        <ThemedText type="smallBold" style={styles.actionButtonText}>
          + Add talking point
        </ThemedText>
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
  const theme = useTheme();

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
              style={({ pressed }) => [
                styles.removeButton,
                {
                  borderColor: theme.border,
                  opacity: pressed ? 0.72 : 1,
                },
              ]}>
              <ThemedText type="smallBold" style={styles.actionButtonText}>
                Remove follow-up
              </ThemedText>
            </Pressable>
          ) : null}
        </View>
      ))}
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
        <ThemedText type="smallBold" style={styles.actionButtonText}>
          + Add follow-up
        </ThemedText>
      </Pressable>
    </View>
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
    minHeight: 40,
    alignSelf: 'flex-start',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.small,
    borderCurve: 'continuous',
    paddingHorizontal: Spacing.three,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
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
  actionButtonText: {
    textAlign: 'center',
  },
  transcriptPanel: {
    gap: Spacing.one,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.small,
    borderCurve: 'continuous',
    padding: Spacing.three,
  },
});
