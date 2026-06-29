import { SymbolView } from 'expo-symbols';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function AppSplash({ message = 'Loading...' }: { message?: string }) {
  const theme = useTheme();

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <View style={[styles.mark, { backgroundColor: theme.primaryMuted }]}>
        <SymbolView
          name={{ ios: 'bubble.left.and.text.bubble.right', android: 'chat', web: 'chat' }}
          size={38}
          tintColor={theme.primary}
          fallback={<View style={[styles.markFallback, { backgroundColor: theme.primary }]} />}
        />
      </View>
      <View style={styles.copy}>
        <ThemedText type="title">Kwento Time</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {message}
        </ThemedText>
      </View>
      <ActivityIndicator color={theme.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
    gap: Spacing.three,
  },
  mark: {
    width: 88,
    height: 88,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 44,
  },
  markFallback: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  copy: {
    alignItems: 'center',
    gap: Spacing.one,
  },
});
