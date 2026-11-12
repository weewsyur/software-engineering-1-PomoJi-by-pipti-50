import { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot, query, Timestamp, where, type Firestore } from 'firebase/firestore';
import {
  DEFAULT_FIELD_MAP,
  type SessionFieldMap,
  type WellnessConfig,
  type WellnessScoreState,
} from '../types/wellness';
import { calculateWellnessScore, getPeriodStart, mergeConfig, normalizeSession } from '../utils/wellnessScore';

export interface UseWellnessScoreOptions {
  firestore: Firestore;
  /** Pass auth.currentUser?.uid. Null/undefined yields the "unauthenticated" state. */
  userId: string | null | undefined;
  config?: Partial<WellnessConfig>;
  fieldMap?: SessionFieldMap;
}

/**
 * Live wellness score. Subscribes to users/{userId}/sessions restricted to the
 * rolling window (single-field range query, no composite index needed), so the
 * score recomputes whenever sessions complete or mood fields change.
 */
export function useWellnessScore({
  firestore,
  userId,
  config,
  fieldMap = DEFAULT_FIELD_MAP,
}: UseWellnessScoreOptions): WellnessScoreState {
  const configKey = JSON.stringify(config ?? {});
  const fieldKey = JSON.stringify(fieldMap);
  // Stable identities so inline object literals don't cause re-subscribing.
  const cfg = useMemo(() => mergeConfig(config), [configKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const map = useMemo(() => fieldMap, [fieldKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const [state, setState] = useState<WellnessScoreState>(
    userId
      ? { status: 'loading', result: null, error: null }
      : { status: 'unauthenticated', result: null, error: null },
  );

  useEffect(() => {
    if (!userId) {
      setState({ status: 'unauthenticated', result: null, error: null });
      return undefined;
    }
    setState({ status: 'loading', result: null, error: null });

    const windowStart = getPeriodStart(new Date(), cfg.periodDays);
    const q = query(
      collection(firestore, 'users', userId, 'sessions'),
      where(map.completedAtField, '>=', Timestamp.fromDate(windowStart)),
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        try {
          const sessions = snapshot.docs.map((d) => normalizeSession(d.id, d.data() as Record<string, unknown>, map));
          const result = calculateWellnessScore(sessions, cfg, new Date());
          setState({ status: result.hasData ? 'ready' : 'empty', result, error: null } as WellnessScoreState);
        } catch (err) {
          setState({ status: 'error', result: null, error: err instanceof Error ? err : new Error(String(err)) });
        }
      },
      (err) => setState({ status: 'error', result: null, error: err }),
    );
    return unsubscribe;
  }, [firestore, userId, cfg, map]);

  return state;
}
