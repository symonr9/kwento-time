import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { useColorScheme } from 'react-native';

import { MigrationGate } from '@/db/migrate';

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <MigrationGate>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="conversations/new" options={{ headerShown: false }} />
          <Stack.Screen name="my-life/new" options={{ headerShown: false }} />
          <Stack.Screen name="people/new" options={{ headerShown: false }} />
          <Stack.Screen name="places/new" options={{ headerShown: false }} />
          <Stack.Screen name="settings" options={{ headerShown: false }} />
          {/* Add screens here as you build them, e.g.
              <Stack.Screen name="person/[id]" options={{ title: 'Person' }} /> */}
        </Stack>
      </MigrationGate>
    </ThemeProvider>
  );
}
