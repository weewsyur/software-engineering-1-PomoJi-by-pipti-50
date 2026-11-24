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

/**
 * Call `start()` from the Focus screen's "Start session" button.
 * Checks today's DASS-21 status, then routes:
 *   no result today  -> /dass (intro -> consent -> test -> review -> result)
 *   passed           -> /before-session
 *   blocked          -> /dass (shows result + recommendations, no retake)
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

  const start = useCallback(async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    setOffline(false);
    setOfflineError(null);
    setChecking(true);
    await syncPendingDass(uid).catch(() => {}); // flush pending saves, best effort
    const res = await fetchTodayDass(uid);

    const { setDass, resetBeforeCheck } = useSessionFlowStore.getState();
    resetBeforeCheck(); // every session needs a fresh "before" check

    if (res.state === 'unavailable') {
      // Offline: a locally completed check for today still gates correctly.
      const local = await getLocalAssessment(uid, getLocalDateString());
      if (local) {
        const blocked = isBlocked(storedSeverities(local));
        setDass(blocked ? 'blocked' : 'passed', local);
        setChecking(false);
        router.push(blocked ? ROUTES.DASS : ROUTES.BEFORE_SESSION);
        return;
      }
      setChecking(false);
      setDass('unknown', null);
      setOfflineError(__DEV__ && res.error ? `code: ${resolveDassError(res.error).code ?? 'unknown'}` : null);
      setOffline(true);
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
    router.push(blocked ? ROUTES.DASS : ROUTES.BEFORE_SESSION);
  }, [router]);

  return { start, checking, offline, offlineError, dismissOffline: () => setOffline(false) };
}
