import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import {
  ArrowRight,
  CalendarCheck,
  Coffee,
  HeartPulse,
  Smile,
  TrendingUp,
  type LucideIcon,
} from 'lucide-react-native';
import type { WellnessScoreState, WellnessStatus } from '../types/wellness';

/** Brand colours (taken from the PomoJI Home screen). Tweak here to retheme. */
const C = {
  accent: '#F9522E',
  accentTint: '#FFE5DF',
  accentSoft: '#FFF3F0',
  text: '#1B1B1B',
  muted: '#8A8A8A',
  track: '#F1ECE6',
  divider: '#EFEAE3',
  card: '#FFFFFF',
  mood: '#2E9E6B',
  moodTint: '#E2F5EC',
  breaks: '#2F6DB5',
  breaksTint: '#E1ECF8',
  freq: '#E8920F',
  freqTint: '#FDF0D9',
};

const STATUS: Record<WellnessStatus, { color: string; tint: string; insight: string }> = {
  Excellent: { color: '#2E9E6B', tint: '#E2F5EC', insight: "You're keeping a healthy rhythm." },
  Good: { color: '#2F6DB5', tint: '#E1ECF8', insight: 'Steady progress this week.' },
  Fair: { color: '#E8920F', tint: '#FDF0D9', insight: 'Room to build a more balanced week.' },
  'Needs Attention': { color: '#F9522E', tint: '#FFE5DF', insight: 'A lighter, more balanced week could help.' },
};

export interface WellnessScoreCardProps {
  /** Output of useWellnessScore(). */
  state: WellnessScoreState;
  /** Shows the "Dashboard" button only when provided. */
  onPressDashboard?: () => void;
  onRetry?: () => void;
  style?: StyleProp<ViewStyle>;
}

