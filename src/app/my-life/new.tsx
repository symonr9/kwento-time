import { router } from 'expo-router';
import { useEffect, useState } from 'react';

import { SegmentedField, TextField, formControlStyles } from '@/components/ui/form-controls';
import { FormScreen } from '@/components/ui/form-screen';
import { TagSelector } from '@/components/ui/tag-selector';
import { createMyLifeItem } from '@/db/queries/my-life';
import { createTag, getAllTags, setTagsForItem } from '@/db/queries/tags';
import type { MyLifeTone, NewMyLifeItem, Tag } from '@/db/schema';

const toneOptions: { label: string; value: MyLifeTone }[] = [
  { label: 'Light', value: 'light' },
  { label: 'Medium', value: 'medium' },
  { label: 'Personal', value: 'personal' },
];

export default function NewMyLifeItemScreen() {
  const [content, setContent] = useState('');
  const [tone, setTone] = useState<MyLifeTone>('light');
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [newTagName, setNewTagName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    async function loadTags() {
      try {
        const rows = await getAllTags();
        if (isActive) {
          setTags(rows);
        }
      } catch (err) {
        if (isActive) {
          setError(err instanceof Error ? err.message : 'Unable to load tags.');
        }
      }
    }

    void loadTags();

    return () => {
      isActive = false;
    };
  }, []);

  async function handleCreateTag() {
    const name = newTagName.trim();
    if (!name) return;

    try {
      const tag = await createTag({ name });
      setTags((current) => [...current, tag].sort((a, b) => a.name.localeCompare(b.name)));
      setSelectedTagIds((current) => [...current, tag.id]);
      setNewTagName('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to add tag.');
    }
  }

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
      const savedItem = await createMyLifeItem(item);
      await setTagsForItem('my_life_item', savedItem.id, selectedTagIds);
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
      <TagSelector
        availableTags={tags}
        newTagName={newTagName}
        selectedTagIds={selectedTagIds}
        onAddTag={() => void handleCreateTag()}
        onNewTagNameChange={setNewTagName}
        onSelectedTagIdsChange={setSelectedTagIds}
      />
    </FormScreen>
  );
}
