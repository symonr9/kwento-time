import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type AvatarPickerProps = {
  label: string;
  name: string;
  uri?: string | null;
  onChange: (uri: string | null) => void;
};

const imagePickerOptions: ImagePicker.ImagePickerOptions = {
  allowsEditing: true,
  aspect: [1, 1],
  mediaTypes: ['images'],
  quality: 0.82,
  shape: 'oval',
};

function getInitial(name: string) {
  return name.trim().slice(0, 1).toUpperCase() || '?';
}

async function persistAvatarUri(uri: string) {
  if (Platform.OS === 'web' || !FileSystem.documentDirectory) {
    return uri;
  }

  const extensionMatch = uri.match(/\.([a-zA-Z0-9]+)(?:\?|#|$)/);
  const extension = extensionMatch?.[1] ?? 'jpg';
  const directory = `${FileSystem.documentDirectory}avatars/`;
  const destination = `${directory}${Date.now()}-${Math.round(Math.random() * 1_000_000)}.${extension}`;

  await FileSystem.makeDirectoryAsync(directory, { intermediates: true });
  await FileSystem.copyAsync({ from: uri, to: destination });
  return destination;
}

export function AvatarPicker({ label, name, onChange, uri }: AvatarPickerProps) {
  const theme = useTheme();
  const [message, setMessage] = useState<string | null>(null);
  const [isPicking, setIsPicking] = useState(false);

  async function handleResult(result: ImagePicker.ImagePickerResult) {
    if (result.canceled) {
      return;
    }

    const asset = result.assets[0];
    if (!asset?.uri) {
      setMessage('No image was selected.');
      return;
    }

    const savedUri = await persistAvatarUri(asset.uri);
    onChange(savedUri);
    setMessage(null);
  }

  async function pickFromLibrary() {
    setIsPicking(true);
    setMessage(null);

    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setMessage('Photo library permission is required to choose an image.');
        return;
      }

      await handleResult(await ImagePicker.launchImageLibraryAsync(imagePickerOptions));
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Unable to choose an image.');
    } finally {
      setIsPicking(false);
    }
  }

  async function takePhoto() {
    setIsPicking(true);
    setMessage(null);

    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        setMessage('Camera permission is required to take a photo.');
        return;
      }

      await handleResult(await ImagePicker.launchCameraAsync(imagePickerOptions));
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Unable to take a photo.');
    } finally {
      setIsPicking(false);
    }
  }

  return (
    <View style={styles.field}>
      <ThemedText type="smallBold">{label}</ThemedText>
      <View style={styles.row}>
        <View style={[styles.avatar, { backgroundColor: theme.primaryMuted }]}>
          {uri ? (
            <Image source={{ uri }} style={styles.avatarImage} contentFit="cover" />
          ) : (
            <ThemedText type="subtitle" style={styles.initial}>
              {getInitial(name)}
            </ThemedText>
          )}
        </View>

        <View style={styles.actions}>
          <View style={styles.buttonRow}>
            <AvatarButton
              disabled={isPicking}
              icon={{ ios: 'photo', android: 'photo_library', web: 'photo_library' }}
              label="Choose"
              onPress={() => void pickFromLibrary()}
            />
            <AvatarButton
              disabled={isPicking}
              icon={{ ios: 'camera', android: 'photo_camera', web: 'photo_camera' }}
              label="Take"
              onPress={() => void takePhoto()}
            />
          </View>
          {uri ? (
            <Pressable
              accessibilityRole="button"
              disabled={isPicking}
              onPress={() => onChange(null)}
              style={({ pressed }) => [
                styles.removeButton,
                {
                  backgroundColor: theme.background,
                  borderColor: theme.border,
                  opacity: pressed || isPicking ? 0.72 : 1,
                },
              ]}>
              <ThemedText type="smallBold" themeColor="textSecondary">
                Remove photo
              </ThemedText>
            </Pressable>
          ) : null}
        </View>
      </View>
      {message ? (
        <ThemedText type="small" themeColor="accent" selectable>
          {message}
        </ThemedText>
      ) : null}
    </View>
  );
}

function AvatarButton({
  disabled,
  icon,
  label,
  onPress,
}: {
  disabled: boolean;
  icon: SymbolViewProps['name'];
  label: string;
  onPress: () => void;
}) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionButton,
        {
          backgroundColor: theme.backgroundElement,
          borderColor: theme.border,
          opacity: pressed || disabled ? 0.72 : 1,
        },
      ]}>
      <SymbolView
        name={icon}
        size={18}
        tintColor={theme.text}
        fallback={<ThemedText type="smallBold">{label.slice(0, 1)}</ThemedText>}
      />
      <ThemedText type="smallBold">{label}</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: Spacing.one,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  initial: {
    lineHeight: 48,
  },
  actions: {
    flex: 1,
    minWidth: 0,
    gap: Spacing.two,
  },
  buttonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  actionButton: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.small,
    borderCurve: 'continuous',
    paddingHorizontal: Spacing.two,
  },
  removeButton: {
    minHeight: 38,
    alignSelf: 'flex-start',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.small,
    borderCurve: 'continuous',
    paddingHorizontal: Spacing.two,
  },
});
