import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { useColorScheme } from 'react-native';

import { MigrationGate } from '@/db/migrate';
import { BiometricGate } from '@/features/auth/biometric-gate';

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <MigrationGate>
        <BiometricGate>
          <Stack>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="conversations/[id]/edit" options={{ headerShown: false }} />
            <Stack.Screen name="conversations/[id]" options={{ headerShown: false }} />
            <Stack.Screen name="conversations/new" options={{ headerShown: false }} />
            <Stack.Screen name="forecast/index" options={{ headerShown: false }} />
            <Stack.Screen name="follow-ups/[id]" options={{ headerShown: false }} />
            <Stack.Screen name="follow-ups/new" options={{ headerShown: false }} />
            <Stack.Screen name="my-life/new" options={{ headerShown: false }} />
            <Stack.Screen name="people/[id]" options={{ headerShown: false }} />
            <Stack.Screen name="people/new" options={{ headerShown: false }} />
            <Stack.Screen name="places/[id]" options={{ headerShown: false }} />
            <Stack.Screen name="places/new" options={{ headerShown: false }} />
            <Stack.Screen name="settings" options={{ headerShown: false }} />
            <Stack.Screen name="topics/[id]" options={{ headerShown: false }} />
            <Stack.Screen name="topics/new" options={{ headerShown: false }} />
            {/* Add screens here as you build them, e.g.
              <Stack.Screen name="person/[id]" options={{ title: 'Person' }} /> */}
          </Stack>
        </BiometricGate>
      </MigrationGate>
    </ThemeProvider>
  );
}
