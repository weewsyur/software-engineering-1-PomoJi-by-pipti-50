import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, BackHandler, Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { DASS_ITEM_COUNT } from '@/constants/dass21';
import { ROUTES } from '@/constants/sessionFlow';
import {
  DassAlreadyTakenError,
  fetchTodayDass,
  isDassNetworkError,
  saveDassConsent,
  storedSeverities,
  submitDassResult,
  type StoredDassResult,
} from '@/services/dassService';
import { useDassErrorMessage } from '@/hooks/useDassErrorMessage';
import {
  buildLocalResult,
  getLocalAssessment,
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
import DassIntro from '@/components/dass/DassIntro';
import DassTest from '@/components/dass/DassTest';
import DassReview from '@/components/dass/DassReview';
import DassResultView from '@/components/dass/DassResultView';

type Step = 'loading' | 'unavailable' | 'intro' | 'test' | 'review' | 'result';

export default function DassScreen() {
  const router = useRouter();
  const { user, initializing } = useAuth();
  const setDass = useSessionFlowStore((s) => s.setDass);

  const [step, setStep] = useState<Step>('loading');
  const [answers, setAnswers] = useState<(number | null)[]>(() => new Array(DASS_ITEM_COUNT).fill(null));
  const [stored, setStored] = useState<StoredDassResult | null>(null);
  const [busy, setBusy] = useState(false);
  const dassError = useDassErrorMessage();
  const [pendingSync, setPendingSync] = useState(false);
  const [confirmExit, setConfirmExit] = useState(false);
  const [consentGiven, setConsentGiven] = useState(false);
  const [offlineMode, setOfflineMode] = useState(false);
  const [availabilityAttempt, setAvailabilityAttempt] = useState(0);

  const showResult = useCallback(
    (result: StoredDassResult, pending = false) => {
      setStored(result);
      setPendingSync(pending);
      setDass(isBlocked(storedSeverities(result)) ? 'blocked' : 'passed', result);
      setStep('result');
    },
    [setDass],
  );

  useEffect(() => {
    if (initializing) return;
    let cancelled = false;
    (async () => {
      const uid = user?.uid;
      if (!uid) return router.replace(ROUTES.HOME);

      try {
        await syncPendingDass(uid);
      } catch (syncError) {
        console.error('[dass] pending assessment sync failed:', syncError);
      }

      const lookup = await fetchTodayDass(uid);
      if (cancelled) return;
      if (lookup.state === 'exists') {
        showResult(lookup.result);
        return;
      }

      if (lookup.state === 'unavailable') {
        if (!isDassNetworkError(lookup.error)) {
          console.error('[dass] unable to verify assessment availability:', lookup.error);
          setStep('unavailable');
          return;
        }
        try {
          const local = await getLocalAssessment(uid, getLocalDateString());
          if (cancelled) return;
          if (local) {
            showResult(local, true);
            return;
          }
          setOfflineMode(true);
          setStep('intro');
        } catch (localError) {
          console.error('[dass] unable to load local assessment:', localError);
          setStep('unavailable');
        }
        return;
      }

      try {
        const local = await getLocalAssessment(uid, getLocalDateString());
        if (cancelled) return;
        if (local) {
          showResult(local, true);
          return;
        }
      } catch (localError) {
        console.error('[dass] unable to load local assessment:', localError);
        setStep('unavailable');
        return;
      }
      setOfflineMode(false);
      setStep('intro');
    })().catch((availabilityError) => {
      if (cancelled) return;
      console.error('[dass] assessment availability check failed:', availabilityError);
      setStep('unavailable');
    });
    return () => {
      cancelled = true;
    };
  }, [router, showResult, initializing, user?.uid, availabilityAttempt]);

  const inProgress = step === 'test' || step === 'review';

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
    setAnswers(new Array(DASS_ITEM_COUNT).fill(null));
    setConfirmExit(false);
    router.replace(ROUTES.FOCUS);
  };

  const setAnswer = (index: number, value: number) =>
    setAnswers((previous) => {
      const next = [...previous];
      next[index] = value;
      return next;
    });

  const accept = async () => {
    const uid = user?.uid;
    if (!uid || !consentGiven || busy) return;
    setBusy(true);
    dassError.clearError();
    try {
      if (offlineMode) {
        await markLocalConsent(uid, true);
      } else {
        try {
          await saveDassConsent(uid, true);
        } catch (saveError) {
          if (!isDassNetworkError(saveError)) throw saveError;
          await markLocalConsent(uid, true);
          setOfflineMode(true);
        }
      }
      setStep('test');
    } catch (saveError) {
      console.error('[dass] unable to save consent:', saveError);
      dassError.setError(saveError);
    } finally {
      setBusy(false);
    }
  };

  const submit = async () => {
    const uid = user?.uid;
    if (!uid || !consentGiven || answers.some((answer) => answer === null) || busy) return;
    setBusy(true);
    dassError.clearError();
    const completeAnswers = answers.filter((answer): answer is number => answer !== null);
    const assessmentDate = getLocalDateString();
    const completedAt = new Date().toISOString();
    try {
      if (offlineMode) {
        await saveDassConsent(uid, true);
        setOfflineMode(false);
      }
      const saved = await submitDassResult(uid, completeAnswers, assessmentDate, completedAt);
      showResult(saved);
      void syncPendingDass(uid).catch((syncError) => {
        console.error('[dass] pending assessment sync failed:', syncError);
      });
    } catch (submitError) {
      if (submitError instanceof DassAlreadyTakenError) {
        const lookup = await fetchTodayDass(uid);
        if (lookup.state === 'exists') {
          showResult(lookup.result);
          return;
        }
        dassError.setError("Today's assessment could not be verified. Please retry while connected.");
        return;
      }

      if (isDassNetworkError(submitError)) {
        try {
          const local = buildLocalResult(uid, assessmentDate, completeAnswers, completedAt);
          await saveLocalAssessment(uid, local);
          showResult(local, true);
        } catch (localError) {
          console.error('[dass] unable to save offline assessment:', localError);
          dassError.setError('We could not save this assessment on your device. Your answers are still available here; please retry.');
        }
      } else {
        console.error('[dass] assessment submission failed:', submitError);
        dassError.setError(submitError);
      }
    } finally {
      setBusy(false);
    }
  };

  const retryError = () => {
    if (step === 'intro') void accept();
    else void submit();
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

      {step === 'unavailable' && (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="font-sans text-center text-base leading-6 text-ink2 dark:text-ink2Dark">
            We could not verify whether an assessment is available right now. Please check your connection and account, then retry.
          </Text>
          <Pressable
            onPress={() => setAvailabilityAttempt((attempt) => attempt + 1)}
            accessibilityRole="button"
            className="mt-4 min-h-[48px] items-center justify-center rounded-xl bg-primary px-6"
          >
            <Text className="font-semibold text-white">Retry</Text>
          </Pressable>
        </View>
      )}

      {step === 'intro' && (
        <DassIntro
          busy={busy}
          consentGiven={consentGiven}
          error={dassError.message}
          errorRetryable={dassError.retryable}
          onRetryError={retryError}
          onConsentChange={setConsentGiven}
          onContinue={accept}
          onDecline={() => router.replace(ROUTES.FOCUS)}
        />
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
          error={dassError.message}
          errorRetryable={dassError.retryable}
          onRetryError={retryError}
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
          onChooseRest={() => router.replace(ROUTES.REST)}
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
