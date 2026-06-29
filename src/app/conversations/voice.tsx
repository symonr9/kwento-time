import { RecordingPresets, useAudioRecorder, useAudioRecorderState } from 'expo-audio';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { FormScreen } from '@/components/ui/form-screen';
import { SelectableChipField, TextField, formControlStyles } from '@/components/ui/form-controls';
import { Radius, Spacing } from '@/constants/theme';
import { logStructuredConversation } from '@/db/queries/conversations';
import { getAllPeople } from '@/db/queries/people';
import { getAllPlaces } from '@/db/queries/places';
import type { NewConversation, Person, Place } from '@/db/schema';
import { useTheme } from '@/hooks/use-theme';
import {
  ensureAudioRecordingPermission,
  finishAudioRecordingSession,
  prepareAudioRecordingSession,
} from '@/services/audio';

function splitLines(value: string) {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

function fallbackSummary(rawTranscript: string) {
  const normalized = rawTranscript.replace(/\s+/g, ' ').trim();
  return normalized.length > 180 ? `${normalized.slice(0, 177)}...` : normalized;
}

function formatDuration(durationMillis: number) {
  const totalSeconds = Math.floor(durationMillis / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export default function VoiceConversationScreen() {
  const theme = useTheme();
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder, 250);
  const [summary, setSummary] = useState('');
  const [rawTranscript, setRawTranscript] = useState('');
  const [topics, setTopics] = useState('');
  const [followUps, setFollowUps] = useState('');
  const [recordingUri, setRecordingUri] = useState<string | null>(null);
  const [people, setPeople] = useState<Person[]>([]);
  const [places, setPlaces] = useState<Place[]>([]);
  const [selectedPersonId, setSelectedPersonId] = useState<number | null>(null);
  const [selectedPlaceId, setSelectedPlaceId] = useState<number | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      async function loadFormOptions() {
        try {
          const [peopleRows, placeRows] = await Promise.all([getAllPeople(), getAllPlaces()]);
          if (isActive) {
            setPeople(peopleRows);
            setPlaces(placeRows);
          }
        } catch (err) {
          if (isActive) {
            setError(err instanceof Error ? err.message : 'Unable to load form options.');
          }
        }
      }

      void loadFormOptions();

      return () => {
        isActive = false;
        if (recorder.isRecording) {
          void recorder.stop().finally(finishAudioRecordingSession);
        }
      };
    }, [recorder]),
  );

  async function handleStartRecording() {
    setIsStarting(true);
    setError(null);

    try {
      const hasPermission = await ensureAudioRecordingPermission();

      if (!hasPermission) {
        setError('Microphone permission is required to record a conversation.');
        return;
      }

      await prepareAudioRecordingSession();
      await recorder.prepareToRecordAsync();
      recorder.record();
      setRecordingUri(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to start recording.');
      await finishAudioRecordingSession();
    } finally {
      setIsStarting(false);
    }
  }

  async function handleStopRecording() {
    setIsStopping(true);
    setError(null);

    try {
      await recorder.stop();
      const nextUri = recorder.uri ?? recorder.getStatus().url;

      if (!nextUri) {
        setError('Recording finished, but no audio file URI was returned.');
        return;
      }

      setRecordingUri(nextUri);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to stop recording.');
    } finally {
      await finishAudioRecordingSession();
      setIsStopping(false);
    }
  }

  async function handleSave() {
    const trimmedSummary = summary.trim();
    const trimmedTranscript = rawTranscript.trim();
    const finalSummary = trimmedSummary || fallbackSummary(trimmedTranscript);

    if (!recordingUri) {
      setError('Record audio before saving this voice conversation.');
      return;
    }

    if (!finalSummary) {
      setError('Add a transcript or summary before saving.');
      return;
    }

    const conversation: NewConversation = {
      audioUri: recordingUri,
      placeId: selectedPlaceId ?? undefined,
      rawTranscript: trimmedTranscript || finalSummary,
      summary: finalSummary,
      personId: selectedPersonId ?? undefined,
      source: 'voice',
    };

    setIsSaving(true);
    setError(null);

    try {
      const savedConversation = await logStructuredConversation({
        conversation,
        followUps: splitLines(followUps),
        placeId: selectedPlaceId,
        topics: splitLines(topics),
      });
      router.replace({
        pathname: '/conversations/[id]',
        params: { id: String(savedConversation.id) },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save voice conversation.');
    } finally {
      setIsSaving(false);
    }
  }

  const isRecording = recorderState.isRecording;
  const personOptions = [
    { label: 'No person', value: null },
    ...people.map((person) => ({ label: person.name, value: person.id })),
  ];
  const placeOptions = [
    { label: 'No place', value: null },
    ...places.map((place) => ({ label: place.name, value: place.id })),
  ];

  return (
    <FormScreen
      eyebrow="Voice conversation"
      title="Record, review, save."
      error={error}
      isSaving={isSaving}
      onSave={handleSave}>
      <View
        style={[
          styles.recorderPanel,
          {
            backgroundColor: isRecording ? theme.accentMuted : theme.primaryMuted,
            borderColor: theme.border,
          },
        ]}>
        <View style={styles.recorderHeader}>
          <View>
            <ThemedText type="smallBold">{isRecording ? 'Recording' : 'Voice note'}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {isRecording ? formatDuration(recorderState.durationMillis) : recordingUri ? 'Audio captured' : 'Ready'}
            </ThemedText>
          </View>
          {isStarting || isStopping ? <ActivityIndicator color={theme.primary} /> : null}
        </View>

        <Pressable
          accessibilityRole="button"
          disabled={isStarting || isStopping}
          onPress={isRecording ? handleStopRecording : handleStartRecording}
          style={({ pressed }) => [
            styles.recordButton,
            {
              backgroundColor: isRecording ? theme.accent : theme.primary,
              opacity: pressed || isStarting || isStopping ? 0.78 : 1,
            },
          ]}>
          <ThemedText type="smallBold" style={styles.recordButtonText}>
            {isRecording ? 'Stop recording' : recordingUri ? 'Record again' : 'Start recording'}
          </ThemedText>
        </Pressable>

        {recordingUri ? (
          <ThemedText type="small" themeColor="textSecondary" selectable>
            {recordingUri}
          </ThemedText>
        ) : null}
      </View>

      <TextField
        label="Transcript"
        value={rawTranscript}
        onChangeText={setRawTranscript}
        placeholder="Add or paste the transcript before saving."
        multiline
        textAlignVertical="top"
        style={formControlStyles.notesInput}
      />

      <TextField
        label="Summary"
        value={summary}
        onChangeText={setSummary}
        placeholder="Optional if the transcript captures the note."
        multiline
        textAlignVertical="top"
        style={formControlStyles.notesInput}
      />

      <SelectableChipField
        label="Person"
        options={personOptions}
        value={selectedPersonId}
        onChange={setSelectedPersonId}
      />

      <SelectableChipField
        label="Place"
        description="Optional. Saved directly on the conversation and linked to the person when one is selected."
        options={placeOptions}
        value={selectedPlaceId}
        onChange={setSelectedPlaceId}
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
        placeholder="One question to ask next time per line"
        multiline
        textAlignVertical="top"
        style={formControlStyles.notesInput}
      />
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  recorderPanel: {
    gap: Spacing.two,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.small,
    padding: Spacing.three,
  },
  recorderHeader: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  recordButton: {
    minHeight: 48,
    borderRadius: Radius.medium,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
  },
  recordButtonText: {
    color: '#FFFFFF',
  },
});
