import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useColorScheme as useSystemColorScheme, type ColorSchemeName } from 'react-native';

import {
  getAppearanceMode,
  setAppearanceMode,
  type AppearanceMode,
} from '@/services/preferences';

type EffectiveColorScheme = 'light' | 'dark';

type AppearancePreferenceContextValue = {
  effectiveScheme: EffectiveColorScheme;
  mode: AppearanceMode;
  setMode: (mode: AppearanceMode) => Promise<void>;
  systemScheme: EffectiveColorScheme;
};

function normalizeScheme(scheme: ColorSchemeName): EffectiveColorScheme {
  return scheme === 'dark' ? 'dark' : 'light';
}

const AppearancePreferenceContext = createContext<AppearancePreferenceContextValue | null>(null);

export function AppearancePreferenceProvider({ children }: { children: ReactNode }) {
  const systemScheme = normalizeScheme(useSystemColorScheme());
  const [mode, setModeState] = useState<AppearanceMode>('system');

  useEffect(() => {
    let isActive = true;

    async function loadMode() {
      const savedMode = await getAppearanceMode();
      if (isActive) {
        setModeState(savedMode);
      }
    }

    void loadMode();

    return () => {
      isActive = false;
    };
  }, []);

  async function setMode(nextMode: AppearanceMode) {
    setModeState(nextMode);
    await setAppearanceMode(nextMode);
  }

  const effectiveScheme = mode === 'system' ? systemScheme : mode;

  return (
    <AppearancePreferenceContext.Provider value={{ effectiveScheme, mode, setMode, systemScheme }}>
      {children}
    </AppearancePreferenceContext.Provider>
  );
}

export function useAppearancePreference() {
  const context = useContext(AppearancePreferenceContext);
  const systemScheme = normalizeScheme(useSystemColorScheme());

  if (context) {
    return context;
  }

  return {
    effectiveScheme: systemScheme,
    mode: 'system' as const,
    setMode: setAppearanceMode,
    systemScheme,
  };
}
