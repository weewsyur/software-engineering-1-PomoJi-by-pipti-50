import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useColors } from '@/constants/colors';
import { useTheme } from '@/contexts/ThemeContext';
import MoodRating from '@/components/MoodRating';
import type { MoodRating as MoodRatingValue } from '@/constants/mood';

export interface MoodCheckInModalProps {
  visible: boolean;
  /** True while the rating is being written to Firestore. */
  saving?: boolean;
  /** Shown inline when saving failed; user can retry or skip. */
  errorMessage?: string | null;
  onSelect: (rating: MoodRatingValue) => void;
  onSkip: () => void;
}

export default function MoodCheckInModal({
  visible,
  saving = false,
  errorMessage = null,
  onSelect,
  onSkip,
}: MoodCheckInModalProps) {
  const [selected, setSelected] = useState<MoodRatingValue | null>(null);
  const { isDarkMode } = useTheme();
  const colors = useColors(isDarkMode);

  useEffect(() => {
    if (!visible) setSelected(null);
  }, [visible]);

  const handleSelect = (rating: number) => {
    if (saving) return;
    setSelected(rating as MoodRatingValue);
    onSelect(rating as MoodRatingValue);
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

          <MoodRating value={selected} onChange={handleSelect} disabled={saving} />

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
  title: { fontSize: 20, fontWeight: '700', fontFamily: "BricolageGrotesque_700Bold", textAlign: 'center' },
  subtitle: { fontWeight: "400", fontFamily: "BricolageGrotesque_400Regular", fontSize: 14, textAlign: 'center', marginTop: 4, marginBottom: 18 },
  status: { marginTop: 14, textAlign: 'center', fontWeight: "400", fontFamily: 'BricolageGrotesque_400Regular' },
  error: { color: '#C8402F', fontWeight: "400", fontFamily: "BricolageGrotesque_400Regular", fontSize: 13 },
  skip: { marginTop: 12, alignItems: 'center', justifyContent: 'center', minHeight: 44 },
  skipText: { fontSize: 14, fontWeight: '600', fontFamily: "BricolageGrotesque_600SemiBold" },
  skipDisabled: { opacity: 0.4 },
});
