import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';

export function EmptyState({ body, title }: { body?: string; title: string }) {
  return (
    <View style={styles.emptyState}>
      <ThemedText type="smallBold">{title}</ThemedText>
      {body ? (
        <ThemedText themeColor="textSecondary">
          {body}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  emptyState: {
    gap: Spacing.one,
    paddingVertical: Spacing.two,
  },
});
