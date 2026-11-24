import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

interface Props {
  busy?: boolean;
  onAccept: () => void;
  onDecline: () => void;
}

export default function ConsentNotice({ busy, onAccept, onDecline }: Props) {
  return (
    <View className="flex-1 px-6 py-4">
      <ScrollView className="flex-1">
        <Text className="text-2xl font-bold text-ink dark:text-inkDark">Before we start</Text>
        <Text className="mt-3 text-base leading-6 text-ink2 dark:text-ink2Dark">
          <Text className="font-semibold">What we collect: </Text>
          your answers are turned into three scores (stress, anxiety, sadness) and saved with the date.
        </Text>
        <Text className="mt-2 text-base leading-6 text-ink2 dark:text-ink2Dark">
          <Text className="font-semibold">What this is: </Text>
          a quick screening tool, not a diagnosis. It cannot tell you if something is wrong with you.
        </Text>
        <Text className="mt-2 text-base leading-6 text-ink2 dark:text-ink2Dark">
          <Text className="font-semibold">Privacy: </Text>
          your results are private to you. Other students cannot see them.
        </Text>
        <Text className="mt-2 text-base leading-6 text-ink2 dark:text-ink2Dark">
          You can take it once a day, before a focus session.
        </Text>
      </ScrollView>
      <View className="mt-3 flex-row justify-end gap-3">
        <Pressable
          onPress={onDecline}
          accessibilityRole="button"
          className="min-h-[52px] min-w-[120px] items-center justify-center rounded-xl border border-line dark:border-lineDark px-5"
        >
          <Text className="text-base font-semibold text-ink2 dark:text-ink2Dark">Not now</Text>
        </Pressable>
        <Pressable
          onPress={onAccept}
          disabled={busy}
          accessibilityRole="button"
          className={`min-h-[52px] min-w-[160px] items-center justify-center rounded-xl px-5 ${busy ? 'bg-primary/40' : 'bg-primary'}`}
        >
          <Text className="text-base font-semibold text-white">{busy ? 'Saving…' : 'I understand, continue'}</Text>
        </Pressable>
      </View>
    </View>
  );
}
