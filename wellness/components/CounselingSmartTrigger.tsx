import React from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { HeartHandshake, X } from 'lucide-react-native';
import { useCounselingTrigger } from '../hooks/useCounselingTrigger';
import { DEFAULT_COUNSELING_THRESHOLD, type DismissalStore } from '../utils/counselingTrigger';

export interface CounselingSmartTriggerProps {
  /** Wellness score 0–100 (null while loading / no data: nothing is shown). */
  score: number | null | undefined;
  /** Show only when score is strictly below this value. Default 40. */
  threshold?: number;
  /** Navigate to your existing counseling feature. Route is NOT assumed. */
  onOpenCounseling: () => void;
  onDismiss?: () => void;
  /** Quiet period after dismissing / opening. Default 24h. */
  cooldownMs?: number;
  /** Persist dismissals (default: in-memory for the app session). */
  store?: DismissalStore;
  message?: string;
  style?: StyleProp<ViewStyle>;
}

export const DEFAULT_COUNSELING_MESSAGE =
  'Your wellness score has been lower recently. Would you like to talk to someone?';

/**
 * Renders nothing unless the score is below the threshold and the user hasn't
 * dismissed it recently. Place it next to / above your existing counseling
 * shortcut. The score is only a productivity/wellness indicator.
 */
export default function CounselingSmartTrigger({
  score,
  threshold = DEFAULT_COUNSELING_THRESHOLD,
  onOpenCounseling,
  onDismiss,
  cooldownMs,
  store,
  message = DEFAULT_COUNSELING_MESSAGE,
  style,
}: CounselingSmartTriggerProps) {
  const { visible, dismiss } = useCounselingTrigger({ score, threshold, cooldownMs, store });
  if (!visible) return null;

  const handleDismiss = () => {
    void dismiss();
    onDismiss?.();
  };
  const handleOpen = () => {
    void dismiss(); // don't nag again right after they engaged
    onOpenCounseling();
  };

  return (
    <View style={[styles.card, style]} accessibilityRole="summary">
      <Pressable
        onPress={handleDismiss}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel="Dismiss"
        style={styles.close}
      >
        <X size={18} color="#6B6B6B" />
      </Pressable>
      <View style={styles.iconWrap}>
        <HeartHandshake size={22} color="#C8402F" />
      </View>
      <Text style={styles.message}>{message}</Text>
      <Pressable onPress={handleOpen} accessibilityRole="button" style={styles.cta}>
        <Text style={styles.ctaText}>Talk to someone</Text>
      </Pressable>
      <Text style={styles.note}>This is a productivity &amp; wellness indicator, not a medical assessment.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFF4F1',
    borderColor: '#F3C9C0',
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
    paddingRight: 40,
  },
  close: { position: 'absolute', top: 12, right: 12 },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FBE4E0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  message: { fontSize: 15, lineHeight: 21, color: '#1F1F1F', fontWeight: '600' },
  cta: {
    alignSelf: 'flex-start',
    marginTop: 12,
    backgroundColor: '#C8402F',
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  ctaText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
  note: { fontSize: 11, color: '#6B6B6B', marginTop: 10 },
});
