import { Link } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BottomTabInset, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function FloatingAddPersonButton() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Link href="/people/new" asChild>
      <Pressable
        accessibilityLabel="Add person"
        accessibilityRole="button"
        style={({ pressed }) => [
          styles.button,
          {
            backgroundColor: theme.primary,
            bottom: BottomTabInset + Math.max(insets.bottom, Spacing.two),
            opacity: pressed ? 0.78 : 1,
          },
        ]}>
        <SymbolView
          name={{ ios: 'plus', android: 'add', web: 'add' }}
          size={28}
          tintColor="#FFFFFF"
          fallback={<View style={styles.fallbackIcon} />}
        />
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  button: {
    position: 'absolute',
    right: Spacing.three,
    zIndex: 20,
    width: 58,
    height: 58,
    borderRadius: 29,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 14px 28px rgba(36, 48, 58, 0.2)',
  },
  fallbackIcon: {
    width: 22,
    height: 22,
    borderRadius: Radius.small,
    backgroundColor: '#FFFFFF',
  },
});
