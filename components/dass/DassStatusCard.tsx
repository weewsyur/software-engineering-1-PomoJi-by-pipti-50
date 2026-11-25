import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/services/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { useColors } from '@/constants/colors';
import { useTheme } from '@/contexts/ThemeContext';
import {
  DASS_BLOCK_THRESHOLD,
  DASS_STATUS_COPY,
  SEVERITY_LABELS,
  SEVERITY_ORDER,
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

// Soft, calm severity hues — shared with the result screen's indicator bars.
const SEVERITY_COLORS: Record<DassSeverity, string> = {
  normal: '#3E9B6B',
  mild: '#8AA92C',
  moderate: '#C98A12',
  severe: '#D96C2C',
  extremely_severe: '#C25B5B',
};

const SUBSCALES: { key: DassSubscale; scoreKey: 'stress_score' | 'anxiety_score' | 'depression_score' }[] = [
  { key: 'stress', scoreKey: 'stress_score' },
  { key: 'anxiety', scoreKey: 'anxiety_score' },
  { key: 'depression', scoreKey: 'depression_score' },
];

// Gate sits at the START of the threshold band (e.g. Severe = index 3 of 5).
const GATE_FRACTION = SEVERITY_ORDER.indexOf(DASS_BLOCK_THRESHOLD) / SEVERITY_ORDER.length;

function SubscaleRow({
  label,
  score,
  severity,
  colors,
}: {
  label: string;
  score: number;
  severity: DassSeverity;
  colors: ReturnType<typeof useColors>;
}) {
  const color = SEVERITY_COLORS[severity];
  const filled = SEVERITY_ORDER.indexOf(severity) + 1;
  return (
    <View>
      <View style={styles.rowLine}>
        <Text style={[styles.subscaleLabel, { color: colors.text }]}>{label}</Text>
        <Text style={[styles.score, { color: colors.textSecondary }]}>
          {score}
          <Text style={styles.scoreMax}>{DASS_STATUS_COPY.scoreOutOf}</Text>
        </Text>
      </View>
      <View style={[styles.pill, { backgroundColor: `${color}1F` }]}>
        <Text style={[styles.pillText, { color }]}>{SEVERITY_LABELS[severity]}</Text>
      </View>
      <View style={styles.track}>
        {SEVERITY_ORDER.map((level, i) => (
          <View
            key={level}
            style={[
              styles.segment,
              {
                backgroundColor: i < filled ? color : colors.border,
                marginRight: i === SEVERITY_ORDER.length - 1 ? 0 : 4,
              },
            ]}
          />
        ))}
        <View
          pointerEvents="none"
          style={[
            styles.gateMarker,
            { left: `${GATE_FRACTION * 100}%`, backgroundColor: colors.textMuted },
          ]}
        />
      </View>
    </View>
  );
}

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
  const dassRevision = useSessionFlowStore((s) => s.dassRevision);
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
  }, [load, dassRevision]);

  const severities = result ? storedSeverities(result) : null;
  const blocked = severities ? isBlocked(severities) : false;
  const gateHint = DASS_STATUS_COPY.gateHint.replace(
    '{threshold}',
    SEVERITY_LABELS[DASS_BLOCK_THRESHOLD],
  );

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.border },
        style,
      ]}
    >
      <Text style={[styles.title, { color: colors.text }]}>{DASS_STATUS_COPY.title}</Text>
      {!loaded ? (
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>{DASS_STATUS_COPY.loading}</Text>
      ) : !result || !severities ? (
        <>
          <Text style={[styles.headline, { color: colors.text }]}>{DASS_STATUS_COPY.emptyTitle}</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {DASS_STATUS_COPY.emptyBody}
          </Text>
          <Pressable
            onPress={() => router.push(ROUTES.DASS)}
            accessibilityRole="button"
            style={[styles.button, { backgroundColor: colors.primary }]}
          >
            <Text style={styles.buttonText}>{DASS_STATUS_COPY.emptyCta}</Text>
          </Pressable>
        </>
      ) : (
        <>
          <Text style={[styles.headline, { color: colors.text }]}>
            {blocked ? DASS_STATUS_COPY.blockedHeadline : DASS_STATUS_COPY.passedHeadline}
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {blocked ? DASS_STATUS_COPY.blockedNote : DASS_STATUS_COPY.passedNote}
          </Text>

          <View style={styles.rows}>
            {SUBSCALES.map(({ key, scoreKey }) => (
              <SubscaleRow
                key={key}
                label={SUBSCALE_LABELS[key]}
                score={result[scoreKey]}
                severity={severities[key]}
                colors={colors}
              />
            ))}
          </View>

          <View style={styles.axis}>
            {SEVERITY_ORDER.map((level, i) => (
              <Text
                key={level}
                style={[
                  styles.axisLabel,
                  {
                    color: colors.textMuted,
                    marginRight: i === SEVERITY_ORDER.length - 1 ? 0 : 4,
                  },
                ]}
              >
                {DASS_STATUS_COPY.axisLabels[level]}
              </Text>
            ))}
          </View>

          <View style={styles.legendRow}>
            <View style={[styles.legendMarkerLine, { backgroundColor: colors.textMuted }]} />
            <Text style={[styles.legendText, { color: colors.textMuted }]}>
              {DASS_STATUS_COPY.pausePointLabel}
            </Text>
          </View>
          <Text style={[styles.gateHint, { color: colors.textMuted }]}>{gateHint}</Text>

          <View style={styles.footer}>
            <Text style={[styles.dateText, { color: colors.textMuted }]}>{result.date}</Text>
            <Pressable
              onPress={() => router.push(ROUTES.DASS_HISTORY)}
              accessibilityRole="button"
              accessibilityLabel="View readiness history"
              style={styles.historyLink}
            >
              <Text style={[styles.historyLinkText, { color: colors.primary }]}>
                {DASS_STATUS_COPY.viewHistory}
              </Text>
            </Pressable>
          </View>
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
  title: { fontSize: 13, fontWeight: '700', fontFamily: "BricolageGrotesque_700Bold", letterSpacing: 0.4, textTransform: 'uppercase' },
  headline: { fontSize: 19, fontWeight: '800', fontFamily: "BricolageGrotesque_800ExtraBold", marginTop: 8, lineHeight: 24 },
  subtitle: { fontWeight: "400", fontFamily: "BricolageGrotesque_400Regular", fontSize: 13, marginTop: 6, lineHeight: 19 },
  rows: { marginTop: 14, gap: 14 },
  rowLine: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  subscaleLabel: { fontSize: 14, fontWeight: '700', fontFamily: "BricolageGrotesque_700Bold" },
  score: { fontSize: 15, fontWeight: '700', fontFamily: "BricolageGrotesque_700Bold", fontVariant: ['tabular-nums'] },
  scoreMax: { fontSize: 11, fontWeight: '500', fontFamily: "BricolageGrotesque_500Medium" },
  pill: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginTop: 4,
  },
  pillText: { fontSize: 11, fontWeight: '700', fontFamily: "BricolageGrotesque_700Bold" },
  track: {
    flexDirection: 'row',
    marginTop: 8,
    position: 'relative',
  },
  segment: { flex: 1, height: 8, borderRadius: 4 },
  gateMarker: {
    position: 'absolute',
    top: -3,
    bottom: -3,
    width: 2,
    borderRadius: 1,
    marginLeft: -1,
  },
  axis: { flexDirection: 'row', marginTop: 4 },
  axisLabel: { flex: 1, fontWeight: "400", fontFamily: "BricolageGrotesque_400Regular", fontSize: 9, textAlign: 'center' },
  legendRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 6 },
  legendMarkerLine: { width: 2, height: 10, borderRadius: 1 },
  legendText: { fontSize: 11, fontWeight: '600', fontFamily: "BricolageGrotesque_600SemiBold" },
  gateHint: { fontWeight: "400", fontFamily: "BricolageGrotesque_400Regular", fontSize: 11, lineHeight: 15, marginTop: 2 },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  dateText: { fontWeight: "400", fontFamily: "BricolageGrotesque_400Regular", fontSize: 11, fontVariant: ['tabular-nums'] },
  historyLink: { paddingVertical: 4 },
  historyLinkText: { fontSize: 13, fontWeight: '700', fontFamily: "BricolageGrotesque_700Bold" },
  button: {
    marginTop: 12,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  buttonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700', fontFamily: "BricolageGrotesque_700Bold" },
});
