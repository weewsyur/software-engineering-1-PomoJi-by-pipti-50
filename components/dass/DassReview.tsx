import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { DASS21_ITEMS } from '@/constants/dass21';

interface Props {
  answers: (number | null)[];
  submitting: boolean;
  error: string | null;
  onChange: (index: number, value: number) => void;
  onSubmit: () => void;
  onExit: () => void;
}

/** Review step: change any answer before submitting, so a misclick can't lock in today's result. */
export default function DassReview({ answers, submitting, error, onChange, onSubmit, onExit }: Props) {
  const complete = answers.every((a) => a !== null);
  return (
    <View className="flex-1 px-6 py-3">
      <View className="flex-row items-center justify-between">
        <Text className="text-xl font-bold text-ink dark:text-inkDark">Check your answers</Text>
        <Pressable onPress={onExit} accessibilityRole="button" className="min-h-[44px] justify-center px-3">
          <Text className="text-base font-semibold text-ink2 dark:text-ink2Dark">Exit</Text>
        </Pressable>
      </View>
      <Text className="text-sm text-ink2 dark:text-ink2Dark">
        0 = not at all · 1 = sometimes · 2 = often · 3 = most of the time. Tap a number to change it. You can only submit once today.
      </Text>

      <ScrollView className="mt-2 flex-1">
        <View className="flex-row flex-wrap">
          {DASS21_ITEMS.map((item, i) => (
            <View key={item.id} className="w-full p-1 md:w-1/2">
              <View className="rounded-xl bg-warm dark:bg-warmDark p-2">
                <Text className="text-sm leading-5 text-ink dark:text-inkDark">
                  {item.id}. {item.text}
                </Text>
                <View className="mt-2 flex-row gap-2">
                  {[0, 1, 2, 3].map((v) => {
                    const selected = answers[i] === v;
                    return (
                      <Pressable
                        key={v}
                        onPress={() => onChange(i, v)}
                        accessibilityRole="button"
                        accessibilityState={{ selected }}
                        className={`h-11 w-14 items-center justify-center rounded-lg border ${
                          selected ? 'border-primary bg-primary' : 'border-line dark:border-lineDark bg-card dark:bg-cardDark'
                        }`}
                      >
                        <Text className={`text-base font-semibold ${selected ? 'text-white' : 'text-ink dark:text-inkDark'}`}>{v}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      {error ? <Text className="mt-2 text-sm text-[#C94C3C]">{error}</Text> : null}
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
