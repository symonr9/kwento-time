import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { TextField, formControlStyles } from '@/components/ui/form-controls';
import { FormScreen } from '@/components/ui/form-screen';
import { Radius, Spacing } from '@/constants/theme';
import { getConversationById } from '@/db/queries/conversations';
import { createFollowUp } from '@/db/queries/follow-ups';
import { getAllPeople } from '@/db/queries/people';
import type { NewFollowUp, Person } from '@/db/schema';
import { useTheme } from '@/hooks/use-theme';

function parseNumericParam(value: string | string[] | undefined) {
  const rawValue = Array.isArray(value) ? value[0] : value;
  const numericValue = Number(rawValue);
  return Number.isInteger(numericValue) && numericValue > 0 ? numericValue : null;
}

export default function NewFollowUpScreen() {
  const theme = useTheme();
  const params = useLocalSearchParams<{ conversationId?: string; personId?: string }>();
  const conversationId = parseNumericParam(params.conversationId);
  const requestedPersonId = parseNumericParam(params.personId);
  const [people, setPeople] = useState<Person[]>([]);
  const [question, setQuestion] = useState('');
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
