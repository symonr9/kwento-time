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

export const FontPairings = {
  kwento: {
    title: 'Urbanist_700Bold',
    default: 'SourceSans3_400Regular',
    emphasis: 'Lora_500Medium',
    bold: 'SourceSans3_700Bold',
    mono: Platform.select({ ios: 'ui-monospace', default: 'monospace' }) ?? 'monospace',
  },
  crisp: {
    title: 'Urbanist_600SemiBold',
    default: 'SourceSans3_400Regular',
    emphasis: 'Urbanist_500Medium',
    bold: 'SourceSans3_700Bold',
    mono: Platform.select({ ios: 'ui-monospace', default: 'monospace' }) ?? 'monospace',
  },
  editorial: {
    title: 'Lora_700Bold',
    default: 'SourceSans3_400Regular',
    emphasis: 'Urbanist_600SemiBold',
    bold: 'SourceSans3_700Bold',
    mono: Platform.select({ ios: 'ui-monospace', default: 'monospace' }) ?? 'monospace',
  },
} as const;

export const ActiveFontPairingName: keyof typeof FontPairings = 'kwento';
export const Fonts = FontPairings[ActiveFontPairingName];

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

export const ACTION_SYMBOLS = {
  conversation: {
    ios: 'bubble.left.and.bubble.right',
    android: 'chat',
    web: 'chat',
  },
  voiceNote: {
    ios: 'mic',
    android: 'mic',
    web: 'mic',
  },
  briefing: {
    ios: 'doc.text',
    android: 'article',
    web: 'article',
  },
  lifeUpdate: {
    ios: 'sparkles',
    android: 'auto_awesome',
    web: 'auto_awesome',
  },
  scheduleReminder: {
    ios: 'calendar.badge.clock',
    android: 'event',
    web: 'event',
  },
}; 
