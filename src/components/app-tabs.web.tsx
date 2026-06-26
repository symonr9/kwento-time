import {
  Tabs,
  TabList,
  TabTrigger,
  TabSlot,
  TabTriggerSlotProps,
  TabListProps,
} from 'expo-router/ui';
import { SymbolView } from 'expo-symbols';
import { Pressable, View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const tabs = [
  { name: 'home', href: '/', label: 'Home', icon: { ios: 'house', android: 'home', web: 'home' } },
  {
    name: 'people',
    href: '/people',
    label: 'People',
    icon: { ios: 'person.2', android: 'group', web: 'group' },
  },
  { name: 'places', href: '/places', label: 'Places', icon: { ios: 'map', android: 'map', web: 'map' } },
  {
    name: 'settings',
    href: '/settings',
    label: 'Settings',
    icon: { ios: 'gearshape', android: 'settings', web: 'settings' },
  },
] as const;

export default function AppTabs() {
  return (
    <Tabs>
      <TabSlot style={{ height: '100%' }} />
      <TabList asChild>
        <CustomTabList>
          {tabs.map((tab) => (
            <TabTrigger key={tab.name} name={tab.name} href={tab.href} asChild>
              <TabButton icon={tab.icon}>{tab.label}</TabButton>
            </TabTrigger>
          ))}
        </CustomTabList>
      </TabList>
    </Tabs>
  );
}

type TabButtonProps = TabTriggerSlotProps & {
  icon: (typeof tabs)[number]['icon'];
};

export function TabButton({ children, icon, isFocused, ...props }: TabButtonProps) {
  const theme = useTheme();

  return (
    <Pressable {...props} style={({ pressed }) => pressed && styles.pressed}>
      <ThemedView
        type={isFocused ? 'backgroundSelected' : 'backgroundElement'}
        style={styles.tabButtonView}>
        <SymbolView
          name={icon}
          size={18}
          tintColor={isFocused ? theme.text : theme.textSecondary}
          fallback={<View style={[styles.iconFallback, { backgroundColor: theme.textSecondary }]} />}
        />
        <ThemedText type="small" themeColor={isFocused ? 'text' : 'textSecondary'}>
          {children}
        </ThemedText>
      </ThemedView>
    </Pressable>
  );
}

export function CustomTabList(props: TabListProps) {
  const insets = useSafeAreaInsets();

  return (
    <View {...props} style={[styles.tabListContainer, { paddingBottom: Math.max(insets.bottom, Spacing.two) }]}>
      <ThemedView type="backgroundElement" style={styles.innerContainer}>
        <ThemedText type="smallBold" style={styles.brandText}>
          Kwento Time
        </ThemedText>
        {props.children}
      </ThemedView>
    </View>
  );
}

const styles = StyleSheet.create({
  tabListContainer: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  innerContainer: {
    padding: Spacing.two,
    borderRadius: Radius.large,
    borderCurve: 'continuous',
    flexDirection: 'row',
    alignItems: 'center',
    flexGrow: 1,
    gap: Spacing.one,
    maxWidth: MaxContentWidth,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(122, 154, 184, 0.28)',
    boxShadow: '0 16px 36px rgba(36, 48, 58, 0.14)',
  },
  brandText: {
    marginRight: 'auto',
    paddingHorizontal: Spacing.two,
  },
  pressed: {
    opacity: 0.7,
  },
  tabButtonView: {
    minWidth: 84,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.two,
    borderRadius: Radius.medium,
    borderCurve: 'continuous',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.one,
  },
  iconFallback: {
    width: 16,
    height: 16,
    borderRadius: Radius.small,
  },
});
