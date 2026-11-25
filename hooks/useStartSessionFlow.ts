import { useCallback, useState } from 'react';
import { useRouter } from 'expo-router';
// ADAPT: import `auth` from your firebase.config.ts
import { auth } from '@/firebase.config';
import { ROUTES } from '@/constants/sessionFlow';
import { fetchTodayDass, storedSeverities } from '@/services/dassService';
import { resolveDassError } from '@/hooks/useDassErrorMessage';
import { getLocalAssessment, syncPendingDass } from '@/services/dassOffline';
import { getLocalDateString } from '@/utils/localDate';
import { useSessionFlowStore } from '@/store/sessionFlowStore';
import { isBlocked } from '@/utils/dass21Score';
import { fetchRestGate } from '@/services/restService';

/**
 * Call `start()` from the Focus screen's "Start session" button.
 * Checks today's DASS-21 status, then routes:
 *   no result today  -> /dass (intro -> consent -> test -> review -> result)
 *   passed           -> /(tabs)/timer with autostart
 *   blocked          -> /rest (choose a rest period, then re-check)
 *   offline, no local result -> `offline` = true -> "connect to continue" modal
 *
 * Offline: pending local results are synced first; a locally completed check
 * for today still counts (it syncs to Firestore on the next online run).
 */
export function useStartSessionFlow() {
  const router = useRouter();
  const [checking, setChecking] = useState(false);
  const [offline, setOffline] = useState(false);
  const [offlineError, setOfflineError] = useState<string | null>(null);

  const openTimer = useCallback(() => {
    router.push({
      pathname: ROUTES.TIMER,
      params: { autostart: String(Date.now()) },
    } as never);
  }, [router]);

  const start = useCallback(async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    setOffline(false);
    setOfflineError(null);
    setChecking(true);
    await syncPendingDass(uid).catch(() => {}); // flush pending saves, best effort
    const res = await fetchTodayDass(uid);

    const { setDass, resetBeforeCheck } = useSessionFlowStore.getState();
    resetBeforeCheck(); // clear any stale pre-session fields

    if (res.state === 'unavailable') {
      // Offline: a locally completed check for today still gates correctly.
      const local = await getLocalAssessment(uid, getLocalDateString());
      if (local) {
        const blocked = isBlocked(storedSeverities(local));
        setDass(blocked ? 'blocked' : 'passed', local);
        setChecking(false);
        // A blocked result needs the backend rest period/check-in flow.
        if (blocked) {
          router.push(ROUTES.REST);
        } else {
          openTimer();
        }
        return;
      }
      setChecking(false);
      setDass('unknown', null);
      setOfflineError(__DEV__ && res.error ? `code: ${resolveDassError(res.error).code ?? 'unknown'}` : null);
      setOffline(true);
      return;
    }

    const restGate = await fetchRestGate(uid);
    if (restGate.state === 'unavailable') {
      setChecking(false);
      setDass('unknown', null);
      setOfflineError(__DEV__ && restGate.error ? `code: ${resolveDassError(restGate.error).code ?? 'unknown'}` : null);
      setOffline(true);
      return;
    }

    const dailyResult = res.state === 'exists' ? res.result : null;
    if (restGate.state === 'passed') {
      setChecking(false);
      setDass('passed', restGate.checkin);
      openTimer();
      return;
    }
    if (restGate.state !== 'none') {
      setChecking(false);
      setDass('blocked', dailyResult);
      router.push(ROUTES.REST);
      return;
    }

    setChecking(false);
    if (res.state === 'none') {
      setDass('unknown', null);
      router.push(ROUTES.DASS);
      return;
    }
    const blocked = isBlocked(storedSeverities(res.result));
    setDass(blocked ? 'blocked' : 'passed', res.result);
    if (blocked) {
      router.push(ROUTES.REST);
    } else {
      openTimer();
    }
  }, [openTimer, router]);

  return { start, checking, offline, offlineError, dismissOffline: () => setOffline(false) };
}
