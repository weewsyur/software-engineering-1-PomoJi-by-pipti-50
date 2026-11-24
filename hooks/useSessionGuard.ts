import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { ROUTES } from '@/constants/sessionFlow';
import { selectDassPassedToday, selectReadyToStart, useSessionFlowStore } from '@/store/sessionFlowStore';

/** Use in /before-session. Redirects to Focus unless today's DASS-21 was passed. */
export function useRequireDassPassed(): boolean {
  const router = useRouter();
  const ok = useSessionFlowStore(selectDassPassedToday);
  useEffect(() => {
    if (!ok) router.replace(ROUTES.FOCUS);
  }, [ok, router]);
  return ok;
}

/**
 * Use at the top of the timer screen that runs a focus session.
 * Returns true only when BOTH checks were passed in this app session.
 * Direct URL / reload on web => empty store => redirect to Focus.
 * Render `null` while it returns false.
 */
export function useRequireSessionChecks(): boolean {
  const router = useRouter();
  const ok = useSessionFlowStore(selectReadyToStart);
  useEffect(() => {
    if (!ok) router.replace(ROUTES.FOCUS);
  }, [ok, router]);
  return ok;
}
