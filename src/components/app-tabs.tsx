import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { StyleSheet, View, useColorScheme } from 'react-native';

import { FloatingAddPersonButton } from '@/components/ui/floating-add-person-button';
import { Colors } from '@/constants/theme';

export default function AppTabs() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'unspecified' ? 'light' : scheme];

  return (
    <View style={styles.container}>
      <NativeTabs
        backgroundColor={colors.background}
        indicatorColor={colors.backgroundSelected}
        labelStyle={{ default: { fontSize: 11 }, selected: { color: colors.text, fontSize: 11 } }}>
        <NativeTabs.Trigger name="index">
          <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon
            sf={{ default: 'house', selected: 'house.fill' }}
            md={{ default: 'home', selected: 'home_filled' }}
            selectedColor={colors.primary}
          />
        </NativeTabs.Trigger>

        <NativeTabs.Trigger name="people">
          <NativeTabs.Trigger.Label>People</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon
            sf={{ default: 'person.2', selected: 'person.2.fill' }}
            md={{ default: 'group', selected: 'groups' }}
            selectedColor={colors.accent}
          />
        </NativeTabs.Trigger>

        <NativeTabs.Trigger name="places">
          <NativeTabs.Trigger.Label>Places</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon
            sf={{ default: 'map', selected: 'map.fill' }}
            md="map"
            selectedColor={colors.highlight}
          />
        </NativeTabs.Trigger>
      </NativeTabs>
      <FloatingAddPersonButton />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
