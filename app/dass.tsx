import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, BackHandler, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
// ADAPT: import `auth` from your firebase.config.ts
import { auth } from '@/firebase.config';
import { DASS_ITEM_COUNT } from '@/constants/dass21';
import { ROUTES } from '@/constants/sessionFlow';
import {
  DassAlreadyTakenError,
  fetchTodayDass,
  hasDassConsent,
  saveDassConsent,
  storedSeverities,
  submitDassResult,
  type StoredDassResult,
} from '@/services/dassService';
import {
  buildLocalResult,
  getLocalAssessment,
  hasLocalConsent,
  markLocalConsent,
  saveLocalAssessment,
  syncPendingDass,
} from '@/services/dassOffline';
import { getLocalDateString } from '@/utils/localDate';
import { useSessionFlowStore } from '@/store/sessionFlowStore';
import { isBlocked } from '@/utils/dass21Score';
import WarningModal from '@/components/WarningModal';
import { Redirect } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import ConsentNotice from '@/components/dass/ConsentNotice';
import DassIntro from '@/components/dass/DassIntro';
import DassTest from '@/components/dass/DassTest';
import DassReview from '@/components/dass/DassReview';
import DassResultView from '@/components/dass/DassResultView';

type Step = 'loading' | 'intro' | 'consent' | 'test' | 'review' | 'result';

export default function DassScreen() {
  const router = useRouter();
  const { user, initializing } = useAuth();
  const setDass = useSessionFlowStore((s) => s.setDass);

  const [step, setStep] = useState<Step>('loading');
  // Partial answers live ONLY in this component's state: leaving the screen discards them.
  const [answers, setAnswers] = useState<(number | null)[]>(() => new Array(DASS_ITEM_COUNT).fill(null));
  const [stored, setStored] = useState<StoredDassResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingSync, setPendingSync] = useState(false);
  const [confirmExit, setConfirmExit] = useState(false);

  const showResult = useCallback(
    (r: StoredDassResult, pending = false) => {
      setStored(r);
      setPendingSync(pending);
      setDass(isBlocked(storedSeverities(r)) ? 'blocked' : 'passed', r);
      setStep('result');
    },
    [setDass],
  );

  // On open: check the SERVER for today's result, but never let connectivity
  // block the questionnaire — fall back to the on-device store when offline.
  useEffect(() => {
    if (initializing) return;
    let cancelled = false;
    (async () => {
      const uid = auth.currentUser?.uid;
      if (!uid) return router.replace(ROUTES.HOME);
      void syncPendingDass(uid).catch(() => {}); // flush pending saves, best effort
      const res = await fetchTodayDass(uid);
      if (cancelled) return;
      if (res.state === 'exists') return showResult(res.result);
      if (res.state === 'unavailable') {
        // Offline: a locally completed check for today wins; otherwise the
        // survey itself runs fully offline (questions + scoring are local).
        const local = await getLocalAssessment(uid, getLocalDateString());
        if (cancelled) return;
        if (local) return showResult(local, true);
        const consented = await hasLocalConsent(uid);
        if (!cancelled) setStep(consented ? 'test' : 'intro');
        return;
      }
      // 'none': server reachable, no result today. Local consent covers users
      // who consented while offline.
      const consented = (await hasDassConsent(uid)) || (await hasLocalConsent(uid));
      if (!cancelled) setStep(consented ? 'test' : 'intro');
    })();
    return () => {
      cancelled = true;
    };
  }, [router, showResult, initializing]);

  const inProgress = step === 'test' || step === 'review';

  // Android hardware back: ask before discarding answers.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (inProgress) {
        setConfirmExit(true);
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [inProgress]);

  const leave = () => {
    setAnswers(new Array(DASS_ITEM_COUNT).fill(null)); // discard partial answers
    setConfirmExit(false);
    router.replace(ROUTES.FOCUS);
  };

  const setAnswer = (i: number, v: number) =>
    setAnswers((prev) => {
      const next = [...prev];
      next[i] = v;
      return next;
    });

  const accept = async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    setBusy(true);
    setError(null);
    // Server consent is best-effort; the local flag covers offline consent and
    // syncPendingDass() writes the server flag once connectivity returns.
    try {
      await saveDassConsent(uid);
    } catch {
      // offline — continue anyway
    }
    await markLocalConsent(uid);
    setStep('test');
    setBusy(false);
  };

  const submit = async () => {
    const uid = auth.currentUser?.uid;
    if (!uid || answers.some((a) => a === null)) return;
    setBusy(true);
    setError(null);
    try {
      const saved = await submitDassResult(uid, answers as number[]);
      showResult(saved);
      void syncPendingDass(uid).catch(() => {}); // flush any older pending saves
    } catch (e) {
      if (e instanceof DassAlreadyTakenError) {
        const res = await fetchTodayDass(uid);
        if (res.state === 'exists') {
          showResult(res.result);
          setBusy(false);
          return;
        }
      }
      // Offline / server unreachable: score locally, store on device, and mark
      // pending — the result is real, just not yet confirmed by the server.
      const local = buildLocalResult(uid, getLocalDateString(), answers as number[]);
      await saveLocalAssessment(uid, local);
      showResult(local, true);
    } finally {
      setBusy(false);
    }
  };

  if (initializing) {
    return (
      <View className="flex-1 items-center justify-center bg-canvas dark:bg-canvasDark">
        <ActivityIndicator size="large" />
      </View>
    );
  }
  if (!user) return <Redirect href="/(auth)/welcome" />;

  return (
    <View className="flex-1 bg-canvas dark:bg-canvasDark">
      {step === 'loading' && (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" />
        </View>
      )}

      {step === 'intro' && (
        <DassIntro onContinue={() => setStep('consent')} onDecline={() => router.replace(ROUTES.FOCUS)} />
      )}

      {step === 'consent' && (
        <>
          <ConsentNotice busy={busy} onAccept={accept} onDecline={() => router.replace(ROUTES.FOCUS)} />
          {error ? <Text className="px-6 pb-2 text-sm text-[#C94C3C]">{error}</Text> : null}
        </>
      )}

      {step === 'test' && (
        <DassTest
          answers={answers}
          onChange={setAnswer}
          onFinish={() => setStep('review')}
          onExit={() => setConfirmExit(true)}
        />
      )}

      {step === 'review' && (
        <DassReview
          answers={answers}
          submitting={busy}
          error={error}
          onChange={setAnswer}
          onSubmit={submit}
          onExit={() => setConfirmExit(true)}
        />
      )}

      {step === 'result' && stored && (
        <DassResultView
          result={stored}
          blocked={isBlocked(storedSeverities(stored))}
          pendingSync={pendingSync}
          onContinue={() => router.replace(ROUTES.BEFORE_SESSION)}
          onHome={() => router.replace(ROUTES.HOME)}
        />
      )}

      <WarningModal
        visible={confirmExit}
        title="Leave the test?"
        message="Your answers so far won’t be saved."
        primaryLabel="Leave test"
        onPrimary={leave}
        secondaryLabel="Keep going"
        onSecondary={() => setConfirmExit(false)}
      />
    </View>
  );
}
