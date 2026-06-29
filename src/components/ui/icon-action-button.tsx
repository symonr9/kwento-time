import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { Pressable, StyleSheet, View, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing, type ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type IconActionButtonProps = PressableProps & {
  icon: SymbolViewProps['name'];
  label: string;
  tone?: ThemeColor;
  style?: StyleProp<ViewStyle>;
};

export function IconActionButton({
  disabled,
  icon,
  label,
  onPress,
  style,
  tone = 'backgroundElement',
  ...props
}: IconActionButtonProps) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: theme[tone],
          borderColor: theme.border,
          opacity: pressed || disabled ? 0.72 : 1,
        },
        style,
      ]}
      {...props}>
      <View style={[styles.iconFrame, { backgroundColor: theme.background }]}>
        <SymbolView
          name={icon}
          size={20}
          tintColor={theme.text}
          fallback={<ThemedText type="smallBold">{label.slice(0, 1)}</ThemedText>}
        />
      </View>
      <ThemedText type="smallBold" style={styles.label}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 52,
    minWidth: 148,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.small,
    borderCurve: 'continuous',
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.two,
  },
  iconFrame: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.small,
    borderCurve: 'continuous',
  },
  label: {
    flex: 1,
    minWidth: 0,
  },
});
