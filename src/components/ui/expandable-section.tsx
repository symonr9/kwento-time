import { SymbolView } from 'expo-symbols';
import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type ExpandableSectionProps = {
  action?: ReactNode;
  children: ReactNode;
  count?: number;
  defaultExpanded?: boolean;
  style?: StyleProp<ViewStyle>;
  title: string;
};

export function ExpandableSection({
  action,
  children,
  count,
  defaultExpanded = true,
  style,
  title,
}: ExpandableSectionProps) {
  const theme = useTheme();
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <View style={[styles.section, style]}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: isExpanded }}
          onPress={() => setIsExpanded((current) => !current)}
          style={({ pressed }) => [
            styles.headerButton,
            {
              opacity: pressed ? 0.72 : 1,
            },
          ]}>
          <SymbolView
            name={{
              ios: isExpanded ? 'chevron.down' : 'chevron.right',
              android: isExpanded ? 'keyboard_arrow_down' : 'keyboard_arrow_right',
              web: isExpanded ? 'keyboard_arrow_down' : 'keyboard_arrow_right',
            }}
            size={18}
            tintColor={theme.textSecondary}
            fallback={
              <ThemedText type="smallBold" themeColor="textSecondary">
                {isExpanded ? 'v' : '>'}
              </ThemedText>
            }
          />
          <ThemedText type="smallBold" style={styles.title}>
            {title}
          </ThemedText>
        </Pressable>

        <View style={styles.headerActions}>
          {typeof count === 'number' ? (
            <View style={[styles.countPill, { backgroundColor: theme.backgroundElement }]}>
              <ThemedText type="small" themeColor="textSecondary">
                {count}
              </ThemedText>
            </View>
          ) : null}
          {action}
        </View>
      </View>

      {isExpanded ? <View style={styles.content}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: Spacing.two,
  },
  header: {
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  headerButton: {
    flex: 1,
    minWidth: 0,
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  title: {
    flex: 1,
    minWidth: 0,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  countPill: {
    minWidth: 28,
    minHeight: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.small,
    borderCurve: 'continuous',
    paddingHorizontal: Spacing.two,
  },
  content: {
    gap: Spacing.two,
  },
});
