import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';

import { SegmentedField, TextField, formControlStyles } from '@/components/ui/form-controls';
import { FormScreen } from '@/components/ui/form-screen';
import { getTopicFormDetails, updateTopic } from '@/db/queries/topics';
import type { Topic } from '@/db/schema';

const toneOptions: { label: string; value: Topic['tone'] }[] = [
  { label: 'Light', value: 'light' },
  { label: 'Medium', value: 'medium' },
  { label: 'Personal', value: 'personal' },
];

const importanceOptions: { label: string; value: '1' | '2' | '3' }[] = [
  { label: '1', value: '1' },
  { label: '2', value: '2' },
  { label: '3', value: '3' },
];

export default function EditTopicScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const topicId = Number(params.id);
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('');
  const [tone, setTone] = useState<Topic['tone']>('light');
  const [importance, setImportance] = useState<'1' | '2' | '3'>('1');
  const [personId, setPersonId] = useState<number | null>(null);
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      async function loadTopic() {
        if (!Number.isInteger(topicId) || topicId <= 0) {
          setError('Invalid topic.');
          return;
        }

        setError(null);

        try {
          const topic = await getTopicFormDetails(topicId);

          if (isActive) {
            if (!topic) {
              setError('Topic not found.');
              return;
            }

            setContent(topic.content);
            setCategory(topic.category ?? '');
            setTone(topic.tone);
            setImportance(String(topic.importance) as '1' | '2' | '3');
            setPersonId(topic.personId);
            setConversationId(topic.conversationId);
          }
        } catch (err) {
          if (isActive) {
            setError(err instanceof Error ? err.message : 'Unable to load topic.');
          }
        }
      }

      void loadTopic();

      return () => {
        isActive = false;
      };
    }, [topicId]),
  );

  async function handleSave() {
    const trimmedContent = content.trim();

    if (!trimmedContent) {
      setError('Topic is required.');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      await updateTopic(topicId, {
        category: category.trim() || undefined,
        content: trimmedContent,
        importance: Number(importance),
        tone,
      });

      if (conversationId) {
        router.replace({ pathname: '/conversations/[id]', params: { id: String(conversationId) } });
      } else if (personId) {
        router.replace({ pathname: '/people/[id]', params: { id: String(personId) } });
      } else {
        router.replace('/');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save topic.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <FormScreen
      eyebrow="Edit topic"
      title="Update this talking point."
      error={error}
      isSaving={isSaving}
      onSave={handleSave}>
      <TextField
        label="Topic"
        value={content}
        onChangeText={setContent}
        placeholder="Ask about the new job"
        multiline
        textAlignVertical="top"
        style={formControlStyles.notesInput}
      />
      <TextField
        label="Category"
        value={category}
        onChangeText={setCategory}
        placeholder="Work, family, travel"
      />
      <SegmentedField label="Tone" options={toneOptions} value={tone} onChange={setTone} />
      <SegmentedField label="Importance" options={importanceOptions} value={importance} onChange={setImportance} />
    </FormScreen>
  );
}
