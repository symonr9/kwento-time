import { router } from 'expo-router';
import { useState } from 'react';

import { SegmentedField, TextField, formControlStyles } from '@/components/ui/form-controls';
import { FormScreen } from '@/components/ui/form-screen';
import { createMyLifeItem } from '@/db/queries/my-life';
import type { MyLifeTone, NewMyLifeItem } from '@/db/schema';

const toneOptions: { label: string; value: MyLifeTone }[] = [
  { label: 'Light', value: 'light' },
  { label: 'Medium', value: 'medium' },
  { label: 'Personal', value: 'personal' },
];

export default function NewMyLifeItemScreen() {
  const [content, setContent] = useState('');
  const [tone, setTone] = useState<MyLifeTone>('light');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    const trimmedContent = content.trim();

    if (!trimmedContent) {
      setError('Life update is required.');
      return;
    }

    const item: NewMyLifeItem = {
      content: trimmedContent,
      tone,
    };

    setIsSaving(true);
    setError(null);

    try {
      await createMyLifeItem(item);
      router.replace('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save life update.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <FormScreen
      subtitle="How are you?"
      title="Record what is current."
      error={error}
      isSaving={isSaving}
      onSave={handleSave}>
      <TextField
        label="Life update"
        value={content}
        onChangeText={setContent}
        placeholder="What has been happening recently?"
        multiline
        textAlignVertical="top"
        style={formControlStyles.notesInput}
      />
      <SegmentedField label="Tone" options={toneOptions} value={tone} onChange={setTone} />
    </FormScreen>
  );
}
