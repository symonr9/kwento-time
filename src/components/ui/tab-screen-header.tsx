import { Link } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type TabScreenHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  showSettingsAction?: boolean;
};

export function TabScreenHeader({
  eyebrow,
  title,
  description,
  showSettingsAction = true,
}: TabScreenHeaderProps) {
  const theme = useTheme();

  return (
    <View style={styles.header}>
      <View style={styles.hero}>
        <View style={[styles.headerMark, { backgroundColor: theme.primary }]} />
        {eyebrow ? (
          <ThemedText type="smallBold" themeColor="primary">
            {eyebrow}
          </ThemedText>
        ) : null}
        <ThemedText type={eyebrow ? 'title' : 'subtitle'} themeColor={eyebrow ? undefined : 'primary'}>
          {title}
        </ThemedText>
        {description ? (
          <ThemedText themeColor="textSecondary" style={styles.description}>
            {description}
          </ThemedText>
        ) : null}
      </View>

      {showSettingsAction ? (
        <Link href="/settings" asChild>
          <Pressable
            accessibilityLabel="Open settings"
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.settingsButton,
              {
                backgroundColor: theme.backgroundElement,
                borderColor: theme.border,
                opacity: pressed ? 0.72 : 1,
              },
            ]}>
            <SymbolView
              name={{ ios: 'gearshape', android: 'settings', web: 'settings' }}
              size={20}
              tintColor={theme.text}
              fallback={<View style={[styles.settingsFallback, { backgroundColor: theme.text }]} />}
            />
          </Pressable>
        </Link>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    minHeight: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  hero: {
    flex: 1,
    minWidth: 0,
    gap: Spacing.two,
    paddingBottom: Spacing.three,
  },
  headerMark: {
    width: 40,
    height: 4,
    borderRadius: Radius.small,
  },
  settingsButton: {
    width: 40,
    height: 40,
    borderRadius: Radius.medium,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 8px 18px rgba(36, 48, 58, 0.08)',
  },
  settingsFallback: {
    width: 18,
    height: 18,
    borderRadius: Radius.small,
  },
  description: {
    maxWidth: 640,
  },
});
