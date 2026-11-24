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
  Timestamp,
  writeBatch,
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
  depression_raw_score?: number;
  anxiety_raw_score?: number;
  stress_raw_score?: number;
  depression_severity: DassSeverity;
  anxiety_severity: DassSeverity;
  stress_severity: DassSeverity;
  responses: number[]; // all 21 answers (0-3), item order
  questionnaire_version: string;
  consent_given: boolean;
  completedAt?: unknown;
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

export function isDassNetworkError(e: unknown): boolean {
  if (!e || typeof e !== 'object' || !('code' in e)) return false;
  const code = (e as { code?: unknown }).code;
  return (
    code === 'unavailable' ||
    code === 'deadline-exceeded' ||
    code === 'network-request-failed' ||
    code === 'auth/network-request-failed'
  );
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
  completedAt: string = new Date().toISOString(),
): Promise<StoredDassResult> {
  const { rawScores, scores, severities } = scoreDass21(answers);
  const completedDate = new Date(completedAt);
  if (Number.isNaN(completedDate.getTime())) {
    throw new RangeError('Assessment completion time must be a valid ISO date.');
  }
  const ref = dassRef(uid, date);
  const payload = {
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
    completedAt: Timestamp.fromDate(completedDate),
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

export async function fetchAllDass(uid: string): Promise<StoredDassResult[]> {
  const snap = await getDocsFromServer(collection(db, 'users', uid, DASS_SUBCOLLECTION));
  return snap.docs
    .map((d) => d.data() as StoredDassResult)
    .sort((a, b) => a.date.localeCompare(b.date));
}

export async function deleteAllDass(uid: string): Promise<void> {
  const snap = await getDocsFromServer(collection(db, 'users', uid, DASS_SUBCOLLECTION));
  for (let offset = 0; offset < snap.docs.length; offset += 450) {
    const batch = writeBatch(db);
    snap.docs.slice(offset, offset + 450).forEach((assessment) => batch.delete(assessment.ref));
    await batch.commit();
  }
}

/** Consent flag lives on the user profile: users/{uid}.dassConsent */
export async function hasDassConsent(uid: string): Promise<boolean> {
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() && snap.data()?.dassConsent === true;
}

export async function saveDassConsent(uid: string, consented = true): Promise<void> {
  const ref = doc(db, 'users', uid);
  await runTransaction(db, async (transaction) => {
    const profile = await transaction.get(ref);
    if (!profile.exists()) throw new Error('DASS consent profile is missing.');
    transaction.update(ref, {
      dassConsent: consented,
      dassConsentAt: serverTimestamp(),
    });
  });
}
