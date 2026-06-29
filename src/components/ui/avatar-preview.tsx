import { useState } from 'react';
import { Modal, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Avatar } from '@/components/ui/avatar';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type AvatarPreviewProps = {
  name: string;
  previewSize?: number;
  size?: number;
  uri?: string | null;
};

export function AvatarPreview({ name, previewSize = 220, size = 40, uri }: AvatarPreviewProps) {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const [isOpen, setIsOpen] = useState(false);
  const expandedSize = Math.max(120, Math.min(previewSize, width - Spacing.six * 2));

  if (!uri) {
    return <Avatar name={name} size={size} uri={uri} />;
  }

  return (
    <>
      <Pressable
        accessibilityLabel={`Expand ${name} avatar`}
        accessibilityRole="imagebutton"
        onPress={() => setIsOpen(true)}
        style={({ pressed }) => [{ opacity: pressed ? 0.72 : 1 }]}>
        <Avatar name={name} size={size} uri={uri} />
      </Pressable>

      <Modal animationType="fade" onRequestClose={() => setIsOpen(false)} transparent visible={isOpen}>
        <View style={styles.modalRoot}>
          <Pressable
            accessibilityLabel="Close avatar preview"
            accessibilityRole="button"
            onPress={() => setIsOpen(false)}
            style={StyleSheet.absoluteFill}
          />
          <View style={[styles.previewPanel, { backgroundColor: theme.backgroundElement }]}>
            <Avatar name={name} size={expandedSize} uri={uri} />
            <ThemedText type="smallBold">{name}</ThemedText>
            <Pressable
              accessibilityRole="button"
              onPress={() => setIsOpen(false)}
              style={({ pressed }) => [
                styles.closeButton,
                {
                  backgroundColor: theme.backgroundSelected,
                  opacity: pressed ? 0.72 : 1,
                },
              ]}>
              <ThemedText type="smallBold">Close</ThemedText>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.54)',
    padding: Spacing.three,
  },
  previewPanel: {
    alignItems: 'center',
    gap: Spacing.three,
    borderRadius: Radius.medium,
    borderCurve: 'continuous',
    padding: Spacing.three,
    boxShadow: '0 20px 48px rgba(15, 23, 42, 0.24)',
  },
  closeButton: {
    minHeight: 40,
    minWidth: 96,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.small,
    borderCurve: 'continuous',
    paddingHorizontal: Spacing.three,
  },
});
