import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useColors } from '@/constants/colors';
import { useTheme } from '@/contexts/ThemeContext';
import { MOOD_OPTIONS } from '@/constants/mood';

export interface MoodRatingProps {
  value: number | null;
  onChange: (rating: number) => void;
  disabled?: boolean;
}

/**
 * The shared 1-5 mood rating row. Used by the after-session MoodCheckInModal
 * and the before-session check — there is only one mood scale in the app.
 */
export default function MoodRating({ value, onChange, disabled = false }: MoodRatingProps) {
  const { isDarkMode } = useTheme();
  const colors = useColors(isDarkMode);

  return (
    <View style={styles.row}>
      {MOOD_OPTIONS.map((option) => {
        const isSelected = value === option.rating;
        return (
          <Pressable
            key={option.rating}
            onPress={() => {
              if (!disabled) onChange(option.rating);
            }}
            disabled={disabled}
            accessibilityRole="button"
            accessibilityLabel={`${option.label}, ${option.rating} of 5`}
            accessibilityState={{ selected: isSelected, disabled }}
            style={({ pressed }) => [
              styles.option,
              { backgroundColor: colors.background },
              isSelected && { borderColor: colors.primary, backgroundColor: colors.primaryMuted },
              pressed && styles.optionPressed,
              disabled && styles.optionDisabled,
            ]}
          >
            <Text style={styles.emoji} accessible={false}>{option.emoji}</Text>
            <Text
              style={[
                styles.optionLabel,
                { color: colors.textSecondary },
                isSelected && { color: colors.primary, fontWeight: '700', fontFamily: "Figtree_600SemiBold" },
              ]}
              numberOfLines={1}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 6 },
  option: {
    flex: 1,
    minWidth: 44,
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 2,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  optionPressed: { opacity: 0.7 },
  optionDisabled: { opacity: 0.5 },
  emoji: { fontFamily: "Figtree_400Regular", fontSize: 25 },
  optionLabel: { fontSize: 11, marginTop: 4, fontWeight: '500', fontFamily: "Figtree_500Medium" },
});
