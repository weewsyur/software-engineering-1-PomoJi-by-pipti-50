import { useCallback, useEffect, useState } from 'react';
import {
  DEFAULT_COUNSELING_COOLDOWN_MS,
  DEFAULT_COUNSELING_THRESHOLD,
  memoryDismissalStore,
  shouldShowCounselingTrigger,
  type DismissalStore,
} from '../utils/counselingTrigger';

export interface UseCounselingTriggerOptions {
  score: number | null | undefined;
  threshold?: number;
  cooldownMs?: number;
  store?: DismissalStore;
}

export function useCounselingTrigger({
  score,
  threshold = DEFAULT_COUNSELING_THRESHOLD,
  cooldownMs = DEFAULT_COUNSELING_COOLDOWN_MS,
  store = memoryDismissalStore,
}: UseCounselingTriggerOptions) {
  const [loaded, setLoaded] = useState(false);
  const [dismissedAt, setDismissedAt] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoaded(false);
    store
      .getDismissedAt()
      .then((v) => {
        if (!cancelled) setDismissedAt(v);
      })
      .catch(() => {
        /* storage failure: behave as "never dismissed" */
      })
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [store]);

  /** Starts the cooldown. Never throws. */
  const dismiss = useCallback(async () => {
    const ts = Date.now();
    setDismissedAt(ts); // hide immediately, even if persisting fails
    try {
      await store.setDismissedAt(ts);
    } catch {
      /* ignore */
    }
  }, [store]);

  // Wait for the stored value before showing, so a recent dismissal never flashes the card.
  const visible = loaded && shouldShowCounselingTrigger({ score, threshold, dismissedAt, cooldownMs });
  return { visible, dismiss };
}
