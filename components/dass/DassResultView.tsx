import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { BookOpen, Coffee, Leaf, Moon, MessagesSquare } from 'lucide-react-native';
import { useColors } from '@/constants/colors';
import { useTheme } from '@/contexts/ThemeContext';
import {
  DASS_SUPPORT_LINE_MIN_SEVERITY,
  SEVERITY_LABELS,
  SEVERITY_ORDER,
  SUBSCALE_LABELS,
  SUPPORT_LINE,
  type DassSeverity,
  type DassSubscale,
} from '@/constants/dass21';
import RestRecommendations from '@/components/RestRecommendations';
import { storedSeverities, type StoredDassResult } from '@/services/dassService';
import { isAtOrAbove } from '@/utils/dass21Score';

// static class strings so NativeWind can see them
const SEVERITY_STYLE: Record<DassSeverity, { bar: string; pill: string; text: string }> = {
  normal: { bar: 'bg-emerald-500', pill: 'bg-emerald-100 dark:bg-emerald-500/20', text: 'text-emerald-800 dark:text-emerald-300' },
  mild: { bar: 'bg-lime-500', pill: 'bg-lime-100 dark:bg-lime-500/20', text: 'text-lime-800 dark:text-lime-300' },
  moderate: { bar: 'bg-amber-500', pill: 'bg-amber-100 dark:bg-amber-500/20', text: 'text-amber-800 dark:text-amber-300' },
  severe: { bar: 'bg-orange-500', pill: 'bg-orange-100 dark:bg-orange-500/20', text: 'text-orange-800 dark:text-orange-300' },
  extremely_severe: { bar: 'bg-red-600', pill: 'bg-red-100 dark:bg-red-600/20', text: 'text-red-800 dark:text-red-300' },
};

function Indicator({ subscale, severity, score }: { subscale: DassSubscale; severity: DassSeverity; score: number }) {
  const st = SEVERITY_STYLE[severity];
  const filled = SEVERITY_ORDER.indexOf(severity) + 1;
  return (
    <View className="rounded-2xl border border-line bg-card p-4 dark:border-lineDark dark:bg-cardDark">
      <View className="flex-row items-center justify-between">
        <Text className="text-lg font-semibold text-ink dark:text-inkDark">{SUBSCALE_LABELS[subscale]}</Text>
        <Text className="text-base font-bold text-ink dark:text-inkDark" style={{ fontVariant: ['tabular-nums'] }}>{score}</Text>
      </View>
      <View className="mt-2 flex-row items-center justify-between">
        <Text className="font-sans text-xs text-ink3 dark:text-ink3Dark">Score</Text>
        <View className={`rounded-full px-3 py-1 ${st.pill}`}>
          <Text className={`text-sm font-semibold ${st.text}`}>{SEVERITY_LABELS[severity]}</Text>
        </View>
      </View>
      <View className="mt-3 flex-row gap-1.5">
        {SEVERITY_ORDER.map((_, i) => (
          <View key={i} className={`h-2 flex-1 rounded-full ${i < filled ? st.bar : 'bg-track dark:bg-trackDark'}`} />
        ))}
      </View>
    </View>
  );
}

// Brief, supportive explanations — never diagnostic or treatment advice.
const SUBSCALE_NOTES: Record<DassSubscale, string> = {
  depression: 'Depression items reflect low mood, loss of interest, and low energy over the past week.',
  anxiety: 'Anxiety items reflect worry, tension, and physical signs of stress over the past week.',
  stress: 'Stress items reflect feeling overwhelmed, irritable, or unable to relax over the past week.',
};

const WELLNESS_TIPS = [
  { icon: Coffee, label: 'Take regular breaks' },
  { icon: Moon, label: 'Prioritize sleep' },
  { icon: Leaf, label: 'Relaxation or breathing exercises' },
  { icon: BookOpen, label: 'Journaling' },
  { icon: MessagesSquare, label: 'Talk to a professional if it keeps weighing on you' },
] as const;

