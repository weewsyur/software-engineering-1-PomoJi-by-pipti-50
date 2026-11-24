import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { auth } from '@/firebase.config';
import {
  fetchDassRange,
  type StoredDassResult,
} from '@/services/dassService';
import { getLocalDateString } from '@/utils/localDate';
import {
  PastResultCard,
  SUBSCALE_ORDER,
  SubscaleCard,
  SummaryCard,
} from './DassHistoryCards';

const HISTORY_DAYS = 90;

/** Private DASS-21 history: latest summary, per-scale trends, past results. Never shown publicly. */
export default function DassHistory() {
  const { width: windowWidth } = useWindowDimensions();
  const chartWidth = windowWidth - 64; // 16px screen padding + 16px card padding each side

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

  // fetchDassRange returns newest-first; keep that order for display.
  const sortedDesc = useMemo(
    () => [...(results ?? [])].sort((a, b) => b.date.localeCompare(a.date)),
    [results],
  );

  if (failed) {
    return (
      <View className="flex-1 items-center justify-center px-8">
        <Text className="font-sans text-center text-base text-ink2 dark:text-ink2Dark">
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
        <Text className="font-sans text-center text-base text-ink2 dark:text-ink2Dark">
          No readiness checks yet. Take today’s DASS-21 check from the Home tab first.
        </Text>
      </View>
    );
  }

  const newest = sortedDesc[0];

  return (
    <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
      <Text className="font-sans text-sm leading-5 text-ink2 dark:text-ink2Dark">
        Your screening scores over the past {HISTORY_DAYS} days. Scores naturally vary from day to
        day. This is a screening tool, not a diagnosis.
      </Text>

      <SummaryCard newest={newest} />

      {SUBSCALE_ORDER.map(({ key, scoreKey }) => (
        <SubscaleCard
          key={key}
          subscale={key}
          scoreKey={scoreKey}
          results={results}
          width={chartWidth}
        />
      ))}

      <Text className="mt-6 text-base font-bold text-ink dark:text-inkDark">Past results</Text>
      {sortedDesc.map((r) => (
        <PastResultCard key={r.date} result={r} />
      ))}
      <View style={{ height: 8 }} />
    </ScrollView>
  );
}
