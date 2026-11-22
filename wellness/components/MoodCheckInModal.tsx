import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useColors } from '@/constants/colors';
import { useTheme } from '@/contexts/ThemeContext';
import { MOOD_OPTIONS, type MoodRating } from '../types/wellness';

export interface MoodCheckInModalProps {
  visible: boolean;
  /** True while the rating is being written to Firestore. */
  saving?: boolean;
  /** Shown inline when saving failed; user can retry or skip. */
  errorMessage?: string | null;
  onSelect: (rating: MoodRating) => void;
  onSkip: () => void;
}

export default function MoodCheckInModal({
  visible,
  saving = false,
  errorMessage = null,
  onSelect,
  onSkip,
}: MoodCheckInModalProps) {
  const [selected, setSelected] = useState<MoodRating | null>(null);
  const { isDarkMode } = useTheme();
  const colors = useColors(isDarkMode);

  useEffect(() => {
    if (!visible) setSelected(null);
  }, [visible]);

  const handleSelect = (rating: MoodRating) => {
    if (saving) return;
    setSelected(rating);
    onSelect(rating);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={() => {
        if (!saving) onSkip();
      }}
    >
      <View style={styles.backdrop}>
        <View style={[styles.card, { backgroundColor: colors.surface }]} accessibilityViewIsModal>
          <Text style={[styles.title, { color: colors.text }]}>How did that session feel?</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Nice work finishing that session.</Text>

          <View style={styles.row}>
            {MOOD_OPTIONS.map((option) => {
              const isSelected = selected === option.rating;
              return (
                <Pressable
                  key={option.rating}
                  onPress={() => handleSelect(option.rating)}
                  disabled={saving}
                  accessibilityRole="button"
                  accessibilityLabel={`${option.label}, ${option.rating} of 5`}
                  accessibilityState={{ selected: isSelected, disabled: saving }}
                  style={({ pressed }) => [
                    styles.option,
                    { backgroundColor: colors.background },
                    isSelected && { borderColor: colors.primary, backgroundColor: colors.primaryMuted },
                    pressed && styles.optionPressed,
                  ]}
                >
                  <Text style={styles.emoji} accessible={false}>{option.emoji}</Text>
                  <Text style={[styles.optionLabel, { color: colors.textSecondary }, isSelected && { color: colors.primary, fontWeight: '700' }]} numberOfLines={1}>
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {saving ? <ActivityIndicator style={styles.status} color={colors.primary} /> : null}
          {errorMessage ? (
            <Text style={[styles.status, styles.error]} accessibilityRole="alert">
              {errorMessage} Tap a mood to try again, or skip.
            </Text>
          ) : null}

          <Pressable
            onPress={onSkip}
            disabled={saving}
            accessibilityRole="button"
            accessibilityLabel="Skip for now"
            style={styles.skip}
          >
            <Text style={[styles.skipText, { color: colors.textSecondary }, saving && styles.skipDisabled]}>Skip for now</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: 20 },
  card: { borderRadius: 24, padding: 20 },
  title: { fontSize: 20, fontWeight: '700', textAlign: 'center' },
  subtitle: { fontSize: 14, textAlign: 'center', marginTop: 4, marginBottom: 18 },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 6 },
  option: {
    flex: 1,
    minWidth: 48,
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
  emoji: { fontSize: 25 },
  optionLabel: { fontSize: 11, marginTop: 4, fontWeight: '500' },
  status: { marginTop: 14, textAlign: 'center' },
  error: { color: '#C8402F', fontSize: 13 },
  skip: { marginTop: 12, alignItems: 'center', justifyContent: 'center', minHeight: 44 },
  skipText: { fontSize: 14, fontWeight: '600' },
  skipDisabled: { opacity: 0.4 },
});