function formatDate(dateStr: string): string {
  const d = new Date(`${dateStr}T12:00:00`);
  return Number.isNaN(d.getTime())
    ? dateStr
    : d.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

interface Props {
  result: StoredDassResult;
  blocked: boolean;
  /** true when the result is stored on-device only, awaiting server sync */
  pendingSync?: boolean;
  onContinue: () => void;
  onChooseRest?: () => void;
  onHome: () => void;
}

export default function DassResultView({ result, blocked, pendingSync, onContinue, onChooseRest, onHome }: Props) {
  const { isDarkMode } = useTheme();
  const colors = useColors(isDarkMode);
  const sev = storedSeverities(result);
  const showSupport = (Object.values(sev) as DassSeverity[]).some((s) =>
    isAtOrAbove(s, DASS_SUPPORT_LINE_MIN_SEVERITY),
  );
  const needsExtraSupport = (Object.values(sev) as DassSeverity[]).some((s) =>
    isAtOrAbove(s, 'severe'),
  );

  return (
    <View className="flex-1 px-6 py-3">
      <ScrollView className="flex-1">
        <Text className="text-xl font-display font-bold text-ink dark:text-inkDark">
          {blocked ? 'Let’s pause the focus session for now' : 'You’re ready to focus'}
        </Text>

        <View className="mt-4 gap-3">
          <Indicator subscale="depression" severity={sev.depression} score={result.depression_score} />
          <Indicator subscale="anxiety" severity={sev.anxiety} score={result.anxiety_score} />
          <Indicator subscale="stress" severity={sev.stress} score={result.stress_score} />
        </View>
        <Text className="font-sans mt-3 text-sm leading-5 text-ink2 dark:text-ink2Dark">
          Completed {formatDate(result.date)}. Scores shown are each subscale’s raw total multiplied by 2. Severity bands are screening indicators, not a clinical diagnosis. Results are private to you.
        </Text>
        {pendingSync ? (
          <Text className="font-sans mt-1 text-xs text-ink3 dark:text-ink3Dark">
            Saved on this device — it will sync to your account when you’re back online.
          </Text>
        ) : null}

        <View className="mt-3 gap-1">
          {(Object.keys(SUBSCALE_NOTES) as DassSubscale[]).map((key) => (
            <Text key={key} className="font-sans text-sm leading-5 text-ink2 dark:text-ink2Dark">
              <Text className="font-semibold text-ink dark:text-inkDark">{SUBSCALE_LABELS[key]}: </Text>
              {SUBSCALE_NOTES[key]}
            </Text>
          ))}
        </View>

        <View className="mt-3 rounded-xl border border-line dark:border-lineDark p-3">
          <Text className="text-base font-semibold text-ink dark:text-inkDark">General wellness tips</Text>
          <View className="mt-2 gap-2">
            {WELLNESS_TIPS.map(({ icon: Icon, label }) => (
              <View key={label} className="flex-row items-center gap-2">
                <Icon size={18} color={colors.primary} />
                <Text className="font-sans flex-1 text-sm leading-5 text-ink2 dark:text-ink2Dark">{label}</Text>
              </View>
            ))}
          </View>
        </View>

        {needsExtraSupport ? (
          <View className="mt-3 rounded-xl bg-primaryMuted dark:bg-primaryMutedDark p-3">
            <Text className="font-sans text-base leading-6 text-primary dark:text-primaryLightDark">
              These results suggest you may be going through a very difficult time. Please be gentle with yourself, consider reaching out to someone you trust, and use the support options below if you need them.
            </Text>
          </View>
        ) : null}

        {showSupport ? (
          <View className="mt-3 rounded-xl border border-line dark:border-lineDark p-3">
            <Text className="text-base font-semibold text-ink dark:text-inkDark">Need someone to talk to?</Text>
            {SUPPORT_LINE.phone ? (
              <Text className="font-sans mt-1 text-base text-ink dark:text-inkDark">
                {SUPPORT_LINE.name}: {SUPPORT_LINE.phone}
                {SUPPORT_LINE.hours ? ` (${SUPPORT_LINE.hours})` : ''}
              </Text>
            ) : null}
            <Text className="font-sans mt-1 text-sm leading-5 text-ink2 dark:text-ink2Dark">{SUPPORT_LINE.note}</Text>
          </View>
        ) : null}

        {blocked ? (
          <View className="mt-3">
            <RestRecommendations variant="dass" />
          </View>
        ) : null}
      </ScrollView>

      <View className="mt-3 flex-row justify-end gap-3">
        {blocked ? (
          <>
            <Pressable
              onPress={onHome}
              accessibilityRole="button"
              className="min-h-[52px] min-w-[120px] items-center justify-center rounded-xl border border-line bg-card px-5 dark:border-lineDark dark:bg-cardDark"
            >
              <Text className="text-base font-semibold text-ink2 dark:text-ink2Dark">Back to Home</Text>
            </Pressable>
            <Pressable
              onPress={onChooseRest ?? onHome}
              accessibilityRole="button"
              className="min-h-[52px] min-w-[160px] items-center justify-center rounded-xl bg-primary px-5"
            >
              <Text className="text-base font-semibold text-white">Choose a rest period</Text>
            </Pressable>
          </>
        ) : (
          <Pressable
            onPress={onContinue}
            accessibilityRole="button"
            className="min-h-[52px] min-w-[160px] items-center justify-center rounded-xl bg-primary px-5"
          >
            <Text className="text-base font-semibold text-white">Continue</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}
