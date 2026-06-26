import {
  TabList,
  TabListProps,
  Tabs,
  TabSlot,
  TabTrigger,
  TabTriggerSlotProps,
} from 'expo-router/ui';
import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

import { FloatingAddButton } from '@/components/ui/floating-add-button';
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
      <FloatingAddButton />
    </Tabs>
  );
}

type TabButtonProps = TabTriggerSlotProps & {
  icon: (typeof tabs)[number]['icon'];
};

export function TabButton({ children, icon, isFocused, ...props }: TabButtonProps) {
  const theme = useTheme();

  return (
    <Pressable {...props} style={({ pressed }) => [styles.tabPressable, pressed && styles.pressed]}>
      <ThemedView
        type={isFocused ? 'backgroundSelected' : 'backgroundElement'}
        style={styles.tabButtonView}>
        <SymbolView
          name={icon}
          size={26}
          tintColor={isFocused ? theme.text : theme.textSecondary}
          fallback={<View style={[styles.iconFallback, { backgroundColor: theme.textSecondary }]} />}
        />
        <ThemedText
          type="smallBold"
          themeColor={isFocused ? 'text' : 'textSecondary'}
          style={styles.tabLabel}>
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
    paddingHorizontal: Spacing.two,
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
    justifyContent: 'space-between',
    width: '100%',
    flexGrow: 1,
    gap: Spacing.one,
    maxWidth: MaxContentWidth,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(122, 154, 184, 0.28)',
    boxShadow: '0 16px 36px rgba(36, 48, 58, 0.14)',
  },
  pressed: {
    opacity: 0.7,
  },
  tabPressable: {
    flex: 1,
    minWidth: 0,
  },
  tabButtonView: {
    flex: 1,
    minWidth: 0,
    minHeight: 16,
    paddingVertical: Spacing.half,
    paddingHorizontal: Spacing.half,
    borderRadius: Radius.medium,
    borderCurve: 'continuous',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.half,
  },
  tabLabel: {
    textAlign: 'center',
    fontSize: 11,
    lineHeight: 14,
  },
  iconFallback: {
    width: 30,
    height: 30,
    borderRadius: Radius.small,
  },
});