function ScoreRing({
  score,
  color,
  size = 132,
  stroke = 13,
  children,
}: {
  score: number | null;
  color: string;
  size?: number;
  stroke?: number;
  children: React.ReactNode;
}) {
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const pct = score === null ? 0 : Math.max(0, Math.min(100, score));
  const mid = size / 2;
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Circle cx={mid} cy={mid} r={r} stroke={C.track} strokeWidth={stroke} fill="none" />
        {pct > 0 ? (
          <Circle
            cx={mid}
            cy={mid}
            r={r}
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            fill="none"
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={circumference * (1 - pct / 100)}
            rotation="-90"
            origin={`${mid}, ${mid}`}
          />
        ) : null}
      </Svg>
      <View style={[StyleSheet.absoluteFill, styles.ringCenter]}>{children}</View>
    </View>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  color,
  tint,
}: {
  icon: LucideIcon;
  label: string;
  value: number | null;
  color: string;
  tint: string;
}) {
  const pct = value === null ? 0 : Math.max(0, Math.min(100, value));
  return (
    <View
      style={styles.metric}
      accessible
      accessibilityLabel={`${label}: ${value === null ? 'not enough data yet' : `${pct} percent`}`}
    >
      <View style={[styles.metricIcon, { backgroundColor: tint }]}>
        <Icon size={16} color={color} />
      </View>
      <View style={styles.metricBody}>
        <View style={styles.metricHeader}>
          <Text style={styles.metricLabel}>{label}</Text>
          <Text style={[styles.metricValue, value === null && { color: C.muted }]}>
            {value === null ? 'Not enough data' : `${pct}%`}
          </Text>
        </View>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${pct}%`, backgroundColor: color }]} />
        </View>
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
        <Text style={styles.message}>Calculating your score…</Text>
      </View>
    );
  } else if (state.status === 'error') {
    body = (
      <View style={styles.centerBlock}>
        <Text style={styles.message}>We couldn't load your wellness score.</Text>
        {onRetry ? (
          <Pressable onPress={onRetry} accessibilityRole="button" style={styles.softButton}>
            <Text style={styles.softButtonText}>Try again</Text>
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
  } else if (state.status === 'empty') {
    body = (
      <View style={styles.emptyWrap}>
        <ScoreRing score={null} color={C.accent} size={112} stroke={11}>
          <Text style={styles.emptyDash}>--</Text>
        </ScoreRing>
        <Text style={styles.emptyTitle}>No score yet</Text>
        <Text style={styles.message}>Complete a focus session this week to see your wellness score.</Text>
        <View style={styles.chipRow}>
          {[
            { icon: Smile, label: 'Mood', color: C.mood, tint: C.moodTint },
            { icon: Coffee, label: 'Breaks', color: C.breaks, tint: C.breaksTint },
            { icon: CalendarCheck, label: 'Consistency', color: C.freq, tint: C.freqTint },
          ].map(({ icon: Icon, label, color, tint }) => (
            <View key={label} style={[styles.chip, { backgroundColor: tint }]}>
              <Icon size={13} color={color} />
              <Text style={[styles.chipText, { color }]}>{label}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  } else {
    const { result } = state;
    const meta = result.status ? STATUS[result.status] : null;
    const color = meta?.color ?? C.accent;
    body = (
      <>
        <View style={styles.heroRow}>
          <ScoreRing score={result.score} color={color}>
            <Text style={styles.score} accessibilityLabel={`Wellness score ${result.score} out of 100`}>
              {result.score}
            </Text>
            <Text style={styles.outOf}>out of 100</Text>
          </ScoreRing>
          <View style={styles.heroText}>
            {result.status && meta ? (
              <View style={[styles.pill, { backgroundColor: meta.tint }]}>
                <View style={[styles.pillDot, { backgroundColor: meta.color }]} />
                <Text style={[styles.pillText, { color: meta.color }]}>{result.status}</Text>
              </View>
            ) : null}
            {meta ? <Text style={styles.insight}>{meta.insight}</Text> : null}
            <Text style={styles.sessionsNote}>
              {result.counts.completedWorkSessions} focus session
              {result.counts.completedWorkSessions === 1 ? '' : 's'} this week
            </Text>
          </View>
        </View>

        <View style={styles.metrics}>
          <Metric icon={Smile} label="Mood" value={result.components.mood} color={C.mood} tint={C.moodTint} />
          <Metric
            icon={Coffee}
            label="Break compliance"
            value={result.components.breakCompliance}
            color={C.breaks}
            tint={C.breaksTint}
          />
          <Metric
            icon={CalendarCheck}
            label="Consistency"
            value={result.components.sessionFrequency}
            color={C.freq}
            tint={C.freqTint}
          />
        </View>
      </>
    );
  }

  return (
    <View style={[styles.shadow, style]}>
      <View style={styles.card}>
        <View style={styles.blob} pointerEvents="none" />
        <View style={styles.blobSmall} pointerEvents="none" />

        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.iconTile}>
              <HeartPulse size={20} color={C.accent} />
            </View>
            <View>
              <Text style={styles.title}>Wellness Score</Text>
              <Text style={styles.subtitle}>Your last 7 days</Text>
            </View>
          </View>
          <View style={styles.iconTile}>
            <TrendingUp size={20} color={C.accent} />
          </View>
        </View>

        {body}

        <View style={styles.footer}>
          <Text style={styles.footerText}>Updates after every session</Text>
          {onPressDashboard ? (
            <Pressable
              onPress={onPressDashboard}
              accessibilityRole="button"
              accessibilityLabel="Open dashboard"
              style={({ pressed }) => [styles.dashButton, pressed && { opacity: 0.75 }]}
            >
              <Text style={styles.dashText}>Dashboard</Text>
              <ArrowRight size={16} color={C.accent} />
            </Pressable>
          ) : null}
        </View>
        <Text style={styles.disclaimer}>A productivity &amp; wellness indicator, not a medical assessment.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Shadow lives on a wrapper because overflow:hidden would clip it on iOS.
  shadow: {
    borderRadius: 28,
    backgroundColor: C.card,
    shadowColor: '#7A3B1D',
    shadowOpacity: 0.14,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  card: { borderRadius: 28, backgroundColor: C.card, padding: 20, overflow: 'hidden' },
  blob: {
    position: 'absolute',
    top: -70,
    right: -60,
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: C.accentSoft,
  },
  blobSmall: {
    position: 'absolute',
    top: 40,
    right: 50,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: C.accentSoft,
    opacity: 0.7,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconTile: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: C.accentTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 19, fontWeight: '800', color: C.text },
  subtitle: { fontSize: 13, color: C.muted, marginTop: 1 },

  heroRow: { flexDirection: 'row', alignItems: 'center', gap: 18, marginTop: 22 },
  ringCenter: { alignItems: 'center', justifyContent: 'center' },
  score: { fontSize: 42, fontWeight: '800', color: C.text, lineHeight: 46 },
  outOf: { fontSize: 11, color: C.muted, marginTop: 0 },
  heroText: { flex: 1, gap: 8 },
  pill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  pillDot: { width: 7, height: 7, borderRadius: 4 },
  pillText: { fontSize: 13, fontWeight: '800' },
  insight: { fontSize: 15, fontWeight: '600', color: C.text, lineHeight: 20 },
  sessionsNote: { fontSize: 12, color: C.muted },

  metrics: {
    marginTop: 20,
    padding: 14,
    borderRadius: 20,
    backgroundColor: '#FBF9F6',
    gap: 14,
  },
  metric: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  metricIcon: { width: 34, height: 34, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  metricBody: { flex: 1 },
  metricHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  metricLabel: { fontSize: 13, color: C.muted, fontWeight: '600' },
  metricValue: { fontSize: 13, fontWeight: '800', color: C.text },
  track: { height: 8, borderRadius: 4, backgroundColor: C.track, overflow: 'hidden' },
  fill: { height: 8, borderRadius: 4 },

  emptyWrap: { alignItems: 'center', paddingTop: 20, paddingBottom: 6 },
  emptyDash: { fontSize: 30, fontWeight: '800', color: '#D8D0C6' },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: C.text, marginTop: 14 },
  chipRow: { flexDirection: 'row', gap: 8, marginTop: 16, flexWrap: 'wrap', justifyContent: 'center' },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 11, paddingVertical: 6, borderRadius: 999 },
  chipText: { fontSize: 12, fontWeight: '700' },

  centerBlock: { alignItems: 'center', paddingVertical: 34, gap: 10 },
  message: { fontSize: 14, color: '#6B6B6B', textAlign: 'center', lineHeight: 20, marginTop: 4, paddingHorizontal: 8 },
  softButton: { backgroundColor: C.accentTint, borderRadius: 999, paddingHorizontal: 16, paddingVertical: 8 },
  softButtonText: { color: C.accent, fontWeight: '700', fontSize: 13 },

  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: C.divider,
    paddingTop: 14,
    marginTop: 18,
  },
  footerText: { fontSize: 12, color: C.muted },
  dashButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: C.accentTint,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  dashText: { fontSize: 14, fontWeight: '800', color: C.accent },
  disclaimer: { fontSize: 11, color: '#A8A29A', marginTop: 10 },
});