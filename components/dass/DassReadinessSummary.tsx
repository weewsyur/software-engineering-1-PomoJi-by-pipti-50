import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { auth } from '@/firebase.config';
import { fetchDassRange, type StoredDassResult } from '@/services/dassService';
import { formatShortDate, getLocalDateString } from '@/utils/localDate';
import { ROUTES } from '@/constants/sessionFlow';
import {
  SEVERITY_LABELS,
  SUBSCALE_LABELS,
} from '@/constants/dass21';
import { useTheme } from '@/contexts/ThemeContext';
import {
  SUBSCALE_ORDER,
  scoreOf,
  severityOf,
} from './DassHistoryCards';
import { severityTextColor } from './severityPalette';

const HISTORY_DAYS = 90;
const MAX_SCORE = 42;

type LoadState = 'loading' | 'error' | 'empty' | 'ready';

/**
 * Compact latest-check-in summary for the Analytics tab.
 * Shows the most recent DASS-21 result (last 90 days) and links to the
 * full readiness history screen. Fetches independently of that screen.
 */
export default function DassReadinessSummary() {
  const router = useRouter();
  const { isDarkMode } = useTheme();
  const [latest, setLatest] = useState<StoredDassResult | null>(null);
  const [state, setState] = useState<LoadState>('loading');

  useEffect(() => {
    let cancelled = false;
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user) {
        if (!cancelled) setState('empty');
        return;
      }
      const to = new Date();
      const from = new Date();
      from.setDate(from.getDate() - (HISTORY_DAYS - 1));
      fetchDassRange(user.uid, getLocalDateString(from), getLocalDateString(to))
        .then((rows) => {
          if (cancelled) return;
          // fetchDassRange returns newest-first.
          if (rows.length === 0) {
            setLatest(null);
            setState('empty');
          } else {
            setLatest(rows[0]);
            setState('ready');
          }
        })
        .catch(() => {
          if (!cancelled) setState('error');
        });
    });
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  return (
    <View className="rounded-2xl border border-line bg-card p-4 dark:border-lineDark dark:bg-cardDark">
      <View className="flex-row items-baseline justify-between">
        <Text className="text-base font-bold text-ink dark:text-inkDark">
          Readiness check
        </Text>
        {state === 'ready' && latest && (
          <Text className="text-[13px] text-ink2 dark:text-ink2Dark">
            {formatShortDate(latest.date)}
          </Text>
        )}
      </View>

      {state === 'loading' ? (
        <View className="mt-3 items-center py-2">
          <ActivityIndicator size="small" />
        </View>
      ) : state === 'error' ? (
        <Text className="mt-2 font-sans text-[13px] text-ink2 dark:text-ink2Dark">
          Couldn’t load your readiness check.
        </Text>
      ) : state === 'empty' || !latest ? (
        <>
          <Text className="mt-2 font-sans text-[13px] leading-5 text-ink2 dark:text-ink2Dark">
            No readiness checks yet. Take the short DASS-21 check to unlock sessions.
          </Text>
          <Pressable
            onPress={() => router.push(ROUTES.DASS)}
            accessibilityRole="button"
            className="mt-2 min-h-[44px] items-center justify-center self-start rounded-xl bg-primary px-4"
          >
            <Text className="text-sm font-semibold text-white">Take check</Text>
          </Pressable>
        </>
      ) : (
        <>
          <View className="mt-2 gap-1.5">
            {SUBSCALE_ORDER.map(({ key, scoreKey }) => {
              const severity = severityOf(latest, key);
              return (
                <View key={key} className="flex-row items-baseline justify-between">
                  <Text className="text-sm text-ink dark:text-inkDark">
                    {SUBSCALE_LABELS[key]}
                  </Text>
                  <Text
                    className="text-sm font-semibold"
                    style={{ color: severityTextColor(severity, isDarkMode) }}
                  >
                    {scoreOf(latest, scoreKey)}/{MAX_SCORE} · {SEVERITY_LABELS[severity]}
                  </Text>
                </View>
              );
            })}
          </View>
          <Pressable
            onPress={() => router.push(ROUTES.DASS_HISTORY)}
            accessibilityRole="button"
            accessibilityLabel="View readiness history"
            className="mt-1 min-h-[44px] items-center justify-center self-start"
          >
            <Text className="text-sm font-semibold text-primary">View history</Text>
          </Pressable>
        </>
      )}
    </View>
  );
}
