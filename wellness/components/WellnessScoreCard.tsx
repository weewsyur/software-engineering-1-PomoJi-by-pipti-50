import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { ArrowRight, Heart } from 'lucide-react-native';
import type { WellnessScoreState, WellnessStatus } from '../types/wellness';

/** Brand colours (from the PomoJI Home screen). Tweak here to retheme. */
const C = {
  accent: '#F9522E',
  text: '#1B1B1B',
  body: '#5F5F5F',
  muted: '#8A8A8A',
  faint: '#B9B4AC',
  track: '#EFEBE5',
  hairline: '#E9E5DE',
  card: '#FFFFFF',
};

/** Score bands (match getWellnessStatus): 0-39, 40-59, 60-79, 80-100. */
const BANDS = [
  { from: 0, to: 40, color: '#F9522E' },
  { from: 40, to: 60, color: '#E8920F' },
  { from: 60, to: 80, color: '#2F6DB5' },
  { from: 80, to: 100, color: '#2E9E6B' },
] as const;

const STATUS: Record<WellnessStatus, { color: string; insight: string }> = {
  Excellent: { color: '#2E9E6B', insight: "You're keeping a healthy rhythm." },
  Good: { color: '#2F6DB5', insight: 'Steady progress this week.' },
  Fair: { color: '#E8920F', insight: 'Room for a more balanced week.' },
  'Needs Attention': { color: '#F9522E', insight: 'A lighter, more balanced week could help.' },
};

export interface WellnessScoreCardProps {
  /** Output of useWellnessScore(). */
  state: WellnessScoreState;
  /** Shows the "Dashboard" link only when provided. */
  onPressDashboard?: () => void;
  onRetry?: () => void;
  style?: StyleProp<ViewStyle>;
}

/** Four-band gauge; each band fills as the score passes through it. */
function Gauge({ score }: { score: number | null }) {
  return (
    <View style={styles.gauge} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {BANDS.map((b) => {
        const span = b.to - b.from;
        const frac = score === null ? 0 : Math.max(0, Math.min(1, (score - b.from) / span));
        return (
          <View key={b.from} style={[styles.seg, { flex: span }]}>
            <View style={{ width: `${frac * 100}%`, height: '100%', backgroundColor: b.color }} />
          </View>
        );
      })}
    </View>
  );
}

function Stat({ label, value, first }: { label: string; value: number | null; first?: boolean }) {
  const pct = value === null ? 0 : Math.max(0, Math.min(100, value));
  return (
    <View
      style={[styles.stat, !first && styles.statDivider]}
      accessible
      accessibilityLabel={`${label}: ${value === null ? 'not enough data yet' : `${pct} percent`}`}
    >
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, value === null && { color: C.faint }]}>{value === null ? '--' : `${pct}%`}</Text>
      <View style={styles.statTrack}>
        <View style={[styles.statFill, { width: `${pct}%` }]} />
      </View>
    </View>
  );
}

