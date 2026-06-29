import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { TextField, formControlStyles } from '@/components/ui/form-controls';
import { FormScreen } from '@/components/ui/form-screen';
import { Radius, Spacing } from '@/constants/theme';
import {
  applyStructuredConversationDetails,
  getConversationById,
  updateConversation,
} from '@/db/queries/conversations';
import { buildStructuredConversationDraft } from '@/features/conversations';
import { useTheme } from '@/hooks/use-theme';

function splitLines(value: string) {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

export default function ConversationStructureScreen() {
  const theme = useTheme();
  const params = useLocalSearchParams<{ id?: string }>();
  const conversationId = Number(params.id);
  const [summary, setSummary] = useState('');
  const [rawTranscript, setRawTranscript] = useState('');
  const [topics, setTopics] = useState('');
  const [followUps, setFollowUps] = useState('');
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
          setTopics(draft.topics.join('\n'));
          setFollowUps(draft.followUps.join('\n'));
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
        followUps: splitLines(followUps),
        topics: splitLines(topics),
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

      <TextField
        label="Talking points"
        value={topics}
        onChangeText={setTopics}
        placeholder="One talking point per line"
        multiline
        textAlignVertical="top"
        style={formControlStyles.notesInput}
      />

      <TextField
        label="Follow-up questions"
        value={followUps}
        onChangeText={setFollowUps}
        placeholder="One question per line"
        multiline
        textAlignVertical="top"
        style={formControlStyles.notesInput}
      />
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  transcriptPanel: {
    gap: Spacing.one,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.small,
    borderCurve: 'continuous',
    padding: Spacing.three,
  },
});
