import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/services/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { useColors } from '@/constants/colors';
import { useTheme } from '@/contexts/ThemeContext';
import {
  SEVERITY_LABELS,
  SUBSCALE_LABELS,
  type DassSeverity,
  type DassSubscale,
} from '@/constants/dass21';
import { ROUTES } from '@/constants/sessionFlow';
import {
  DASS_SUBCOLLECTION,
  storedSeverities,
  type StoredDassResult,
} from '@/services/dassService';
import { useSessionFlowStore } from '@/store/sessionFlowStore';
import { getLocalDateString } from '@/utils/localDate';
import { isBlocked } from '@/utils/dass21Score';

const SEVERITY_COLORS: Record<DassSeverity, string> = {
  normal: '#2E9E5B',
  mild: '#7CB518',
  moderate: '#C98A12',
  severe: '#D96C2C',
  extremely_severe: '#C94C3C',
};

const SUBSCALES: { key: DassSubscale; scoreKey: 'stress_score' | 'anxiety_score' | 'depression_score' }[] = [
  { key: 'stress', scoreKey: 'stress_score' },
  { key: 'anxiety', scoreKey: 'anxiety_score' },
  { key: 'depression', scoreKey: 'depression_score' },
];

/**
 * Shows today's DASS-21 readiness result on Home.
 * Prefers the in-memory flow store result; otherwise reads the day's doc.
 */
export default function DassStatusCard({ style }: { style?: object }) {
  const router = useRouter();
  const { user } = useAuth();
  const { isDarkMode } = useTheme();
  const colors = useColors(isDarkMode);
  const [fetched, setFetched] = useState<StoredDassResult | null>(null);
  const [loaded, setLoaded] = useState(false);

  // In-memory result confirmed from the server today wins over a fresh fetch.
  const flowResult = useSessionFlowStore((s) =>
    s.dassDate === getLocalDateString() ? s.dassResult : null,
  );
  const result = flowResult ?? fetched;

  const load = useCallback(async () => {
    const uid = user?.uid;
    if (!uid) {
      setLoaded(true);
      return;
    }
    try {
      const snap = await getDoc(
        doc(db, 'users', uid, DASS_SUBCOLLECTION, getLocalDateString()),
      );
      setFetched(snap.exists() ? (snap.data() as StoredDassResult) : null);
    } catch {
      setFetched(null);
    } finally {
      setLoaded(true);
    }
  }, [user?.uid]);

  useEffect(() => {
    void load();
  }, [load]);

  const severities = result ? storedSeverities(result) : null;
  const blocked = severities ? isBlocked(severities) : false;

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.border },
        style,
      ]}
    >
      <Text style={[styles.title, { color: colors.text }]}>Daily readiness check</Text>
      {!loaded ? (
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>Loading…</Text>
      ) : !result || !severities ? (
        <>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Take the short DASS-21 check before your first focus session each day.
          </Text>
          <Pressable
            onPress={() => router.push(ROUTES.DASS)}
            accessibilityRole="button"
            style={[styles.button, { backgroundColor: colors.primary }]}
          >
            <Text style={styles.buttonText}>Take readiness check</Text>
          </Pressable>
        </>
      ) : (
        <>
          <View style={styles.row}>
            {SUBSCALES.map(({ key, scoreKey }) => (
              <View key={key} style={styles.indicator}>
                <Text style={[styles.indicatorLabel, { color: colors.textMuted }]}>
                  {SUBSCALE_LABELS[key]}
                </Text>
                <Text
                  style={[
                    styles.indicatorValue,
                    { color: SEVERITY_COLORS[severities[key]] },
                  ]}
                >
                  {SEVERITY_LABELS[severities[key]]}
                </Text>
                <Text style={[styles.indicatorScore, { color: colors.textMuted }]}>
                  Score {result[scoreKey]}
                </Text>
              </View>
            ))}
          </View>
          <Text style={[styles.note, { color: colors.textMuted }]}>
            {blocked
              ? 'Today’s check suggests resting before a focus session. You can review it again from the check screen.'
              : 'Today’s check is complete. This is a screening tool, not a diagnosis.'}
          </Text>
          <Pressable
            onPress={() => router.push(ROUTES.DASS_HISTORY)}
            accessibilityRole="button"
            accessibilityLabel="View readiness history"
            style={styles.historyLink}
          >
            <Text style={[styles.historyLinkText, { color: colors.primary }]}>View history</Text>
          </Pressable>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  title: { fontSize: 16, fontWeight: '800' },
  subtitle: { fontSize: 13, marginTop: 6, lineHeight: 19 },
  row: { flexDirection: 'row', gap: 8, marginTop: 12 },
  indicator: {
    flex: 1,
    borderRadius: 12,
    backgroundColor: 'rgba(127,127,127,0.08)',
    padding: 10,
    alignItems: 'center',
  },
  indicatorLabel: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase' },
  indicatorValue: { fontSize: 14, fontWeight: '800', marginTop: 4 },
  indicatorScore: { fontSize: 11, marginTop: 2 },
  note: { fontSize: 12, lineHeight: 17, marginTop: 10 },
  historyLink: { marginTop: 8, alignSelf: 'flex-start', paddingVertical: 4 },
  historyLinkText: { fontSize: 13, fontWeight: '700' },
  button: {
    marginTop: 12,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  buttonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
});
