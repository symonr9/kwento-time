import { StyleSheet, TextInput, type TextInputProps } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function SearchField({ style, ...props }: TextInputProps) {
  const theme = useTheme();

  return (
    <TextInput
      autoCapitalize="none"
      placeholderTextColor={theme.textSecondary}
      style={[
        styles.input,
        {
          backgroundColor: theme.background,
          borderColor: theme.border,
          color: theme.text,
        },
        style,
      ]}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    minHeight: 44,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.small,
    borderCurve: 'continuous',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
  },
});
