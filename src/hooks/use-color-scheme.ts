import { useAppearancePreference } from '@/hooks/use-appearance-preference';

export function useColorScheme() {
  return useAppearancePreference().effectiveScheme;
}
