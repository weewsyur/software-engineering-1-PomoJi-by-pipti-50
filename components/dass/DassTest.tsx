import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import {
  ANSWER_OPTIONS,
  DASS21_ITEMS,
  DASS_ACADEMIC_INSTRUCTION,
  DASS_ITEM_COUNT,
} from '@/constants/dass21';

interface Props {
  answers: (number | null)[];
  onChange: (index: number, value: number) => void;
  onFinish: () => void; // all answered -> go to review
  onExit: () => void;
}

/** One question per page. Landscape: question on the left, big answers on the right. */
export default function DassTest({ answers, onChange, onFinish, onExit }: Props) {
  const firstUnanswered = answers.findIndex((a) => a === null);
  const [index, setIndex] = useState(firstUnanswered === -1 ? 0 : firstUnanswered);
  const item = DASS21_ITEMS[index];
  const current = answers[index];

  const choose = (value: number) => {
    onChange(index, value);
    // short pause so the selection is visible, then advance
    setTimeout(() => {
      if (index < DASS_ITEM_COUNT - 1) setIndex(index + 1);
      else onFinish();
    }, 180);
  };

  return (
    <View className="flex-1 px-6 py-3">
      <View className="flex-row items-center justify-between">
        <Text className="flex-1 pr-3 text-sm leading-5 text-ink2 dark:text-ink2Dark">{DASS_ACADEMIC_INSTRUCTION}</Text>
        <Pressable onPress={onExit} accessibilityRole="button" className="min-h-[44px] justify-center px-3">
          <Text className="text-base font-semibold text-ink2 dark:text-ink2Dark">Exit</Text>
        </Pressable>
      </View>

      <View className="mt-2 h-2 w-full overflow-hidden rounded-full bg-track dark:bg-trackDark">
        <View className="h-2 rounded-full bg-primary" style={{ width: `${((index + 1) / DASS_ITEM_COUNT) * 100}%` }} />
      </View>
      <Text className="mt-1 text-sm text-ink3 dark:text-ink3Dark">
        Question {index + 1} of {DASS_ITEM_COUNT}
      </Text>

      <View className="mt-3 flex-1 flex-row gap-4">
        <View className="flex-1 justify-center">
          <Text className="text-xl font-semibold leading-7 text-ink dark:text-inkDark">{item.text}</Text>
        </View>
        <View className="flex-1 justify-center gap-2">
          {ANSWER_OPTIONS.map((o) => {
            const selected = current === o.value;
            return (
              <Pressable
                key={o.value}
                onPress={() => choose(o.value)}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                className={`min-h-[56px] justify-center rounded-xl border px-4 py-2 ${
                  selected ? 'border-primary bg-primaryMuted dark:bg-primaryMutedDark' : 'border-line dark:border-lineDark bg-card dark:bg-cardDark'
                }`}
              >
                <Text className={`text-base ${selected ? 'font-semibold text-primary dark:text-primaryLightDark' : 'text-ink dark:text-inkDark'}`}>
                  {o.value} · {o.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View className="mt-2 flex-row justify-between">
        <Pressable
          onPress={() => setIndex(Math.max(0, index - 1))}
          disabled={index === 0}
          accessibilityRole="button"
          className={`min-h-[48px] min-w-[100px] items-center justify-center rounded-xl border border-line dark:border-lineDark px-4 ${index === 0 ? 'opacity-40' : ''}`}
        >
          <Text className="text-base font-semibold text-ink2 dark:text-ink2Dark">Back</Text>
        </Pressable>
        {current !== null && index < DASS_ITEM_COUNT - 1 ? (
          <Pressable
            onPress={() => setIndex(index + 1)}
            accessibilityRole="button"
            className="min-h-[48px] min-w-[100px] items-center justify-center rounded-xl border border-line dark:border-lineDark px-4"
          >
            <Text className="text-base font-semibold text-ink2 dark:text-ink2Dark">Next</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}
