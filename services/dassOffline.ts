import AsyncStorage from '@react-native-async-storage/async-storage';
import { scoreDass21 } from '@/utils/dass21Score';
import {
  DassAlreadyTakenError,
  QUESTIONNAIRE_VERSION,
  hasDassConsent,
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
  try {
    const raw = await AsyncStorage.getItem(storeKey(uid));
    if (!raw) return emptyStore();
    const parsed = JSON.parse(raw) as Partial<LocalDassStore>;
    return {
      consent: parsed.consent === true,
      consentPending: parsed.consentPending === true,
      assessments: parsed.assessments ?? {},
      pendingSync: Array.isArray(parsed.pendingSync) ? parsed.pendingSync : [],
    };
  } catch {
    return emptyStore();
  }
}

async function saveStore(uid: string, store: LocalDassStore): Promise<void> {
  try {
    await AsyncStorage.setItem(storeKey(uid), JSON.stringify(store));
  } catch {
    // storage full / unavailable — non-fatal, sync just won't persist
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
export async function markLocalConsent(uid: string): Promise<void> {
  const store = await loadStore(uid);
  store.consent = true;
  store.consentPending = true;
  await saveStore(uid, store);
}

/** Build a StoredDassResult-shaped object locally (no server timestamp). */
export function buildLocalResult(uid: string, date: string, answers: readonly number[]): StoredDassResult {
  const { scores, severities } = scoreDass21(answers);
  return {
    user_id: uid,
    date,
    depression_score: scores.depression,
    anxiety_score: scores.anxiety,
    stress_score: scores.stress,
    depression_severity: severities.depression,
    anxiety_severity: severities.anxiety,
    stress_severity: severities.stress,
    responses: [...answers],
    questionnaire_version: QUESTIONNAIRE_VERSION,
    consent_given: true,
  };
}

/** Save a completed assessment locally and mark it pending server sync. */
export async function saveLocalAssessment(uid: string, result: StoredDassResult): Promise<void> {
  const store = await loadStore(uid);
  store.assessments[result.date] = result;
  if (!store.pendingSync.includes(result.date)) store.pendingSync.push(result.date);
  await saveStore(uid, store);
}

/**
 * Flush pending assessments (and pending consent) to Firestore.
 * submitDassResult's transaction makes retries idempotent: an existing doc
 * throws DassAlreadyTakenError, which we treat as "already synced".
 * Never throws — returns how many were confirmed by the server.
 */
export async function syncPendingDass(uid: string): Promise<number> {
  const store = await loadStore(uid);
  if (store.pendingSync.length === 0 && !store.consentPending) return 0;

  let synced = 0;
  const remaining: string[] = [];

  for (const date of store.pendingSync) {
    const local = store.assessments[date];
    if (!local?.responses?.length) continue; // nothing to send
    try {
      // Write under the ORIGINAL completion date — rules require docId == date.
      await submitDassResult(uid, local.responses, local.date);
      synced++;
    } catch (e) {
      if (e instanceof DassAlreadyTakenError) {
        synced++; // server already has it — safe to drop the pending marker
      } else if ((e as { code?: string })?.code === 'permission-denied') {
        // Terminal: rules reject dates >1 day old (dateNearNow). Keep the local
        // record but stop retrying a write the server will never accept.
      } else {
        remaining.push(date); // still offline / transient failure — keep pending
      }
    }
  }

  // Consent flag: flush once the server accepts writes again.
  if (store.consentPending) {
    try {
      if (!(await hasDassConsent(uid))) await saveDassConsent(uid);
      store.consentPending = false;
    } catch {
      // still offline — keep the flag for next time
    }
  }

  store.pendingSync = remaining;
  await saveStore(uid, store);
  return synced;
}
