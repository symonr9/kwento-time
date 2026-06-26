import { StyleSheet, View, type ViewProps } from 'react-native';

import { Radius, Spacing, type ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type SurfaceCardProps = ViewProps & {
  tone?: ThemeColor;
};

export function SurfaceCard({ style, tone = 'backgroundElement', ...props }: SurfaceCardProps) {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme[tone],
          borderColor: theme.border,
        },
        style,
      ]}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.medium,
    borderCurve: 'continuous',
    padding: Spacing.three,
    gap: Spacing.two,
    boxShadow: '0 8px 24px rgba(36, 48, 58, 0.08)',
  },
});
