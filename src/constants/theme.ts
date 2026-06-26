import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#24303A',
    textSecondary: '#687682',
    background: '#F5F2EB',
    backgroundElement: '#FFFDF7',
    backgroundSelected: '#EDE5D8',
    surfaceMuted: '#ECE6DC',
    border: '#DED5C7',
    primary: '#7A9AB8',
    primaryMuted: '#DDE8F0',
    accent: '#D99B8E',
    accentMuted: '#F4DDD8',
    highlight: '#D1B26E',
    highlightMuted: '#EFE3BF',
  },
  dark: {
    text: '#F5F2EB',
    textSecondary: '#C2CACD',
    background: '#141716',
    backgroundElement: '#1D2325',
    backgroundSelected: '#273034',
    surfaceMuted: '#252A2B',
    border: '#374347',
    primary: '#A8C1D5',
    primaryMuted: '#273A47',
    accent: '#E2B0A6',
    accentMuted: '#47302F',
    highlight: '#DEC581',
    highlightMuted: '#463C22',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const Radius = {
  small: 8,
  medium: 12,
  large: 20,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80, default: 92 }) ?? 92;
export const MaxContentWidth = 800;
