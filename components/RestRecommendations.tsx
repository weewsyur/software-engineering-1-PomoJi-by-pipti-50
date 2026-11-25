import React from 'react';
import { Text, View } from 'react-native';
import { BedDouble, Footprints, MessageCircle, Utensils, Wind } from 'lucide-react-native';
import { useColors } from '@/constants/colors';
import { useTheme } from '@/contexts/ThemeContext';

const TIPS = [
  { icon: Footprints, title: 'Take a short walk', body: 'Even 5-10 minutes of moving helps your body settle.' },
  { icon: Utensils, title: 'Eat or drink water', body: 'Hunger and thirst quietly drain focus.' },
  { icon: BedDouble, title: 'Rest or sleep', body: 'A short nap or a good night’s sleep beats pushing through.' },
  { icon: Wind, title: 'Slow your breathing', body: 'Breathe in for 4, out for 6, a few times.' },
  { icon: MessageCircle, title: 'Talk to someone you trust', body: 'Sharing it can lighten the load.' },
] as const;

interface Props {
  /** 'dass' = readiness test gate, 'mood' = low "before" mood gate */
  variant: 'dass' | 'mood';
}

/** ONE shared component used by BOTH gates. */
export default function RestRecommendations({ variant }: Props) {
  const { isDarkMode } = useTheme();
  const colors = useColors(isDarkMode);
  return (
    <View>
      <Text className="font-sans text-base leading-6 text-ink2 dark:text-ink2Dark">
        {variant === 'dass'
          ? 'The focus technique works poorly when emotions are running high. Take a break first, then check in again when your rest period ends.'
          : 'Feeling low right now? The focus technique works best when you feel settled. Take a cool-down, then come back to review.'}
      </Text>
      <View className="mt-3 flex-row flex-wrap gap-2">
        {TIPS.map(({ icon: Icon, title, body }) => (
          <View key={title} className="w-[48%] rounded-xl bg-warm p-3 dark:bg-warmDark">
            <View className="flex-row items-center gap-1.5">
              <Icon size={18} color={colors.primary} />
              <Text className="flex-1 text-base font-semibold text-ink dark:text-inkDark">{title}</Text>
            </View>
            <Text className="font-sans mt-1 text-sm leading-5 text-ink2 dark:text-ink2Dark">{body}</Text>
          </View>
        ))}
      </View>
      <Text className="font-sans mt-3 text-sm leading-5 text-ink3 dark:text-ink3Dark">
        If the timer doesn’t seem to help, check these first. Sleep, food, and mood affect focus more than any technique.
      </Text>
    </View>
  );
}
