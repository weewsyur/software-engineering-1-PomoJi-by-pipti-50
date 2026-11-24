import React, { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Brain, GraduationCap, Moon, PenLine, Smartphone, Utensils, Volume2 } from 'lucide-react-native';
import { Redirect, useRouter } from 'expo-router';
import {
  CAUSE_OPTIONS,
  DISTRACTION_OPTIONS,
  NEGATIVE_MOOD_VALUES,
  OTHER_DISTRACTION_ID,
  OTHER_TEXT_MAX,
  ROUTES,
  type CauseId,
} from '@/constants/sessionFlow';
import { useRequireDassPassed } from '@/hooks/useSessionGuard';
import { useSessionFlowStore } from '@/store/sessionFlowStore';
import RestRecommendations from '@/components/RestRecommendations';
import WarningModal from '@/components/WarningModal';

// The shared mood rating row — same component used by the after-session
// MoodCheckInModal, so there is only one mood scale in the app.
import MoodRating from '@/components/MoodRating';
import { useAuth } from '@/contexts/AuthContext';
import { useColors } from '@/constants/colors';
import { useTheme } from '@/contexts/ThemeContext';
import type { LucideIcon } from 'lucide-react-native';

const DISTRACTION_ICONS: Record<string, LucideIcon> = {
  noisy: Volume2,
  phone: Smartphone,
  hungry: Utensils,
  tired: Moon,
  busy_mind: Brain,
  academic_worry: GraduationCap,
  other: PenLine,
};

export default function BeforeSessionScreen() {
  const router = useRouter();
  const { user, initializing } = useAuth();
  const { isDarkMode } = useTheme();
  const colors = useColors(isDarkMode);
  const allowed = useRequireDassPassed();
  const completeBeforeCheck = useSessionFlowStore((s) => s.completeBeforeCheck);

  const [mood, setMood] = useState<number | null>(null);
  const [picked, setPicked] = useState<string[]>([]);
  const [otherText, setOtherText] = useState('');
  const [cause, setCause] = useState<CauseId | null>(null);
  const [showMoodGate, setShowMoodGate] = useState(false);

  if (initializing) return null;
  if (!user) return <Redirect href="/(auth)/welcome" />;
  if (!allowed) return null;

  const toggle = (id: string) =>
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  const canStart = mood !== null && cause !== null;

  const onStart = () => {
    if (mood === null || cause === null) return;
    if (NEGATIVE_MOOD_VALUES.includes(mood)) {
      setShowMoodGate(true); // do NOT start the session
      return;
    }
    const distractions = picked.map((id) => {
      if (id !== OTHER_DISTRACTION_ID) return id;
      const t = otherText.trim().slice(0, OTHER_TEXT_MAX);
      return t ? `other: ${t}` : 'other';
    });
    completeBeforeCheck({ beforeMood: mood, distractions, causeCategory: cause });
    // TIMER is the same screen as the Timer tab; the autostart param tells it
    // to begin the focus countdown (checks already passed to get here).
    router.replace({ pathname: ROUTES.TIMER, params: { autostart: '1' } } as never);
  };

  return (
    <View className="flex-1 bg-canvas dark:bg-canvasDark">
      <ScrollView className="flex-1" contentContainerStyle={{ paddingHorizontal: 24, paddingVertical: 16 }}>
        <Text className="text-2xl font-display font-bold text-ink dark:text-inkDark">Quick check before you focus</Text>

        <Text className="mt-4 text-base font-semibold text-ink dark:text-inkDark">How are you feeling right now?</Text>
        <View className="mt-2">
          <MoodRating value={mood} onChange={setMood} />
        </View>

        <Text className="mt-5 text-base font-semibold text-ink dark:text-inkDark">Anything getting in the way? (pick any)</Text>
        <View className="mt-2 flex-row flex-wrap gap-2">
          {DISTRACTION_OPTIONS.map((o) => {
            const on = picked.includes(o.id);
            const Icon = DISTRACTION_ICONS[o.id];
            return (
              <Pressable
                key={o.id}
                onPress={() => toggle(o.id)}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                className={`min-h-[48px] flex-row items-center justify-center gap-1.5 rounded-full border px-4 ${
                  on ? 'border-primary bg-primaryMuted dark:bg-primaryMutedDark' : 'border-line dark:border-lineDark bg-card dark:bg-cardDark'
                }`}
              >
                {Icon ? <Icon size={16} color={on ? colors.primary : colors.textSecondary} /> : null}
                <Text className={`text-base ${on ? 'font-semibold text-primary dark:text-primaryLightDark' : 'text-ink dark:text-inkDark'}`}>{o.label}</Text>
              </Pressable>
            );
          })}
        </View>
        {picked.includes(OTHER_DISTRACTION_ID) ? (
          <TextInput
            value={otherText}
            onChangeText={(t) => setOtherText(t.slice(0, OTHER_TEXT_MAX))}
            placeholder="Optional: tell us more"
            maxLength={OTHER_TEXT_MAX}
            className="mt-2 min-h-[48px] rounded-xl border border-line bg-card px-4 text-base text-ink dark:border-lineDark dark:bg-cardDark dark:text-inkDark"
          />
        ) : null}

        <Text className="mt-5 text-base font-semibold text-ink dark:text-inkDark">What’s the main reason you feel this way?</Text>
        <View className="mt-2 flex-row flex-wrap gap-2">
          {CAUSE_OPTIONS.map((o) => {
            const on = cause === o.id;
            return (
              <Pressable
                key={o.id}
                onPress={() => setCause(o.id)}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                className={`min-h-[48px] justify-center rounded-full border px-4 ${
                  on ? 'border-primary bg-primaryMuted dark:bg-primaryMutedDark' : 'border-line dark:border-lineDark bg-card dark:bg-cardDark'
                }`}
              >
                <Text className={`text-base ${on ? 'font-semibold text-primary dark:text-primaryLightDark' : 'text-ink dark:text-inkDark'}`}>{o.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <Pressable
          onPress={onStart}
          disabled={!canStart}
          accessibilityRole="button"
          className={`mt-6 min-h-[56px] items-center justify-center rounded-xl ${canStart ? 'bg-primary' : 'bg-primary/40'}`}
        >
          <Text className="text-lg font-semibold text-white">Start session</Text>
        </Pressable>
      </ScrollView>

      <WarningModal
        visible={showMoodGate}
        title="Let’s take a cool-down first"
        message="You’re feeling pretty low right now, so a focus session might not go well."
        primaryLabel="Back to Home"
        onPrimary={() => {
          setShowMoodGate(false);
          router.replace(ROUTES.HOME);
        }}
      >
        <RestRecommendations variant="mood" />
      </WarningModal>
    </View>
  );
}
