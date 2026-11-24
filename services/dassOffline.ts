import AsyncStorage from '@react-native-async-storage/async-storage';
import { scoreDass21 } from '@/utils/dass21Score';
import {
  DassAlreadyTakenError,
  QUESTIONNAIRE_VERSION,
  saveDassConsent,
  submitDassResult,
  type StoredDassResult,
} from '@/services/dassService';

/**
 * Local (on-device) DASS-21 store + pending-sync queue.
 *
 * The questionnaire itself is fully local (bundled items + pure scoring). When a
 * result can't reach Firestore it is kept here per user, per local date, and
 * flushed by syncPendingDass() the next time the app runs online. Records are
 * keyed by uid so account switching never leaks data.
 */

interface LocalDassStore {
  /** Local consent flag — mirrors users/{uid}.dassConsent until it can sync. */
  consent: boolean;
  /** true while the server-side dassConsent flag still needs to be written */
  consentPending: boolean;
  /** date (YYYY-MM-DD) -> result completed on this device */
  assessments: Record<string, StoredDassResult>;
  /** dates whose server save is still pending */
  pendingSync: string[];
}

const emptyStore = (): LocalDassStore => ({
  consent: false,
  consentPending: false,
  assessments: {},
  pendingSync: [],
});
const storeKey = (uid: string) => `@pomoji_dass_v1_${uid}`;

async function loadStore(uid: string): Promise<LocalDassStore> {
  const raw = await AsyncStorage.getItem(storeKey(uid));
  if (!raw) return emptyStore();
  try {
    const parsed = JSON.parse(raw) as Partial<LocalDassStore>;
    return {
      consent: parsed.consent === true,
      consentPending: parsed.consentPending === true,
      assessments: parsed.assessments ?? {},
      pendingSync: Array.isArray(parsed.pendingSync) ? parsed.pendingSync : [],
    };
  } catch (error) {
    console.error('[dass] failed to read local assessment data:', error);
    throw new Error('Unable to read locally stored assessment data.');
  }
}

async function saveStore(uid: string, store: LocalDassStore): Promise<void> {
  try {
    await AsyncStorage.setItem(storeKey(uid), JSON.stringify(store));
  } catch (error) {
    console.error('[dass] failed to save local assessment data:', error);
    throw new Error('Unable to save assessment data on this device.');
  }
}

export async function getLocalAssessment(uid: string, date: string): Promise<StoredDassResult | null> {
  const store = await loadStore(uid);
  return store.assessments[date] ?? null;
}

export async function hasLocalConsent(uid: string): Promise<boolean> {
  return (await loadStore(uid)).consent;
}

/** Record consent locally; server flag is flushed by syncPendingDass(). */
export async function markLocalConsent(
  uid: string,
  consented = true,
  pending = true,
): Promise<void> {
  const store = await loadStore(uid);
  store.consent = consented;
  store.consentPending = pending;
  await saveStore(uid, store);
}

/** Build a StoredDassResult-shaped object locally (no server timestamp). */
export function buildLocalResult(
  uid: string,
  date: string,
  answers: readonly number[],
  completedAt: string = new Date().toISOString(),
): StoredDassResult {
  const { rawScores, scores, severities } = scoreDass21(answers);
  return {
    user_id: uid,
    date,
    depression_raw_score: rawScores.depression,
    anxiety_raw_score: rawScores.anxiety,
    stress_raw_score: rawScores.stress,
    depression_score: scores.depression,
    anxiety_score: scores.anxiety,
    stress_score: scores.stress,
    depression_severity: severities.depression,
    anxiety_severity: severities.anxiety,
    stress_severity: severities.stress,
    responses: [...answers],
    questionnaire_version: QUESTIONNAIRE_VERSION,
    consent_given: true,
    completedAt,
  };
}

/** Save a completed assessment locally and mark it pending server sync. */
export async function saveLocalAssessment(uid: string, result: StoredDassResult): Promise<void> {
  const store = await loadStore(uid);
  store.assessments[result.date] = result;
  if (!store.pendingSync.includes(result.date)) store.pendingSync.push(result.date);
  await saveStore(uid, store);
}

export async function getLocalAssessments(uid: string): Promise<StoredDassResult[]> {
  const store = await loadStore(uid);
  return Object.values(store.assessments).sort((a, b) => a.date.localeCompare(b.date));
}

export async function clearLocalAssessments(uid: string): Promise<void> {
  const store = await loadStore(uid);
  store.assessments = {};
  store.pendingSync = [];
  await saveStore(uid, store);
}

/**
 * Flush pending assessments (and pending consent) to Firestore.
 * submitDassResult's transaction makes retries idempotent: an existing doc
 * throws DassAlreadyTakenError, which we treat as "already synced".
 * Returns how many were confirmed by the server. Local storage errors are
 * surfaced so callers do not report a successful sync when state was lost.
 */
export async function syncPendingDass(uid: string): Promise<number> {
  const store = await loadStore(uid);
  if (store.pendingSync.length === 0 && !store.consentPending) return 0;

  let synced = 0;
  const remaining: string[] = [];

  for (const date of store.pendingSync) {
    const local = store.assessments[date];
    if (!local?.responses?.length) {
      console.error('[dass] pending assessment has no responses:', date);
      remaining.push(date);
      continue;
    }
    try {
      // Write under the ORIGINAL completion date — rules require docId == date.
      const completedAt =
        typeof local.completedAt === 'string' ? local.completedAt : new Date().toISOString();
      await submitDassResult(uid, local.responses, local.date, completedAt);
      synced++;
    } catch (e) {
      if (e instanceof DassAlreadyTakenError) {
        synced++; // server already has it — safe to drop the pending marker
      } else if ((e as { code?: string })?.code === 'permission-denied') {
        console.error('[dass] pending assessment was rejected by Firestore rules:', date, e);
      } else {
        console.warn('[dass] pending assessment sync will be retried:', date, e);
        remaining.push(date); // still offline / transient failure — keep pending
      }
    }
  }

  // Consent flag: flush once the server accepts writes again.
  if (store.consentPending) {
    try {
      await saveDassConsent(uid, store.consent);
      store.consentPending = false;
    } catch (error) {
      console.warn('[dass] pending consent update will be retried:', error);
    }
  }

  store.pendingSync = remaining;
  await saveStore(uid, store);
  return synced;
}
