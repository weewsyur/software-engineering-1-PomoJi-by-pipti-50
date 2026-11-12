/**
 * Pure helpers for the counseling smart trigger. No React / Firebase.
 * The score is a productivity/wellness indicator only, never a diagnosis.
 */

export const DEFAULT_COUNSELING_THRESHOLD = 40;
/** After a dismissal, stay quiet for 24 hours. */
export const DEFAULT_COUNSELING_COOLDOWN_MS = 24 * 60 * 60 * 1000;

/** Storage-agnostic persistence for "last dismissed at" (epoch ms). */
export interface DismissalStore {
  getDismissedAt(): Promise<number | null>;
  setDismissedAt(timestampMs: number): Promise<void>;
}

let memoryValue: number | null = null;
/** Default store: survives re-renders/navigation but not app restarts. */
export const memoryDismissalStore: DismissalStore = {
  getDismissedAt: async () => memoryValue,
  setDismissedAt: async (ts) => {
    memoryValue = ts;
  },
};

/** Minimal shape of @react-native-async-storage/async-storage (so we don't import it). */
export interface AsyncStorageLike {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
}

export function createAsyncStorageDismissalStore(
  storage: AsyncStorageLike,
  key = 'pomoji:counselingTriggerDismissedAt',
): DismissalStore {
  return {
    async getDismissedAt() {
      const raw = await storage.getItem(key);
      const n = raw === null ? NaN : Number(raw);
      return Number.isFinite(n) ? n : null;
    },
    async setDismissedAt(ts) {
      await storage.setItem(key, String(ts));
    },
  };
}

export interface ShouldShowParams {
  score: number | null | undefined;
  threshold?: number;
  dismissedAt?: number | null;
  now?: number;
  cooldownMs?: number;
}

/** True only when score is a valid number strictly BELOW the threshold and not in cooldown. */
export function shouldShowCounselingTrigger({
  score,
  threshold = DEFAULT_COUNSELING_THRESHOLD,
  dismissedAt = null,
  now = Date.now(),
  cooldownMs = DEFAULT_COUNSELING_COOLDOWN_MS,
}: ShouldShowParams): boolean {
  if (typeof score !== 'number' || !Number.isFinite(score)) return false;
  const limit = Number.isFinite(threshold) ? threshold : DEFAULT_COUNSELING_THRESHOLD;
  if (!(score < limit)) return false;
  if (typeof dismissedAt === 'number' && Number.isFinite(dismissedAt) && now - dismissedAt < cooldownMs) {
    return false;
  }
  return true;
}
