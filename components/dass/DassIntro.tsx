import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

interface Props {
  onContinue: () => void;
  onDecline: () => void;
}

/** Intro screen shown once before consent: what the test is and isn't. */
export default function DassIntro({ onContinue, onDecline }: Props) {
  return (
    <View className="flex-1 px-6 py-4">
      <ScrollView className="flex-1">
        <Text className="text-2xl font-bold text-ink dark:text-inkDark">Before we start</Text>
        <Text className="mt-3 text-base leading-6 text-ink2 dark:text-ink2Dark">
          <Text className="font-semibold text-ink dark:text-inkDark">What this is: </Text>
          the DASS-21 is a short self-report screening tool. It is not a diagnosis and cannot tell you
          if something is wrong with you.
        </Text>
        <Text className="mt-2 text-base leading-6 text-ink2 dark:text-ink2Dark">
          <Text className="font-semibold text-ink dark:text-inkDark">What it is not: </Text>
          it is not an emergency or suicide-risk tool. If you are in crisis or thinking about harming
          yourself, please contact your local emergency services or a crisis line right away instead
          of taking this check.
        </Text>
        <Text className="mt-2 text-base leading-6 text-ink2 dark:text-ink2Dark">
          <Text className="font-semibold text-ink dark:text-inkDark">Your data: </Text>
          your answers and results are stored in Firebase and are private to you. Other students
          cannot see them.
        </Text>
        <Text className="mt-2 text-base leading-6 text-ink2 dark:text-ink2Dark">
          You can take it once a day, before a focus session.
        </Text>
      </ScrollView>
      <View className="mt-3 flex-row justify-end gap-3">
        <Pressable
          onPress={onDecline}
          accessibilityRole="button"
          className="min-h-[52px] min-w-[120px] items-center justify-center rounded-xl border border-line px-5 dark:border-lineDark"
        >
          <Text className="text-base font-semibold text-ink2 dark:text-ink2Dark">Not now</Text>
        </Pressable>
        <Pressable
          onPress={onContinue}
          accessibilityRole="button"
          className="min-h-[52px] min-w-[160px] items-center justify-center rounded-xl bg-primary px-5"
        >
          <Text className="text-base font-semibold text-white">Continue</Text>
        </Pressable>
      </View>
    </View>
  );
}
