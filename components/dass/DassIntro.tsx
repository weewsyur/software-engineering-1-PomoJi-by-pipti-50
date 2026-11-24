import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { ClipboardList, LockKeyhole, CalendarDays, HeartHandshake } from 'lucide-react-native';
import { useColors } from '@/constants/colors';
import { useTheme } from '@/contexts/ThemeContext';

interface Props {
  busy: boolean;
  consentGiven: boolean;
  error: string | null;
  errorRetryable?: boolean;
  onRetryError?: () => void;
  onConsentChange: (value: boolean) => void;
  onContinue: () => void;
  onDecline: () => void;
}

function InfoSection({
  icon: Icon,
  title,
  children,
  color,
}: {
  icon: typeof ClipboardList;
  title: string;
  children: string;
  color: string;
}) {
  return (
    <View className="mt-3 flex-row rounded-2xl border border-line bg-card p-4 dark:border-lineDark dark:bg-cardDark">
      <View className="mr-3 mt-0.5 h-10 w-10 items-center justify-center rounded-xl bg-primaryMuted dark:bg-primaryMutedDark">
        <Icon size={20} color={color} />
      </View>
      <View className="flex-1">
        <Text className="text-base font-semibold text-ink dark:text-inkDark">{title}</Text>
        <Text className="mt-1 text-sm leading-5 text-ink2 dark:text-ink2Dark">{children}</Text>
      </View>
    </View>
  );
}

export default function DassIntro({
  busy,
  consentGiven,
  error,
  errorRetryable = false,
  onRetryError,
  onConsentChange,
  onContinue,
  onDecline,
}: Props) {
  const { isDarkMode } = useTheme();
  const colors = useColors(isDarkMode);
  return (
    <View className="flex-1 px-5 pb-4 pt-5">
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 12 }} showsVerticalScrollIndicator={false}>
        <Text className="text-sm font-semibold uppercase tracking-wide text-primary">Your wellbeing check-in</Text>
        <Text className="mt-2 text-3xl font-bold leading-9 text-ink dark:text-inkDark">DASS-21 assessment</Text>
        <Text className="mt-2 text-base leading-6 text-ink2 dark:text-ink2Dark">
          A voluntary 21-question self-report about how you have felt over the past week. It usually takes about 3–5 minutes.
        </Text>
        <InfoSection icon={ClipboardList} title="Instructions" color={colors.primary}>
          For each statement, choose how much it applied to you over the past week. You may stop at any time before submitting.
        </InfoSection>
        <InfoSection icon={HeartHandshake} title="What we collect" color={colors.primary}>
          Your 21 responses, calculated results, and completion time are saved to your private account. If you complete the assessment offline, they are stored on this device until they can sync.
        </InfoSection>
        <InfoSection icon={LockKeyhole} title="Privacy and support" color={colors.primary}>
          Only you can access your account’s assessment records. You can review, export, or delete them in Profile → Privacy. DASS-21 is a screening tool, not a clinical diagnosis or emergency assessment. If you may harm yourself or are in immediate danger, contact local emergency services or a crisis support line.
        </InfoSection>
        <InfoSection icon={CalendarDays} title="Assessment frequency" color={colors.primary}>
          One assessment can be completed each day before a focus session. Participation is your choice.
        </InfoSection>
      </ScrollView>

      <Pressable
        onPress={() => onConsentChange(!consentGiven)}
        disabled={busy}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: consentGiven, disabled: busy }}
        className="mt-2 min-h-[52px] flex-row items-center rounded-xl border border-line bg-card px-4 dark:border-lineDark dark:bg-cardDark"
      >
        <View className={`mr-3 h-6 w-6 items-center justify-center rounded-md border-2 ${consentGiven ? 'border-primary bg-primary' : 'border-line dark:border-lineDark'}`}>
          {consentGiven ? <Text className="font-bold text-white">✓</Text> : null}
        </View>
        <Text className="flex-1 text-sm leading-5 text-ink dark:text-inkDark">
          I have read this notice and voluntarily agree to take this assessment and store my responses and results.
        </Text>
      </Pressable>
      {error ? (
        <View className="mt-2">
          <Text accessibilityRole="alert" className="text-sm text-[#C94C3C]">{error}</Text>
          {errorRetryable && onRetryError ? (
            <Pressable
              onPress={onRetryError}
              disabled={busy}
              accessibilityRole="button"
              accessibilityState={{ disabled: busy }}
              className="mt-2 min-h-[44px] items-center justify-center self-start rounded-xl border border-line px-4 dark:border-lineDark"
            >
              <Text className="font-semibold text-ink dark:text-inkDark">Retry</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      <View className="mt-2 flex-col gap-2">
        <Pressable
          onPress={onContinue}
          disabled={busy || !consentGiven}
          accessibilityRole="button"
          accessibilityState={{ disabled: busy || !consentGiven }}
          className={`min-h-[54px] items-center justify-center rounded-2xl px-5 ${busy || !consentGiven ? 'bg-primary/40' : 'bg-primary active:opacity-80'}`}
        >
          <Text className="text-base font-semibold text-white">{busy ? 'Saving consent…' : 'Start assessment'}</Text>
        </Pressable>
        <Pressable
          onPress={onDecline}
          disabled={busy}
          accessibilityRole="button"
          accessibilityState={{ disabled: busy }}
          className="min-h-[54px] items-center justify-center rounded-2xl border border-line bg-card px-5 active:opacity-70 dark:border-lineDark dark:bg-cardDark"
        >
          <Text className="text-base font-semibold text-ink2 dark:text-ink2Dark">Not now</Text>
        </Pressable>
      </View>
    </View>
  );
}
