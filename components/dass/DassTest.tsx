import React, { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, ScrollView, Text, View } from 'react-native';
import { ANSWER_OPTIONS, DASS21_ITEMS, DASS_INSTRUCTION, DASS_ITEM_COUNT } from '@/constants/dass21';

interface Props {
  answers: (number | null)[];
  onChange: (index: number, value: number) => void;
  onFinish: () => void;
  onExit: () => void;
}

export default function DassTest({ answers, onChange, onFinish, onExit }: Props) {
  const firstUnanswered = answers.findIndex((answer) => answer === null);
  const [index, setIndex] = useState(firstUnanswered === -1 ? 0 : firstUnanswered);
  const [showValidation, setShowValidation] = useState(false);
  const progress = useRef(new Animated.Value((index + 1) / DASS_ITEM_COUNT)).current;
  const item = DASS21_ITEMS[index];
  const current = answers[index];

  useEffect(() => {
    Animated.timing(progress, { toValue: (index + 1) / DASS_ITEM_COUNT, duration: 220, useNativeDriver: false }).start();
  }, [index, progress]);

  const moveNext = () => {
    if (current === null) {
      setShowValidation(true);
      return;
    }
    setShowValidation(false);
    if (index === DASS_ITEM_COUNT - 1) onFinish();
    else setIndex((value) => value + 1);
  };

  const barWidth = progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });
  return (
    <View className="flex-1 px-5 pb-4 pt-3">
      <View className="flex-row items-center justify-between">
        <Text className="text-lg font-display font-bold text-ink dark:text-inkDark">DASS-21</Text>
        <Pressable onPress={onExit} accessibilityRole="button" className="min-h-[44px] justify-center px-2">
          <Text className="text-base font-semibold text-ink2 dark:text-ink2Dark">Exit</Text>
        </Pressable>
      </View>
      <Text className="font-sans mt-1 text-sm leading-5 text-ink2 dark:text-ink2Dark">{DASS_INSTRUCTION}</Text>

      <View className="mt-4 flex-row items-center justify-between">
        <Text className="text-sm font-semibold text-ink dark:text-inkDark">Question {index + 1} of {DASS_ITEM_COUNT}</Text>
        <Text className="text-sm font-semibold text-primary">{Math.round(((index + 1) / DASS_ITEM_COUNT) * 100)}%</Text>
      </View>
      <View className="mt-2 h-2.5 overflow-hidden rounded-full bg-track dark:bg-trackDark" accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: DASS_ITEM_COUNT, now: index + 1 }}>
        <Animated.View className="h-full rounded-full bg-primary" style={{ width: barWidth }} />
      </View>

      <ScrollView className="mt-4 flex-1" contentContainerStyle={{ paddingBottom: 8 }} showsVerticalScrollIndicator={false}>
        <View className="rounded-3xl border border-line bg-card p-5 dark:border-lineDark dark:bg-cardDark">
          <Text className="text-xs font-semibold uppercase tracking-wide text-primary">Over the past week</Text>
          <Text accessibilityRole="header" className="mt-3 text-2xl font-semibold leading-8 text-ink dark:text-inkDark">{item.text}</Text>
        </View>

        <Text className="mb-2 mt-5 text-sm font-semibold text-ink2 dark:text-ink2Dark">Choose one response</Text>
        <View accessibilityRole="radiogroup" accessibilityLabel="Response options" className="gap-2">
          {ANSWER_OPTIONS.map((option) => {
            const selected = current === option.value;
            return (
              <Pressable
                key={option.value}
                onPress={() => { onChange(index, option.value); setShowValidation(false); }}
                accessibilityRole="radio"
                accessibilityLabel={option.label}
                accessibilityState={{ selected }}
                className={`min-h-[58px] flex-row items-center rounded-2xl border px-4 py-3 active:opacity-80 ${selected ? 'border-primary bg-primaryMuted dark:bg-primaryMutedDark' : 'border-line bg-card dark:border-lineDark dark:bg-cardDark'}`}
              >
                <View className={`mr-3 h-5 w-5 items-center justify-center rounded-full border-2 ${selected ? 'border-primary' : 'border-line dark:border-lineDark'}`}>
                  {selected ? <View className="h-2.5 w-2.5 rounded-full bg-primary" /> : null}
                </View>
                <Text className={`flex-1 text-base leading-5 ${selected ? 'font-semibold text-primary dark:text-primaryLightDark' : 'text-ink dark:text-inkDark'}`}>
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
        {showValidation ? <Text accessibilityRole="alert" className="mt-2 text-sm font-medium text-[#C94C3C]">Select a response to continue.</Text> : null}
      </ScrollView>

      <View className="mt-3 flex-row gap-3">
        <Pressable onPress={() => { setShowValidation(false); setIndex((value) => Math.max(0, value - 1)); }} disabled={index === 0}
          accessibilityRole="button" accessibilityState={{ disabled: index === 0 }}
          className={`min-h-[54px] flex-1 items-center justify-center rounded-2xl border border-line bg-card px-4 dark:border-lineDark dark:bg-cardDark ${index === 0 ? 'opacity-40' : 'active:opacity-70'}`}>
          <Text className="text-base font-semibold text-ink2 dark:text-ink2Dark">Previous</Text>
        </Pressable>
        <Pressable onPress={moveNext} accessibilityRole="button" className="min-h-[54px] flex-1 items-center justify-center rounded-2xl bg-primary px-4 active:opacity-80">
          <Text className="text-base font-semibold text-white">{index === DASS_ITEM_COUNT - 1 ? 'Submit Assessment' : 'Next'}</Text>
        </Pressable>
      </View>
    </View>
  );
}