export default function WellnessScoreCard({ state, onPressDashboard, onRetry, style }: WellnessScoreCardProps) {
  let body: React.ReactNode;

  if (state.status === 'loading') {
    body = (
      <View style={styles.centerBlock} accessibilityLabel="Loading wellness score">
        <ActivityIndicator color={C.accent} />
      </View>
    );
  } else if (state.status === 'error') {
    body = (
      <View style={styles.centerBlock}>
        <Text style={styles.message}>We couldn't load your wellness score.</Text>
        {onRetry ? (
          <Pressable onPress={onRetry} accessibilityRole="button">
            <Text style={styles.linkText}>Try again</Text>
          </Pressable>
        ) : null}
      </View>
    );
  } else if (state.status === 'unauthenticated') {
    body = (
      <View style={styles.centerBlock}>
        <Text style={styles.message}>Sign in to see your wellness score.</Text>
      </View>
    );
  } else {
    const isEmpty = state.status === 'empty';
    const result = state.result;
    const score = isEmpty ? null : result.score;
    const meta = !isEmpty && result.status ? STATUS[result.status] : null;
    body = (
      <>
        <View style={styles.hero}>
          <View style={styles.scoreRow}>
            <Text
              style={[styles.score, score === null && { color: C.faint }]}
              accessibilityLabel={score === null ? 'No wellness score yet' : `Wellness score ${score} out of 100`}
            >
              {score === null ? '--' : score}
            </Text>
            <Text style={styles.outOf}>/100</Text>
          </View>
          <View style={styles.heroRight}>
            {meta && result.status ? (
              <>
                <Text style={[styles.status, { color: meta.color }]}>{result.status.toUpperCase()}</Text>
                <Text style={styles.insight}>{meta.insight}</Text>
              </>
            ) : (
              <>
                <Text style={[styles.status, { color: C.muted }]}>NO SCORE YET</Text>
                <Text style={styles.insight}>Complete a focus session this week to see your wellness score.</Text>
              </>
            )}
          </View>
        </View>

        <Gauge score={score} />

        <View style={styles.statsRow}>
          <Stat first label="MOOD" value={isEmpty ? null : result.components.mood} />
          <Stat label="BREAKS" value={isEmpty ? null : result.components.breakCompliance} />
          <Stat label="CONSISTENCY" value={isEmpty ? null : result.components.sessionFrequency} />
        </View>
      </>
    );
  }

  return (
    <View style={[styles.card, style]}>
      <View style={styles.header}>
        <View style={styles.iconTile}>
          <Heart size={20} color="#FFFFFF" fill="#FFFFFF" />
        </View>
        <View>
          <Text style={styles.title}>Wellness Score</Text>
          <Text style={styles.subtitle}>Last 7 days</Text>
        </View>
      </View>

      {body}

      <View style={styles.footer}>
        {onPressDashboard ? (
          <Pressable
            onPress={onPressDashboard}
            accessibilityRole="link"
            accessibilityLabel="Open dashboard"
            hitSlop={8}
            style={({ pressed }) => [styles.link, pressed && { opacity: 0.6 }]}
          >
            <Text style={styles.linkText}>Dashboard</Text>
            <ArrowRight size={12} color={C.accent} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: C.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.hairline,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconTile: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: C.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 16, fontWeight: '700', color: C.text, letterSpacing: -0.2 },
  subtitle: { fontSize: 12, color: C.muted, marginTop: 1 },

  hero: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 14, gap: 12 },
  scoreRow: { flexDirection: 'row', alignItems: 'baseline', gap: 3 },
  score: { fontSize: 46, fontWeight: '800', color: C.text, letterSpacing: -1.5, lineHeight: 50 },
  outOf: { fontSize: 15, fontWeight: '600', color: C.muted },
  heroRight: { flex: 1, alignItems: 'flex-end', paddingBottom: 4 },
  status: { fontSize: 12, fontWeight: '800', letterSpacing: 1 },
  insight: { fontSize: 12.5, color: C.body, marginTop: 2, textAlign: 'right', lineHeight: 17 },

  gauge: { flexDirection: 'row', gap: 2, height: 6, marginTop: 12 },
  seg: { borderRadius: 3, backgroundColor: C.track, overflow: 'hidden' },

  statsRow: { flexDirection: 'row', marginTop: 16 },
  stat: { flex: 1 },
  statDivider: { borderLeftWidth: 1, borderLeftColor: C.hairline, paddingLeft: 12 },
  statLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 0.8, color: C.muted },
  statValue: { fontSize: 20, fontWeight: '800', color: C.text, letterSpacing: -0.5, marginTop: 2 },
  statTrack: { height: 3, borderRadius: 2, backgroundColor: C.track, marginTop: 6, overflow: 'hidden', marginRight: 12 },
  statFill: { height: 3, backgroundColor: C.accent },

  centerBlock: { alignItems: 'center', paddingVertical: 26, gap: 8 },
  message: { fontSize: 14, color: C.body, textAlign: 'center', lineHeight: 20 },

  footer: { borderTopWidth: 1, borderTopColor: C.hairline, marginTop: 14, paddingTop: 10, gap: 6 },
  link: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start' },
  linkText: { fontSize: 14, fontWeight: '800', color: C.accent },
  disclaimer: { fontSize: 10.5, color: C.faint },
});