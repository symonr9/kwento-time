import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { SegmentedField, TextField, formControlStyles } from '@/components/ui/form-controls';
import { FormScreen } from '@/components/ui/form-screen';
import { SearchableChipSelector } from '@/components/ui/searchable-chip-selector';
import { getConversationById } from '@/db/queries/conversations';
import { createFollowUp } from '@/db/queries/follow-ups';
import { getAllPeople } from '@/db/queries/people';
import type { FollowUp, NewFollowUp, Person } from '@/db/schema';

const toneOptions: { label: string; value: FollowUp['tone'] }[] = [
  { label: 'Light', value: 'light' },
  { label: 'Medium', value: 'medium' },
  { label: 'Personal', value: 'personal' },
];

function parseNumericParam(value: string | string[] | undefined) {
  const rawValue = Array.isArray(value) ? value[0] : value;
  const numericValue = Number(rawValue);
  return Number.isInteger(numericValue) && numericValue > 0 ? numericValue : null;
}

export default function NewFollowUpScreen() {
  const params = useLocalSearchParams<{ conversationId?: string; personId?: string }>();
  const conversationId = parseNumericParam(params.conversationId);
  const requestedPersonId = parseNumericParam(params.personId);
  const isPersonContext = requestedPersonId !== null;
  const [people, setPeople] = useState<Person[]>([]);
  const [question, setQuestion] = useState('');
  const [tone, setTone] = useState<FollowUp['tone']>('light');
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
            setError(err instanceof Error ? err.message : 'Unable to load follow-up form.');
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
    const trimmedQuestion = question.trim();

    if (!trimmedQuestion) {
      setError('Follow-up question is required.');
      return;
    }

    const followUp: NewFollowUp = {
      question: trimmedQuestion,
      conversationId: conversationId ?? undefined,
      personId: selectedPersonId ?? undefined,
      tone,
    };

    setIsSaving(true);
    setError(null);

    try {
      await createFollowUp(followUp);
      if (selectedPersonId) {
        router.replace({ pathname: '/people/[id]', params: { id: String(selectedPersonId) } });
      } else {
        router.replace('/');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save follow-up.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <FormScreen
      subtitle="New follow-up"
      title="Remember what to ask."
      error={error}
      isSaving={isSaving}
      onSave={handleSave}>
      <TextField
        label="Question"
        value={question}
        onChangeText={setQuestion}
        placeholder="Ask how the move went"
        multiline
        textAlignVertical="top"
        style={formControlStyles.notesInput}
      />

      <SegmentedField label="Tone" options={toneOptions} value={tone} onChange={setTone} />

      {!isPersonContext ? (
        <SearchableChipSelector
          label="Person"
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
      ) : null}
    </FormScreen>
  );
}
