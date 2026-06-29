import { Link, router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { TextField, formControlStyles } from '@/components/ui/form-controls';
import { FormScreen } from '@/components/ui/form-screen';
import { SearchableChipSelector } from '@/components/ui/searchable-chip-selector';
import { SurfaceCard } from '@/components/ui/surface-card';
import { Radius, Spacing } from '@/constants/theme';
import {
    extendFollowUpExpiry,
    getFollowUpDetails,
    resolveFollowUp,
    updateFollowUp,
} from '@/db/queries/follow-ups';
import { getAllPeople } from '@/db/queries/people';
import type { Person } from '@/db/schema';
import { useTheme } from '@/hooks/use-theme';

function formatShortDate(value: Date | null) {
  if (!value) {
    return 'Not yet';
  }

  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(value);
}

export default function FollowUpDetailsScreen() {
  const theme = useTheme();
  const params = useLocalSearchParams<{ id?: string }>();
  const followUpId = Number(params.id);
  const [people, setPeople] = useState<Person[]>([]);
  const [question, setQuestion] = useState('');
  const [selectedPersonId, setSelectedPersonId] = useState<number | null>(null);
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [conversationSummary, setConversationSummary] = useState<string | null>(null);
  const [resolved, setResolved] = useState(false);
  const [resolvedAt, setResolvedAt] = useState<Date | null>(null);
  const [expiryState, setExpiryState] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [createdAt, setCreatedAt] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadFollowUp = useCallback(
    async (isActive = true) => {
      if (!Number.isInteger(followUpId) || followUpId <= 0) {
        setError('Invalid follow-up.');
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const [followUp, peopleRows] = await Promise.all([
          getFollowUpDetails(followUpId),
          getAllPeople(),
        ]);

        if (isActive) {
          if (!followUp) {
            setError('Follow-up not found.');
            return;
          }

          setPeople(peopleRows);
          setQuestion(followUp.question);
          setSelectedPersonId(followUp.personId);
          setConversationId(followUp.conversationId);
          setConversationSummary(followUp.conversationSummary);
          setResolved(followUp.resolved);
          setResolvedAt(followUp.resolvedAt);
          setExpiryState(followUp.expiryState);
          setExpiresAt(followUp.expiresAt);
          setCreatedAt(followUp.createdAt);
        }
      } catch (err) {
        if (isActive) {
          setError(err instanceof Error ? err.message : 'Unable to load follow-up.');
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    },
    [followUpId],
  );

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      void loadFollowUp(isActive);

      return () => {
        isActive = false;
      };
    }, [loadFollowUp]),
  );

  async function handleSave() {
    const trimmedQuestion = question.trim();

    if (!trimmedQuestion) {
      setError('Follow-up question is required.');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      await updateFollowUp(followUpId, {
        personId: selectedPersonId ?? undefined,
        question: trimmedQuestion,
      });
      if (selectedPersonId) {
        router.replace({ pathname: '/people/[id]', params: { id: String(selectedPersonId) } });
      } else if (conversationId) {
        router.replace({ pathname: '/conversations/[id]', params: { id: String(conversationId) } });
      } else {
        router.replace('/');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save follow-up.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleResolve() {
    setError(null);

    try {
      await resolveFollowUp(followUpId);
      await loadFollowUp();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to resolve follow-up.');
    }
  }

  async function handleExtend() {
    setError(null);

    try {
      await extendFollowUpExpiry(followUpId);
      await loadFollowUp();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to extend follow-up.');
    }
  }

  return (
    <FormScreen
      subtitle="Follow-up"
      title="Edit what to remember."
      error={error}
      isSaving={isSaving}
      onSave={handleSave}>
      {isLoading ? (
        <SurfaceCard style={styles.stateCard}>
          <ActivityIndicator color={theme.primary} />
          <ThemedText themeColor="textSecondary">Loading follow-up...</ThemedText>
        </SurfaceCard>
      ) : null}

      {!isLoading ? (
        <>
          <SurfaceCard style={styles.metaCard}>
            <View style={styles.rowHeader}>
              <ThemedText type="smallBold">{resolved ? 'Resolved' : 'Open'}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Added {formatShortDate(createdAt)}
              </ThemedText>
            </View>
            <ThemedText type="small" themeColor="textSecondary">
              {expiryState ?? 'active'} until {formatShortDate(expiresAt)}
            </ThemedText>
            {resolvedAt ? (
              <ThemedText type="small" themeColor="textSecondary">
                Resolved {formatShortDate(resolvedAt)}
              </ThemedText>
            ) : null}
          </SurfaceCard>

          <TextField
            label="Question"
            value={question}
            onChangeText={setQuestion}
            placeholder="Ask how the move went"
            multiline
            textAlignVertical="top"
            style={formControlStyles.notesInput}
          />

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

          {conversationId ? (
            <SurfaceCard style={styles.metaCard}>
              <ThemedText type="smallBold">Conversation</ThemedText>
              <ThemedText type="small" themeColor="textSecondary" selectable>
                {conversationSummary ?? 'No summary yet'}
              </ThemedText>
              <Link href={{ pathname: '/conversations/[id]', params: { id: String(conversationId) } }} asChild>
                <Pressable
                  accessibilityRole="button"
                  style={({ pressed }) => [
                    styles.secondaryButton,
                    {
                      backgroundColor: theme.backgroundSelected,
                      opacity: pressed ? 0.72 : 1,
                    },
                  ]}>
                  <ThemedText type="smallBold">Open conversation</ThemedText>
                </Pressable>
              </Link>
            </SurfaceCard>
          ) : null}

          <View style={styles.actionRow}>
            {!resolved ? (
              <Pressable
                accessibilityRole="button"
                onPress={handleResolve}
                style={({ pressed }) => [
                  styles.secondaryButton,
                  {
                    backgroundColor: theme.backgroundSelected,
                    opacity: pressed ? 0.72 : 1,
                  },
                ]}>
                <ThemedText type="smallBold">Mark resolved</ThemedText>
              </Pressable>
            ) : null}
            <Pressable
              accessibilityRole="button"
              onPress={handleExtend}
              style={({ pressed }) => [
                styles.secondaryButton,
                {
                  backgroundColor: theme.backgroundSelected,
                  opacity: pressed ? 0.72 : 1,
                },
              ]}>
              <ThemedText type="smallBold">Extend</ThemedText>
            </Pressable>
          </View>
        </>
      ) : null}
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  metaCard: {
    gap: Spacing.two,
  },
  rowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  secondaryButton: {
    flexGrow: 1,
    minHeight: 40,
    borderRadius: Radius.small,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
  },
  stateCard: {
    alignItems: 'center',
  },
});
