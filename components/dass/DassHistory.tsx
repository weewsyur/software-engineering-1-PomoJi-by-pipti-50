import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { auth } from '@/firebase.config';
import {
  fetchDassRange,
  storedSeverities,
  type StoredDassResult,
} from '@/services/dassService';
import {
  SEVERITY_LABELS,
  SUBSCALE_LABELS,
  type DassSeverity,
  type DassSubscale,
} from '@/constants/dass21';
import { AreaChart } from '@/app/components/AreaChart';
import { getLocalDateString } from '@/utils/localDate';

const HISTORY_DAYS = 90;
const MAX_SCORE = 42;

const SUBSCALES: { key: DassSubscale; scoreKey: 'depression_score' | 'anxiety_score' | 'stress_score' }[] = [
  { key: 'depression', scoreKey: 'depression_score' },
  { key: 'anxiety', scoreKey: 'anxiety_score' },
  { key: 'stress', scoreKey: 'stress_score' },
];

const SEVERITY_COLORS: Record<DassSeverity, string> = {
  normal: '#2E9E5B',
  mild: '#7CB518',
  moderate: '#C98A12',
  severe: '#D96C2C',
  extremely_severe: '#C94C3C',
};

function formatDate(dateStr: string): string {
  const d = new Date(`${dateStr}T12:00:00`);
  return Number.isNaN(d.getTime())
    ? dateStr
    : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function TrendChart({ results, scoreKey, width }: {
  results: StoredDassResult[];
  scoreKey: 'depression_score' | 'anxiety_score' | 'stress_score';
  width: number;
}) {
  const data = useMemo(
    // fetchDassRange returns newest-first; charts read left-to-right oldest->newest
    () =>
      [...results]
        .sort((a, b) => a.date.localeCompare(b.date))
        .map((r) => ({ totalTime: r[scoreKey], day: formatDate(r.date) })),
    [results, scoreKey],
  );
  if (data.length === 0) return null;
  return <AreaChart data={data} maxValue={MAX_SCORE} width={width} />;
}

/** Private DASS-21 history: past scores + simple trends. Never shown publicly. */
export default function DassHistory() {
  const { width: windowWidth } = useWindowDimensions();
  const chartWidth = windowWidth - 32 - 32; // screen padding + card padding

  const [results, setResults] = useState<StoredDassResult[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - (HISTORY_DAYS - 1));
    fetchDassRange(uid, getLocalDateString(from), getLocalDateString(to))
      .then(setResults)
      .catch(() => setFailed(true));
  }, []);

  if (failed) {
    return (
      <View className="flex-1 items-center justify-center px-8">
        <Text className="text-center text-base text-ink2 dark:text-ink2Dark">
          Couldn’t load your history. Check your connection and try again.
        </Text>
      </View>
    );
  }
  if (results === null) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" />
      </View>
    );
  }
  if (results.length === 0) {
    return (
      <View className="flex-1 items-center justify-center px-8">
        <Text className="text-center text-base text-ink2 dark:text-ink2Dark">
          No readiness checks yet. Take today’s DASS-21 check from the Home tab first.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
      <Text className="text-sm leading-5 text-ink3 dark:text-ink3Dark">
        Your screening scores over the past {HISTORY_DAYS} days. Scores naturally vary from day to
        day — this is a screening tool, not a diagnosis.
      </Text>

      {SUBSCALES.map(({ key, scoreKey }) => (
        <View
          key={key}
          className="mt-4 rounded-2xl border border-line bg-card p-4 dark:border-lineDark dark:bg-cardDark"
        >
          <View className="flex-row items-center justify-between">
            <Text className="text-base font-bold text-ink dark:text-inkDark">{SUBSCALE_LABELS[key]}</Text>
            <Text className="text-xs text-ink3 dark:text-ink3Dark">Score 0–42</Text>
          </View>
          <View className="mt-2">
            <TrendChart results={results} scoreKey={scoreKey} width={chartWidth} />
          </View>
        </View>
      ))}

      <Text className="mt-5 text-base font-bold text-ink dark:text-inkDark">Past results</Text>
      {results.map((r) => {
        const sev = storedSeverities(r);
        return (
          <View
            key={r.date}
            className="mt-2 rounded-xl border border-line bg-card p-3 dark:border-lineDark dark:bg-cardDark"
          >
            <Text className="text-sm font-semibold text-ink dark:text-inkDark">{formatDate(r.date)}</Text>
            <View className="mt-2 flex-row flex-wrap gap-x-4 gap-y-1">
              {SUBSCALES.map(({ key, scoreKey }) => (
                <Text key={key} className="text-sm" style={{ color: SEVERITY_COLORS[sev[key]] }}>
                  {SUBSCALE_LABELS[key]}: {SEVERITY_LABELS[sev[key]]} ({r[scoreKey]})
                </Text>
              ))}
            </View>
          </View>
        );
      })}
      <View style={{ height: 8 }} />
    </ScrollView>
  );
}
