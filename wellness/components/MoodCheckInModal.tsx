import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Frown, Heart, Meh, Smile, SmilePlus, type LucideIcon } from 'lucide-react-native';
import { MOOD_OPTIONS, type MoodIconName, type MoodRating } from '../types/wellness';

const ICONS: Record<MoodIconName, LucideIcon> = { Frown, Meh, Smile, SmilePlus, Heart };

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
        <View style={styles.card} accessibilityViewIsModal>
          <Text style={styles.title}>How are you feeling?</Text>
          <Text style={styles.subtitle}>Nice work finishing that session.</Text>

          <View style={styles.row}>
            {MOOD_OPTIONS.map((option) => {
              const Icon = ICONS[option.icon];
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
                    isSelected && styles.optionSelected,
                    pressed && styles.optionPressed,
                  ]}
                >
                  <Icon size={28} color={isSelected ? '#2E7D5B' : '#5F5F5F'} strokeWidth={2} />
                  <Text style={[styles.optionLabel, isSelected && styles.optionLabelSelected]} numberOfLines={1}>
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {saving ? <ActivityIndicator style={styles.status} color="#2E7D5B" /> : null}
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
            <Text style={[styles.skipText, saving && styles.skipDisabled]}>Skip for now</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: 20 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 24, padding: 20 },
  title: { fontSize: 20, fontWeight: '700', color: '#1F1F1F', textAlign: 'center' },
  subtitle: { fontSize: 14, color: '#6B6B6B', textAlign: 'center', marginTop: 4, marginBottom: 18 },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 6 },
  option: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 2,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'transparent',
    backgroundColor: '#F6F3EC',
  },
  optionSelected: { borderColor: '#2E7D5B', backgroundColor: '#E3F3EA' },
  optionPressed: { opacity: 0.7 },
  optionLabel: { fontSize: 11, color: '#5F5F5F', marginTop: 6, fontWeight: '500' },
  optionLabelSelected: { color: '#2E7D5B', fontWeight: '700' },
  status: { marginTop: 14, textAlign: 'center' },
  error: { color: '#C8402F', fontSize: 13 },
  skip: { marginTop: 16, alignItems: 'center', paddingVertical: 8 },
  skipText: { color: '#6B6B6B', fontSize: 14, fontWeight: '600' },
  skipDisabled: { opacity: 0.4 },
});
