import {
  doc,
  getDoc,
  getDocFromServer,
  getDocsFromServer,
  orderBy,
  query,
  collection,
  where,
  runTransaction,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
// ADAPT: import path/exports to match your firebase.config.ts
import { db } from '@/firebase.config';
import type { DassSeverity, DassSubscale } from '@/constants/dass21';
import { scoreDass21 } from '@/utils/dass21Score';
import { getLocalDateString } from '@/utils/localDate';

export const DASS_SUBCOLLECTION = 'dass21_assessments';
export const QUESTIONNAIRE_VERSION = 'dass21-v1';

/** users/{uid}/dass21_assessments/{YYYY-MM-DD}: the date IS the document id (one per day). */
const dassRef = (uid: string, date: string) => doc(db, 'users', uid, DASS_SUBCOLLECTION, date);

export interface StoredDassResult {
  user_id: string;
  date: string; // student's LOCAL date, YYYY-MM-DD
  depression_score: number;
  anxiety_score: number;
  stress_score: number;
  depression_severity: DassSeverity;
  anxiety_severity: DassSeverity;
  stress_severity: DassSeverity;
  responses: number[]; // all 21 answers (0-3), item order
  questionnaire_version: string;
  consent_given: boolean;
  createdAt?: unknown; // Firestore Timestamp (server)
}

export class DassAlreadyTakenError extends Error {
  constructor() {
    super('DASS-21 already recorded for today');
    this.name = 'DassAlreadyTakenError';
  }
}

export function storedSeverities(r: StoredDassResult): Record<DassSubscale, DassSeverity> {
  return {
    depression: r.depression_severity,
    anxiety: r.anxiety_severity,
    stress: r.stress_severity,
  };
}

export type TodayDassLookup =
  | { state: 'none' }
  | { state: 'exists'; result: StoredDassResult }
  | { state: 'unavailable'; error?: unknown }; // offline / server unreachable -> "connect to continue"

let lastDassError: unknown = null;
/** Last error behind an 'unavailable' result — for dev diagnostics only. */
export function getLastDassError(): unknown {
  return lastDassError;
}

/** Short "CODE: message" string for FirebaseError-like objects. */
export function formatDassError(e: unknown): string {
  if (e && typeof e === 'object') {
    const err = e as { code?: unknown; message?: unknown };
    const code = typeof err.code === 'string' ? err.code : '';
    const msg = typeof err.message === 'string' ? err.message : String(e);
    return code ? `${code}: ${msg}` : msg;
  }
  return String(e);
}

/**
 * Reads today's result FROM THE SERVER (never the offline cache), so the gate
 * cannot be bypassed offline. Any failure => 'unavailable'.
 */
export async function fetchTodayDass(uid: string): Promise<TodayDassLookup> {
  try {
    const snap = await getDocFromServer(dassRef(uid, getLocalDateString()));
    return snap.exists() ? { state: 'exists', result: snap.data() as StoredDassResult } : { state: 'none' };
  } catch (e) {
    // 'unavailable' covers both real offline AND server-side denials
    // (e.g. firestore.rules not yet deployed) — log so it's diagnosable.
    lastDassError = e;
    console.warn('[dass] fetchTodayDass failed:', e);
    return { state: 'unavailable', error: e };
  }
}

/**
 * Saves the result. Uses a transaction, which only runs ONLINE and aborts if the
 * document already exists. Firestore rules enforce the same on the server.
 * Throws DassAlreadyTakenError or the underlying Firestore error (offline etc.).
 */
export async function submitDassResult(
  uid: string,
  answers: readonly number[],
  date: string = getLocalDateString(),
): Promise<StoredDassResult> {
  const { scores, severities } = scoreDass21(answers);
  const ref = dassRef(uid, date);
  const payload = {
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
    createdAt: serverTimestamp(),
  };
  await runTransaction(db, async (tx) => {
    const existing = await tx.get(ref);
    if (existing.exists()) throw new DassAlreadyTakenError();
    tx.set(ref, payload);
  });
  const { createdAt: _omit, ...rest } = payload;
  return rest as StoredDassResult;
}

/** Range query for history (single-field index on `date` is automatic). */
export async function fetchDassRange(uid: string, fromDate: string, toDate: string): Promise<StoredDassResult[]> {
  const q = query(
    collection(db, 'users', uid, DASS_SUBCOLLECTION),
    where('date', '>=', fromDate),
    where('date', '<=', toDate),
    orderBy('date', 'desc'),
  );
  const snap = await getDocsFromServer(q);
  return snap.docs.map((d) => d.data() as StoredDassResult);
}

/** Consent flag lives on the user profile: users/{uid}.dassConsent */
export async function hasDassConsent(uid: string): Promise<boolean> {
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    return snap.exists() && snap.data()?.dassConsent === true;
  } catch {
    return false;
  }
}

export async function saveDassConsent(uid: string): Promise<void> {
  await updateDoc(doc(db, 'users', uid), {
    dassConsent: true,
    dassConsentAt: serverTimestamp(),
  });
}
