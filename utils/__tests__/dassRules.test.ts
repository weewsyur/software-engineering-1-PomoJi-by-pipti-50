import { readFileSync } from 'node:fs';
import path from 'node:path';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  deleteDoc,
  doc,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
} from 'firebase/firestore';
import { scoreDass21 } from '../dass21Score';

const PROJECT_ID = 'software-engineering1-pomoji';
const USER_ID = 'dass-owner';
const OTHER_USER_ID = 'different-user';
const ASSESSMENT_COLLECTION = 'dass21_assessments';

let testEnv: RulesTestEnvironment;

function localDate(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function validAssessment(
  userId = USER_ID,
  date = localDate(),
  responses: number[] = new Array(21).fill(0),
) {
  const { rawScores, scores, severities } = scoreDass21(responses);

  return {
    user_id: userId,
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
    responses,
    questionnaire_version: 'dass21-v1',
    consent_given: true,
    completedAt: Timestamp.now(),
    createdAt: serverTimestamp(),
  };
}

function assessmentRef(userId: string, date: string) {
  return doc(
    testEnv.authenticatedContext(userId).firestore(),
    'users',
    userId,
    ASSESSMENT_COLLECTION,
    date,
  );
}

async function seedConsentingUser(userId = USER_ID): Promise<void> {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), 'users', userId), { dassConsent: true });
  });
}

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: readFileSync(path.resolve(__dirname, '../../firestore.rules'), 'utf8'),
    },
  });
});

beforeEach(async () => {
  await testEnv.clearFirestore();
  await seedConsentingUser();
});

afterAll(async () => {
  if (testEnv) await testEnv.cleanup();
});

describe('DASS-21 Firestore rules', () => {
  it('allows a valid assessment create using the app payload shape', async () => {
    const data = validAssessment();
    await assertSucceeds(setDoc(assessmentRef(USER_ID, data.date), data));
  });

  it('allows valid scores at the top of each severity range', async () => {
    const data = validAssessment(USER_ID, localDate(), new Array(21).fill(3));
    await assertSucceeds(setDoc(assessmentRef(USER_ID, data.date), data));
  });

  it('denies a second create for the same date', async () => {
    const data = validAssessment();
    const ref = assessmentRef(USER_ID, data.date);
    await assertSucceeds(setDoc(ref, data));
    await assertFails(setDoc(ref, validAssessment(USER_ID, data.date)));
  });

  it('denies updates and deletes', async () => {
    const data = validAssessment();
    const ref = assessmentRef(USER_ID, data.date);
    await assertSucceeds(setDoc(ref, data));
    await assertFails(updateDoc(ref, { consent_given: false }));
    await assertFails(deleteDoc(ref));
  });

  it('denies a create by another user', async () => {
    const data = validAssessment(USER_ID);
    await assertFails(
      setDoc(
        doc(
          testEnv.authenticatedContext(OTHER_USER_ID).firestore(),
          'users',
          USER_ID,
          ASSESSMENT_COLLECTION,
          data.date,
        ),
        data,
      ),
    );
  });

  it('denies an unknown extra field', async () => {
    const data = validAssessment();
    await assertFails(
      setDoc(assessmentRef(USER_ID, data.date), { ...data, unknown_field: true }),
    );
  });

  it('denies a final score that is not twice its raw score', async () => {
    const data = validAssessment();
    await assertFails(
      setDoc(assessmentRef(USER_ID, data.date), {
        ...data,
        depression_score: data.depression_raw_score + 2,
      }),
    );
  });

  it('denies an incorrect severity for a score', async () => {
    const data = validAssessment();
    await assertFails(
      setDoc(assessmentRef(USER_ID, data.date), {
        ...data,
        anxiety_severity: 'mild',
      }),
    );
  });

  it('denies a response list that is not 21 items long', async () => {
    const data = validAssessment();
    await assertFails(
      setDoc(assessmentRef(USER_ID, data.date), {
        ...data,
        responses: data.responses.slice(1),
      }),
    );
  });
});
