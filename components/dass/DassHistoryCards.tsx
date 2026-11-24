import React from 'react';
import { Text, View } from 'react-native';
import {
  SEVERITY_LABELS,
  SEVERITY_ORDER,
  SUBSCALE_LABELS,
  type DassSeverity,
  type DassSubscale,
} from '@/constants/dass21';
import type { StoredDassResult } from '@/services/dassService';
import { formatShortDate } from '@/utils/localDate';
import { useTheme } from '@/contexts/ThemeContext';
import { SeverityTrendChart, type TrendPoint } from './SeverityTrendChart';
import { SEVERITY_COLORS, severityTextColor } from './severityPalette';

export type DassScoreKey = 'depression_score' | 'anxiety_score' | 'stress_score';

export const SUBSCALE_ORDER: { key: DassSubscale; scoreKey: DassScoreKey }[] = [
  { key: 'depression', scoreKey: 'depression_score' },
  { key: 'anxiety', scoreKey: 'anxiety_score' },
  { key: 'stress', scoreKey: 'stress_score' },
];

export function severityOf(r: StoredDassResult, sub: DassSubscale): DassSeverity {
  return sub === 'depression'
    ? r.depression_severity
    : sub === 'anxiety'
      ? r.anxiety_severity
      : r.stress_severity;
}

export function scoreOf(r: StoredDassResult, scoreKey: DassScoreKey): number {
  return r[scoreKey];
}

/** Pill showing a severity name — always text, never color alone. */
export function SeverityChip({ severity }: { severity: DassSeverity }) {
  const { isDarkMode } = useTheme();
  const color = severityTextColor(severity, isDarkMode);
  return (
    <View
      className="self-start rounded-full px-2.5 py-[3px]"
      style={{ borderWidth: 1.5, borderColor: color }}
    >
      <Text className="text-[12px] font-semibold" style={{ color }}>
        {SEVERITY_LABELS[severity]}
      </Text>
    </View>
  );
}

/** "Latest check-in" overview: one row per subscale + severity legend. */
export function SummaryCard({ newest }: { newest: StoredDassResult }) {
  const { isDarkMode } = useTheme();
  return (
    <View className="mt-4 rounded-2xl border border-line bg-card p-4 dark:border-lineDark dark:bg-cardDark">
      <Text className="text-xs font-semibold uppercase tracking-wide text-ink2 dark:text-ink2Dark">
        Latest check-in · {formatShortDate(newest.date)}
      </Text>

      <View className="mt-3 gap-2">
        {SUBSCALE_ORDER.map(({ key, scoreKey }) => {
          const severity = severityOf(newest, key);
          return (
            <View key={key} className="flex-row items-baseline justify-between">
              <Text className="text-sm text-ink dark:text-inkDark">{SUBSCALE_LABELS[key]}</Text>
              <Text
                className="text-sm font-semibold"
                style={{ color: severityTextColor(severity, isDarkMode) }}
              >
                {SEVERITY_LABELS[severity]} · {scoreOf(newest, scoreKey)}
              </Text>
            </View>
          );
        })}
      </View>

      <View className="mt-3 flex-row flex-wrap gap-x-3 gap-y-1.5">
        {SEVERITY_ORDER.map((level) => (
          <View key={level} className="flex-row items-center gap-1.5">
            <View
              className="h-2.5 w-2.5 rounded-[3px]"
              style={{ backgroundColor: SEVERITY_COLORS[level] }}
            />
            <Text className="text-[11px] text-ink2 dark:text-ink2Dark">
              {SEVERITY_LABELS[level]}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const MAX_SCORE = 42;

/** One subscale: latest score headline + severity-band trend chart. */
export function SubscaleCard({
  subscale,
  scoreKey,
  results,
  width,
}: {
  subscale: DassSubscale;
  scoreKey: DassScoreKey;
  /** Any order; sorted internally oldest -> newest. */
  results: StoredDassResult[];
  width: number;
}) {
  const { isDarkMode } = useTheme();

  const points = React.useMemo<TrendPoint[]>(
    () =>
      [...results]
        .sort((a, b) => a.date.localeCompare(b.date))
        .map((r) => ({
          score: scoreOf(r, scoreKey),
          date: r.date,
          severity: severityOf(r, subscale),
        })),
    [results, scoreKey, subscale],
  );

  const latest = points[points.length - 1];
  if (!latest) return null;
  const latestText = severityTextColor(latest.severity, isDarkMode);

  return (
    <View className="mt-4 rounded-2xl border border-line bg-card p-4 dark:border-lineDark dark:bg-cardDark">
      <View className="flex-row items-center justify-between">
        <Text className="text-base font-bold text-ink dark:text-inkDark">
          {SUBSCALE_LABELS[subscale]}
        </Text>
        <SeverityChip severity={latest.severity} />
      </View>

      <View className="mt-1 flex-row items-baseline">
        <Text
          className="font-display text-[34px] font-bold leading-[38px]"
          style={{ color: latestText }}
        >
          {latest.score}
        </Text>
        <Text className="ml-1.5 text-[13px] text-ink2 dark:text-ink2Dark">
          / {MAX_SCORE} · {formatShortDate(latest.date)}
        </Text>
      </View>

      <View className="mt-3">
        <SeverityTrendChart
          subscale={subscale}
          points={points}
          width={width}
          maxScore={MAX_SCORE}
        />
        {points.length === 1 && (
          <Text className="mt-1 text-center text-xs text-ink2 dark:text-ink2Dark">
            Your trend line appears after your second check-in.
          </Text>
        )}
      </View>
    </View>
  );
}

/** Compact past-result row: date title + one line per subscale. */
export function PastResultCard({ result }: { result: StoredDassResult }) {
  const { isDarkMode } = useTheme();
  return (
    <View className="mt-2 rounded-xl border border-line bg-card p-3 dark:border-lineDark dark:bg-cardDark">
      <Text className="text-sm font-semibold text-ink dark:text-inkDark">
        {formatShortDate(result.date)}
      </Text>
      <View className="mt-1.5 gap-1">
        {SUBSCALE_ORDER.map(({ key, scoreKey }) => {
          const severity = severityOf(result, key);
          return (
            <View key={key} className="flex-row items-baseline justify-between">
              <Text className="text-[13px] text-ink2 dark:text-ink2Dark">
                {SUBSCALE_LABELS[key]}
              </Text>
              <Text
                className="text-[13px] font-semibold"
                style={{ color: severityTextColor(severity, isDarkMode) }}
              >
                {scoreOf(result, scoreKey)} · {SEVERITY_LABELS[severity]}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}
