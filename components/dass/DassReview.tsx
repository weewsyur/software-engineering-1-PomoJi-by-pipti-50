import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { ANSWER_OPTIONS, DASS21_ITEMS } from '@/constants/dass21';

interface Props {
  answers: (number | null)[];
  submitting: boolean;
  error: string | null;
  errorRetryable?: boolean;
  onRetryError?: () => void;
  onChange: (index: number, value: number) => void;
  onSubmit: () => void;
  onExit: () => void;
}

/** Review step: change any answer before submitting, so a misclick can't lock in today's result. */
export default function DassReview({ answers, submitting, error, errorRetryable = false, onRetryError, onChange, onSubmit, onExit }: Props) {
  const complete = answers.every((a) => a !== null);
  return (
    <View className="flex-1 px-6 py-3">
      <View className="flex-row items-center justify-between">
        <Text className="text-xl font-display font-bold text-ink dark:text-inkDark">Check your answers</Text>
        <Pressable onPress={onExit} accessibilityRole="button" className="min-h-[44px] justify-center px-3">
          <Text className="text-base font-semibold text-ink2 dark:text-ink2Dark">Exit</Text>
        </Pressable>
      </View>
      <Text className="font-sans text-sm text-ink2 dark:text-ink2Dark">
        Review each response below. You can change any answer before submitting. You can only submit once today.
      </Text>

      <ScrollView className="mt-2 flex-1">
        <View className="flex-row flex-wrap">
          {DASS21_ITEMS.map((item, i) => (
            <View key={item.id} className="w-full p-1 md:w-1/2">
              <View className="rounded-xl bg-warm dark:bg-warmDark p-2">
                <Text className="font-sans text-sm leading-5 text-ink dark:text-inkDark">
                  {item.id}. {item.text}
                </Text>
                <View accessibilityRole="radiogroup" accessibilityLabel={`Response for question ${item.id}`} className="mt-2 gap-2">
                  {ANSWER_OPTIONS.map((option) => {
                    const selected = answers[i] === option.value;
                    return (
                      <Pressable
                        key={option.value}
                        onPress={() => onChange(i, option.value)}
                        accessibilityRole="radio"
                        accessibilityLabel={option.label}
                        accessibilityState={{ selected }}
                        className={`min-h-[44px] flex-row items-center rounded-lg border px-3 py-2 ${
                          selected ? 'border-primary bg-primaryMuted dark:bg-primaryMutedDark' : 'border-line dark:border-lineDark bg-card dark:bg-cardDark'
                        }`}
                      >
                        <Text className={`flex-1 text-sm leading-5 ${selected ? 'font-semibold text-primary dark:text-primaryLightDark' : 'text-ink dark:text-inkDark'}`}>
                          {option.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      {error ? (
        <View className="mt-2">
          <Text className="font-sans text-sm text-[#C94C3C]">{error}</Text>
          {errorRetryable && onRetryError ? (
            <Pressable
              onPress={onRetryError}
              disabled={submitting}
              accessibilityRole="button"
              accessibilityState={{ disabled: submitting }}
              className="mt-2 min-h-[44px] items-center justify-center self-start rounded-xl border border-line px-4 dark:border-lineDark"
            >
              <Text className="font-semibold text-ink dark:text-inkDark">Retry</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
      <Pressable
        onPress={onSubmit}
        disabled={!complete || submitting}
        accessibilityRole="button"
        className={`mt-2 min-h-[52px] items-center justify-center rounded-xl ${
          !complete || submitting ? 'bg-primary/40' : 'bg-primary'
        }`}
      >
        <Text className="text-base font-semibold text-white">{submitting ? 'Submitting…' : 'Submit answers'}</Text>
      </Pressable>
    </View>
  );
}
