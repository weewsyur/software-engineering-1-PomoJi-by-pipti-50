import {
  collection,
  doc,
  DocumentData,
  getDocFromServer,
  getDocsFromServer,
  runTransaction,
  serverTimestamp,
  setDoc,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/firebase.config';
import { QUESTIONNAIRE_VERSION, storedSeverities, type StoredDassResult } from '@/services/dassService';
import { scoreDass21 } from '@/utils/dass21Score';
import { isRestDuration, timestampToMillis } from '@/utils/restPeriod';
import { getLocalDateString } from '@/utils/localDate';
import { isBlocked } from '@/utils/dass21Score';

export const REST_SUBCOLLECTION = 'rest_periods';
export const CURRENT_REST_DOC = 'current';
export const DASS_CHECKIN_SUBCOLLECTION = 'dass_checkins';

export interface RestPeriod {
  user_id: string;
  rest_id: string;
  /** Local date of the blocked DASS-21 assessment that opened this rest flow. */
  assessment_date: string;
  duration_minutes: number;
  /** UTC instant when the rest period ends. */
  rest_end_time: unknown;
  createdAt?: unknown;
}

export interface DassCheckinResult extends StoredDassResult {
  rest_id: string;
  source_assessment_date: string;
}

export type RestGate =
  | { state: 'none' }
  | { state: 'active'; rest: RestPeriod }
  | { state: 'checkin_required'; rest: RestPeriod }
  | { state: 'choose'; rest: RestPeriod; checkin: DassCheckinResult }
  | { state: 'passed'; rest: RestPeriod; checkin: DassCheckinResult }
  | { state: 'unavailable'; error?: unknown };

const restRef = (uid: string) => doc(db, 'users', uid, REST_SUBCOLLECTION, CURRENT_REST_DOC);
const checkinRef = (uid: string, restId: string) =>
  doc(db, 'users', uid, DASS_CHECKIN_SUBCOLLECTION, restId);

function restFromData(uid: string, data: DocumentData): RestPeriod {
  return {
    user_id: data.user_id ?? uid,
    rest_id: data.rest_id,
    assessment_date: data.assessment_date,
    duration_minutes: data.duration_minutes,
    rest_end_time: data.rest_end_time,
    createdAt: data.createdAt,
  };
}

function checkinFromData(data: DocumentData): DassCheckinResult {
  return data as DassCheckinResult;
}

export async function fetchCurrentRest(uid: string): Promise<
  | { state: 'none' }
  | { state: 'exists'; rest: RestPeriod }
  | { state: 'unavailable'; error?: unknown }
> {
  try {
    const snap = await getDocFromServer(restRef(uid));
    return snap.exists()
      ? { state: 'exists', rest: restFromData(uid, snap.data()) }
      : { state: 'none' };
  } catch (error) {
    console.warn('[rest] unable to fetch current rest period:', error);
    return { state: 'unavailable', error };
  }
}

export async function fetchRestCheckin(
  uid: string,
  restId: string,
): Promise<
  | { state: 'none' }
  | { state: 'exists'; checkin: DassCheckinResult }
  | { state: 'unavailable'; error?: unknown }
> {
  try {
    const snap = await getDocFromServer(checkinRef(uid, restId));
    return snap.exists()
      ? { state: 'exists', checkin: checkinFromData(snap.data()) }
      : { state: 'none' };
  } catch (error) {
    console.warn('[rest] unable to fetch rest check-in:', error);
    return { state: 'unavailable', error };
  }
}

/**
 * Resolves the durable rest state from the backend. The countdown itself is
 * derived from rest_end_time, so this remains correct after refresh/restart.
 */
export async function fetchRestGate(uid: string, now = Date.now()): Promise<RestGate> {
  const restLookup = await fetchCurrentRest(uid);
  if (restLookup.state === 'unavailable') return { state: 'unavailable', error: restLookup.error };
  if (restLookup.state === 'none') return { state: 'none' };

  const rest = restLookup.rest;
  const end = timestampToMillis(rest.rest_end_time);
  if (end == null) return { state: 'unavailable' };
  if (end > now) return { state: 'active', rest };

  const checkinLookup = await fetchRestCheckin(uid, rest.rest_id);
  if (checkinLookup.state === 'unavailable') return { state: 'unavailable', error: checkinLookup.error };
  if (checkinLookup.state === 'none') return { state: 'checkin_required', rest };
  if (checkinLookup.checkin.date !== getLocalDateString()) return { state: 'none' };

  return isBlocked(storedSeverities(checkinLookup.checkin))
    ? { state: 'choose', rest, checkin: checkinLookup.checkin }
    : { state: 'passed', rest, checkin: checkinLookup.checkin };
}

/** Starts a new rest period. Firestore rules only allow replacing an ended rest. */
export async function startRestPeriod(
  uid: string,
  assessmentDate: string,
  durationMinutes: number,
): Promise<RestPeriod> {
  if (!isRestDuration(durationMinutes)) {
    throw new RangeError('Unsupported rest duration.');
  }

  const restId = `rest_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  const restEnd = new Date(Date.now() + durationMinutes * 60_000);
  const payload: RestPeriod = {
    user_id: uid,
    rest_id: restId,
    assessment_date: assessmentDate,
    duration_minutes: durationMinutes,
    rest_end_time: Timestamp.fromDate(restEnd),
    createdAt: serverTimestamp(),
  };

  await setDoc(restRef(uid), payload);
  return { ...payload, rest_end_time: restEnd };
}

/**
 * Saves the post-rest DASS-21 follow-up. The document id is the rest id, so a
 * rest period can only receive one check-in and rules require rest_end_time
 * to have passed before this write is accepted.
 */
export async function submitDassCheckin(
  uid: string,
  rest: RestPeriod,
  answers: readonly number[],
  date: string = getLocalDateString(),
  completedAt: string = new Date().toISOString(),
): Promise<DassCheckinResult> {
  const end = timestampToMillis(rest.rest_end_time);
  if (end == null || end > Date.now()) {
    throw new Error('The rest period has not ended yet.');
  }

  const { rawScores, scores, severities } = scoreDass21(answers);
  const completedDate = new Date(completedAt);
  if (Number.isNaN(completedDate.getTime())) {
    throw new RangeError('Check-in completion time must be a valid ISO date.');
  }

  const ref = checkinRef(uid, rest.rest_id);
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
    rest_id: rest.rest_id,
    source_assessment_date: rest.assessment_date,
  };

  await runTransaction(db, async (transaction) => {
    const restSnap = await transaction.get(restRef(uid));
    const existing = await transaction.get(ref);
    const current = restSnap.exists() ? restFromData(uid, restSnap.data()) : null;
    if (!current || current.rest_id !== rest.rest_id) {
      throw new Error('This rest period is no longer current.');
    }
    const currentEnd = timestampToMillis(current.rest_end_time);
    if (currentEnd == null || currentEnd > Date.now()) {
      throw new Error('The rest period has not ended yet.');
    }
    if (existing.exists()) {
      const err = new Error('This rest check-in was already submitted.');
      err.name = 'DassAlreadyTakenError';
      throw err;
    }
    transaction.set(ref, payload);
  });

  const { createdAt: _createdAt, ...restPayload } = payload;
  return restPayload as DassCheckinResult;
}

export async function fetchAllDassCheckins(uid: string): Promise<DassCheckinResult[]> {
  const snap = await getDocsFromServer(collection(db, 'users', uid, DASS_CHECKIN_SUBCOLLECTION));
  return snap.docs.map((d) => checkinFromData(d.data())).sort((a, b) => a.date.localeCompare(b.date));
}

export async function deleteAllDassCheckins(uid: string): Promise<void> {
  const snap = await getDocsFromServer(collection(db, 'users', uid, DASS_CHECKIN_SUBCOLLECTION));
  for (let offset = 0; offset < snap.docs.length; offset += 450) {
    const { writeBatch } = await import('firebase/firestore');
    const batch = writeBatch(db);
    snap.docs.slice(offset, offset + 450).forEach((checkin) => batch.delete(checkin.ref));
    await batch.commit();
  }
}

export async function deleteCurrentRestPeriod(uid: string): Promise<void> {
  const { deleteDoc } = await import('firebase/firestore');
  await deleteDoc(restRef(uid));
}
