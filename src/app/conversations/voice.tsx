import { RecordingPresets, useAudioRecorder, useAudioRecorderState } from 'expo-audio';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { FormScreen } from '@/components/ui/form-screen';
import { Radius, Spacing } from '@/constants/theme';
import { logConversation } from '@/db/queries/conversations';
import { useTheme } from '@/hooks/use-theme';
import {
  ensureAudioRecordingPermission,
  finishAudioRecordingSession,
  prepareAudioRecordingSession,
} from '@/services/audio';

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
  const [recordingUri, setRecordingUri] = useState<string | null>(null);
  const [draftConversationId, setDraftConversationId] = useState<number | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      return () => {
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
      setDraftConversationId(null);
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
      await saveDraftConversation(nextUri);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to stop recording.');
    } finally {
      await finishAudioRecordingSession();
      setIsStopping(false);
    }
  }

  async function saveDraftConversation(audioUri: string) {
    if (draftConversationId) {
      router.replace({
        pathname: '/conversations/[id]/review',
        params: { id: String(draftConversationId) },
      });
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const savedConversation = await logConversation({
        audioUri,
        structureStatus: 'not_needed',
        source: 'voice',
        transcriptStatus: 'pending_transcription',
      });
      setDraftConversationId(savedConversation.id);
      router.replace({
        pathname: '/conversations/[id]/review',
        params: { id: String(savedConversation.id) },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save recorded audio.');
    } finally {
      setIsSaving(false);
    }
  }

  const isRecording = recorderState.isRecording;

  return (
    <FormScreen
      subtitle="Voice conversation"
      title="Record the audio."
      error={error}
      isSaving={isSaving}
      saveLabel="Review transcript"
      onSave={() => {
        if (!recordingUri) {
          setError('Record audio before reviewing.');
          return;
        }

        void saveDraftConversation(recordingUri);
      }}>
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
          <ThemedText type="smallBold" themeColor={isRecording ? 'onAccent' : 'onPrimary'}>
            {isRecording ? 'Stop recording' : recordingUri ? 'Record again' : 'Start recording'}
          </ThemedText>
        </Pressable>

        {recordingUri ? (
          <ThemedText type="small" themeColor="textSecondary" selectable>
            {recordingUri}
          </ThemedText>
        ) : null}
      </View>
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
});
