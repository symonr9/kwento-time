import { Image } from 'expo-image';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';

type AvatarProps = {
  name: string;
  size?: number;
  uri?: string | null;
  style?: StyleProp<ViewStyle>;
};

function getInitial(name: string) {
  return name.trim().slice(0, 1).toUpperCase() || '?';
}

export function Avatar({ name, size = 40, style, uri }: AvatarProps) {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.avatar,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: theme.primaryMuted,
        },
        style,
      ]}>
      {uri ? (
        <Image source={{ uri }} style={styles.image} contentFit="cover" />
      ) : (
        <ThemedText type="smallBold">{getInitial(name)}</ThemedText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
});
