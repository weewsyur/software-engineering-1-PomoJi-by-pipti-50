import React from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';

interface Props {
  visible: boolean;
  title: string;
  message?: string;
  children?: React.ReactNode;
  primaryLabel: string;
  onPrimary: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
}

/** Custom modal (works on Android, iOS and web). Use instead of Alert.alert. */
export default function WarningModal({
  visible, title, message, children, primaryLabel, onPrimary, secondaryLabel, onSecondary,
}: Props) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onSecondary ?? onPrimary} // Android back button
    >
      <View className="flex-1 items-center justify-center bg-black/50 px-6">
        <View className="w-full max-w-[560px] max-h-[92%] rounded-2xl border border-line bg-card p-5 dark:border-lineDark dark:bg-cardDark">
          <ScrollView>
            <Text className="text-xl font-bold text-ink dark:text-inkDark">{title}</Text>
            {message ? <Text className="mt-2 text-base leading-6 text-ink2 dark:text-ink2Dark">{message}</Text> : null}
            {children ? <View className="mt-3">{children}</View> : null}
          </ScrollView>
          <View className={`mt-4 flex-row gap-3 ${secondaryLabel && onSecondary ? 'justify-end' : 'justify-center'}`}>
            {secondaryLabel && onSecondary ? (
              <Pressable
                onPress={onSecondary}
                accessibilityRole="button"
                className="min-h-[52px] min-w-[120px] items-center justify-center rounded-xl border border-line dark:border-lineDark px-5"
              >
                <Text className="text-base font-semibold text-ink2 dark:text-ink2Dark">{secondaryLabel}</Text>
              </Pressable>
            ) : null}
            <Pressable
              onPress={onPrimary}
              accessibilityRole="button"
              className="min-h-[52px] min-w-[140px] items-center justify-center rounded-xl bg-primary px-5"
            >
              <Text className="text-base font-semibold text-white">{primaryLabel}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
