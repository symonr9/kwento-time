import { Lora_500Medium, Lora_700Bold } from '@expo-google-fonts/lora';
import { SourceSans3_400Regular, SourceSans3_700Bold } from '@expo-google-fonts/source-sans-3';
import { Urbanist_500Medium, Urbanist_600SemiBold, Urbanist_700Bold } from '@expo-google-fonts/urbanist';
import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { useColorScheme } from 'react-native';

import { AppSplash } from '@/components/ui/app-splash';
import { MigrationGate } from '@/db/migrate';
import { BiometricGate } from '@/features/auth/biometric-gate';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [fontsLoaded] = useFonts({
    Lora_500Medium,
    Lora_700Bold,
    SourceSans3_400Regular,
    SourceSans3_700Bold,
    Urbanist_500Medium,
    Urbanist_600SemiBold,
    Urbanist_700Bold,
  });

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      {!fontsLoaded ? (
        <AppSplash message="Loading type..." />
      ) : (
        <MigrationGate>
          <BiometricGate>
            <Stack>
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="conversations/[id]/edit" options={{ headerShown: false }} />
              <Stack.Screen name="conversations/[id]/review" options={{ headerShown: false }} />
              <Stack.Screen name="conversations/[id]/structure" options={{ headerShown: false }} />
              <Stack.Screen name="conversations/[id]" options={{ headerShown: false }} />
              <Stack.Screen name="conversations/new" options={{ headerShown: false }} />
              <Stack.Screen name="conversations/voice" options={{ headerShown: false }} />
              <Stack.Screen name="forecast/index" options={{ headerShown: false }} />
              <Stack.Screen name="follow-ups/[id]" options={{ headerShown: false }} />
              <Stack.Screen name="follow-ups/new" options={{ headerShown: false }} />
              <Stack.Screen name="my-life/new" options={{ headerShown: false }} />
              <Stack.Screen name="people/[id]/edit" options={{ headerShown: false }} />
              <Stack.Screen name="people/[id]" options={{ headerShown: false }} />
              <Stack.Screen name="people/new" options={{ headerShown: false }} />
              <Stack.Screen name="places/[id]/edit" options={{ headerShown: false }} />
              <Stack.Screen name="places/[id]" options={{ headerShown: false }} />
              <Stack.Screen name="places/new" options={{ headerShown: false }} />
              <Stack.Screen name="settings" options={{ headerShown: false }} />
              <Stack.Screen name="tags/index" options={{ headerShown: false }} />
              <Stack.Screen name="topics/[id]" options={{ headerShown: false }} />
              <Stack.Screen name="topics/new" options={{ headerShown: false }} />
              {/* Add screens here as you build them, e.g.
                <Stack.Screen name="person/[id]" options={{ title: 'Person' }} /> */}
            </Stack>
          </BiometricGate>
        </MigrationGate>
      )}
    </ThemeProvider>
  );
}
