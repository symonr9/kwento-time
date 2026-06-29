import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { SegmentedField, TextField, formControlStyles } from '@/components/ui/form-controls';
import { FormScreen } from '@/components/ui/form-screen';
import { Radius, Spacing } from '@/constants/theme';
import { getConversationById } from '@/db/queries/conversations';
import { getAllPeople } from '@/db/queries/people';
import { createTopic } from '@/db/queries/topics';
import type { NewTopic, Person, Topic } from '@/db/schema';
import { useTheme } from '@/hooks/use-theme';

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

function parseNumericParam(value: string | string[] | undefined) {
  const rawValue = Array.isArray(value) ? value[0] : value;
  const numericValue = Number(rawValue);
  return Number.isInteger(numericValue) && numericValue > 0 ? numericValue : null;
}

export default function NewTopicScreen() {
  const theme = useTheme();
  const params = useLocalSearchParams<{ conversationId?: string; personId?: string }>();
  const conversationId = parseNumericParam(params.conversationId);
  const requestedPersonId = parseNumericParam(params.personId);
  const [people, setPeople] = useState<Person[]>([]);
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('');
  const [tone, setTone] = useState<Topic['tone']>('light');
  const [importance, setImportance] = useState<'1' | '2' | '3'>('1');
  const [selectedPersonId, setSelectedPersonId] = useState<number | null>(requestedPersonId);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      async function loadFormOptions() {
        setError(null);

        try {
          const [peopleRows, conversation] = await Promise.all([
            getAllPeople(),
            conversationId ? getConversationById(conversationId) : Promise.resolve(undefined),
          ]);

          if (isActive) {
            setPeople(peopleRows);
            setSelectedPersonId(requestedPersonId ?? conversation?.personId ?? null);
          }
        } catch (err) {
          if (isActive) {
            setError(err instanceof Error ? err.message : 'Unable to load topic form.');
          }
        }
      }

      void loadFormOptions();

      return () => {
        isActive = false;
      };
    }, [conversationId, requestedPersonId]),
  );

  async function handleSave() {
    const trimmedContent = content.trim();

    if (!trimmedContent) {
      setError('Topic is required.');
      return;
    }

    const topic: NewTopic = {
      category: category.trim() || undefined,
      content: trimmedContent,
      conversationId: conversationId ?? undefined,
      importance: Number(importance),
      personId: selectedPersonId ?? undefined,
      tone,
    };

    setIsSaving(true);
    setError(null);

    try {
      await createTopic(topic);
      if (conversationId) {
        router.replace({ pathname: '/conversations/[id]', params: { id: String(conversationId) } });
      } else if (selectedPersonId) {
        router.replace({ pathname: '/people/[id]', params: { id: String(selectedPersonId) } });
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
      subtitle="New topic"
      title="Save a talking point."
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
