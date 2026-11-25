import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { REST_DURATION_OPTIONS, type RestDurationMinutes } from '@/constants/restPeriod';

interface Props {
  selected: RestDurationMinutes | null;
  busy: boolean;
  onSelect: (minutes: RestDurationMinutes) => void;
}

export default function RestOptions({ selected, busy, onSelect }: Props) {
  return (
    <View className="gap-3">
      {REST_DURATION_OPTIONS.map((option) => {
        const isSelected = selected === option.minutes;
        return (
          <Pressable
            key={option.minutes}
            onPress={() => onSelect(option.minutes)}
            disabled={busy}
            accessibilityRole="radio"
            accessibilityState={{ selected: isSelected, disabled: busy }}
            className={`rounded-2xl border p-4 ${
              isSelected
                ? 'border-primary bg-primaryMuted dark:bg-primaryMutedDark'
                : 'border-line bg-card dark:border-lineDark dark:bg-cardDark'
            }`}
          >
            <View className="flex-row items-center justify-between">
              <Text className={`text-lg font-semibold ${isSelected ? 'text-primary dark:text-primaryLightDark' : 'text-ink dark:text-inkDark'}`}>
                {option.title}
              </Text>
              <Text className={`text-sm font-semibold ${isSelected ? 'text-primary dark:text-primaryLightDark' : 'text-ink2 dark:text-ink2Dark'}`}>
                {option.minutes / 60} hr{option.minutes === 60 ? '' : 's'}
              </Text>
            </View>
            <Text className="font-sans mt-1 text-sm leading-5 text-ink2 dark:text-ink2Dark">
              {option.description}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
