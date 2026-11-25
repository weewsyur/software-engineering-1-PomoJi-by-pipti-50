import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { HeartHandshake } from 'lucide-react-native';
import { useColors } from '@/constants/colors';
import { useTheme } from '@/contexts/ThemeContext';

interface Props {
  busy?: boolean;
  onStart: () => void;
  onHome: () => void;
}

export default function RestCheckinPrompt({ busy = false, onStart, onHome }: Props) {
  const { isDarkMode } = useTheme();
  const colors = useColors(isDarkMode);
  return (
    <View className="rounded-3xl border border-line bg-card p-5 dark:border-lineDark dark:bg-cardDark">
      <View className="h-12 w-12 items-center justify-center rounded-2xl bg-primaryMuted dark:bg-primaryMutedDark">
        <HeartHandshake size={24} color={colors.primary} />
      </View>
      <Text className="mt-4 text-2xl font-display font-bold text-ink dark:text-inkDark">How do you feel now?</Text>
      <Text className="font-sans mt-2 text-base leading-6 text-ink2 dark:text-ink2Dark">
        Your rest period has ended. Take a moment to notice how you feel, then complete the short follow-up check-in.
      </Text>
      <Pressable
        onPress={onStart}
        disabled={busy}
        accessibilityRole="button"
        className={`mt-5 min-h-[54px] items-center justify-center rounded-2xl px-5 ${busy ? 'bg-primary/40' : 'bg-primary active:opacity-80'}`}
      >
        <Text className="text-base font-semibold text-white">{busy ? 'Loading…' : 'Start check-in'}</Text>
      </Pressable>
      <Pressable
        onPress={onHome}
        disabled={busy}
        accessibilityRole="button"
        className="mt-2 min-h-[48px] items-center justify-center rounded-2xl border border-line px-5 dark:border-lineDark"
      >
        <Text className="text-base font-semibold text-ink2 dark:text-ink2Dark">Back to Home</Text>
      </Pressable>
    </View>
  );
}
