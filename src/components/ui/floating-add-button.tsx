import { router, usePathname } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useState, type ComponentProps } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { BottomTabInset, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type AddDestination = '/people/new' | '/places/new' | '/conversations/new' | '/my-life/new';

type MenuOption = {
  label: string;
  icon: ComponentProps<typeof SymbolView>['name'];
  href: AddDestination;
};

const homeOptions: MenuOption[] = [
  {
    label: 'Record conversation',
    icon: { ios: 'bubble.left.and.bubble.right', android: 'forum', web: 'forum' },
    href: '/conversations/new',
  },
  {
    label: 'Record life update',
    icon: { ios: 'person.text.rectangle', android: 'edit_note', web: 'edit_note' },
    href: '/my-life/new',
  },
];

export function FloatingAddButton() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const bottom = BottomTabInset + Math.max(insets.bottom, Spacing.two);
  const isHomeTab = pathname === '/' || pathname === '/(tabs)';
  const isPlacesTab = pathname === '/places';
  const directHref: AddDestination = isPlacesTab ? '/places/new' : '/people/new';

  function handleAddPress() {
    if (isHomeTab) {
      setIsMenuOpen((current) => !current);
      return;
    }

    router.push(directHref);
  }

  function handleMenuPress(href: AddDestination) {
    setIsMenuOpen(false);
    router.push(href);
  }

  return (
    <>
      {isHomeTab && isMenuOpen ? (
        <>
          <Pressable
            accessibilityLabel="Close add menu"
            onPress={() => setIsMenuOpen(false)}
            style={styles.backdrop}
          />
          <View
            style={[
              styles.menu,
              {
                backgroundColor: theme.backgroundElement,
                borderColor: theme.border,
                bottom: bottom + 72,
              },
            ]}>
            {homeOptions.map((option) => (
              <Pressable
                key={option.href}
                accessibilityRole="button"
                onPress={() => handleMenuPress(option.href)}
                style={({ pressed }) => [
                  styles.menuItem,
                  {
                    backgroundColor: pressed ? theme.backgroundSelected : 'transparent',
                  },
                ]}>
                <SymbolView
                  name={option.icon}
                  size={20}
                  tintColor={theme.text}
                  fallback={<View style={[styles.menuIconFallback, { backgroundColor: theme.text }]} />}
                />
                <ThemedText type="smallBold">{option.label}</ThemedText>
              </Pressable>
            ))}
          </View>
        </>
      ) : null}

      <Pressable
        accessibilityLabel={isHomeTab ? 'Add entry' : isPlacesTab ? 'Add place' : 'Add person'}
        accessibilityRole="button"
        accessibilityState={isHomeTab ? { expanded: isMenuOpen } : undefined}
        onPress={handleAddPress}
        style={({ pressed }) => [
          styles.button,
          {
            backgroundColor: theme.primary,
            bottom,
            opacity: pressed ? 0.78 : 1,
          },
        ]}>
        <SymbolView
          name={{ ios: 'plus', android: 'add', web: 'add' }}
          size={28}
          tintColor={theme.onPrimary}
          fallback={<View style={[styles.fallbackIcon, { backgroundColor: theme.onPrimary }]} />}
        />
      </Pressable>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 19,
  },
  menu: {
    position: 'absolute',
    right: Spacing.three,
    zIndex: 20,
    width: 220,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.medium,
    borderCurve: 'continuous',
    padding: Spacing.one,
    gap: Spacing.one,
    boxShadow: '0 14px 28px rgba(36, 48, 58, 0.18)',
  },
  menuItem: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderRadius: Radius.small,
    borderCurve: 'continuous',
    paddingHorizontal: Spacing.two,
  },
  menuIconFallback: {
    width: 20,
    height: 20,
    borderRadius: Radius.small,
  },
  button: {
    position: 'absolute',
    right: Spacing.three,
    zIndex: 21,
    width: 58,
    height: 58,
    borderRadius: 29,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 14px 28px rgba(36, 48, 58, 0.2)',
  },
  fallbackIcon: {
    width: 22,
    height: 22,
    borderRadius: Radius.small,
  },
});
