import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import { DASS_ITEM_COUNT } from '@/constants/dass21';
import { ROUTES } from '@/constants/sessionFlow';
import type { RestDurationMinutes } from '@/constants/restPeriod';
import { useAuth } from '@/contexts/AuthContext';
import { useSessionFlowStore } from '@/store/sessionFlowStore';
import {
  fetchDassAssessment,
  storedSeverities,
  type StoredDassResult,
} from '@/services/dassService';
import {
  fetchRestGate,
  startRestPeriod,
  submitDassCheckin,
  type RestPeriod,
} from '@/services/restService';
import {
  requestRestNotificationPermission,
  scheduleRestEndNotification,
} from '@/services/notificationService';
import { registerRestPushChannels } from '@/services/pushRegistration';
import { isBlocked } from '@/utils/dass21Score';
import { getLocalDateString } from '@/utils/localDate';
import RestOptions from '@/components/rest/RestOptions';
import RestCountdown from '@/components/rest/RestCountdown';
import RestCheckinPrompt from '@/components/rest/RestCheckinPrompt';
import RestRecommendations from '@/components/RestRecommendations';
import DassTest from '@/components/dass/DassTest';
import DassReview from '@/components/dass/DassReview';
import DassResultView from '@/components/dass/DassResultView';
import {
  DASS_SUPPORT_LINE_MIN_SEVERITY,
  SUPPORT_LINE,
  type DassSeverity,
} from '@/constants/dass21';
import { isAtOrAbove } from '@/utils/dass21Score';

type Step =
  | 'loading'
  | 'error'
  | 'missing'
  | 'choose'
  | 'active'
  | 'prompt'
  | 'test'
  | 'review'
  | 'result';

export default function RestScreen() {
  const router = useRouter();
  const { user, initializing } = useAuth();
  const setDass = useSessionFlowStore((s) => s.setDass);

  const [step, setStep] = useState<Step>('loading');
  const [rest, setRest] = useState<RestPeriod | null>(null);
  const [contextResult, setContextResult] = useState<StoredDassResult | null>(null);
  const [assessmentDate, setAssessmentDate] = useState<string | null>(null);
  const [selectedDuration, setSelectedDuration] = useState<RestDurationMinutes | null>(60);
  const [answers, setAnswers] = useState<(number | null)[]>(() => new Array(DASS_ITEM_COUNT).fill(null));
  const [result, setResult] = useState<StoredDassResult | null>(null);
  const [resultBlocked, setResultBlocked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async (silent = false) => {
    const uid = user?.uid;
    if (!uid) return;
    if (!silent) setStep('loading');
    setError(null);

    try {
      const gate = await fetchRestGate(uid);
      if (gate.state === 'unavailable') {
        throw gate.error ?? new Error('Rest status is unavailable.');
      }

      if (gate.state === 'none') {
        const date = getLocalDateString();
        const lookup = await fetchDassAssessment(uid, date);
        if (lookup.state === 'unavailable') {
          throw lookup.error ?? new Error('Assessment status is unavailable.');
        }
        if (lookup.state === 'none') {
          setRest(null);
          setContextResult(null);
          setAssessmentDate(null);
          setStep('missing');
          return;
        }
        const blocked = isBlocked(storedSeverities(lookup.result));
        setRest(null);
        setContextResult(lookup.result);
        setAssessmentDate(lookup.result.date);
        setStep(blocked ? 'choose' : 'missing');
        return;
      }

      const currentRest = gate.rest;
      setRest(currentRest);
      setAssessmentDate(currentRest.assessment_date);

      if (gate.state === 'active') {
        setStep('active');
        const assessment = await fetchDassAssessment(uid, currentRest.assessment_date);
        if (assessment.state === 'exists') setContextResult(assessment.result);
        return;
      }

      if (gate.state === 'checkin_required') {
        setStep('prompt');
        const assessment = await fetchDassAssessment(uid, currentRest.assessment_date);
        if (assessment.state === 'exists') setContextResult(assessment.result);
        return;
      }

      setContextResult(gate.checkin);
      if (gate.state === 'passed') {
        setResult(gate.checkin);
        setResultBlocked(false);
        setDass('passed', gate.checkin);
        setStep('result');
      } else {
        setStep('choose');
      }
    } catch (loadError) {
      console.error('[rest] unable to load rest state:', loadError);
      setError('We could not load your rest status. Check your connection and try again.');
      setStep('error');
    }
  }, [setDass, user?.uid]);

  useEffect(() => {
    if (initializing) return;
    void load();
  }, [initializing, load]);

  useEffect(() => {
    if (step !== 'active' && step !== 'prompt') return;
    const interval = setInterval(() => void load(true), 15_000);
    return () => clearInterval(interval);
  }, [step, load]);

  const startRest = async () => {
    const uid = user?.uid;
    if (!uid || !selectedDuration || !assessmentDate || busy) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const permitted = await requestRestNotificationPermission();
      if (permitted) {
        await registerRestPushChannels(uid).catch((pushError) => {
          console.warn('[rest] push channel registration failed:', pushError);
        });
      }
      const created = await startRestPeriod(uid, assessmentDate, selectedDuration);
      const scheduled = await scheduleRestEndNotification(created.rest_end_time as Date).catch((notifyError) => {
        console.warn('[rest] unable to schedule rest notification:', notifyError);
        return false;
      });
      setRest(created);
      setStep('active');
      if (!permitted) {
        setNotice('Notifications are off, so we could not schedule a reminder. Your rest still ends at the saved time, and PomoJI will check in when you open it.');
      } else if (!scheduled && Platform.OS === 'web') {
        setNotice('Browser reminders are best-effort while this page stays open. PomoJI will still check your rest status when you return.');
      }
    } catch (startError) {
      console.error('[rest] unable to start rest period:', startError);
      setError('We could not save your rest period. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const startCheckin = () => {
    setAnswers(new Array(DASS_ITEM_COUNT).fill(null));
    setError(null);
    setStep('test');
  };

  const setAnswer = (index: number, value: number) =>
    setAnswers((previous) => {
      const next = [...previous];
      next[index] = value;
      return next;
    });

  const submitCheckin = async () => {
    const uid = user?.uid;
    if (!uid || !rest || answers.some((answer) => answer === null) || busy) return;
    setBusy(true);
    setError(null);
    try {
      const completeAnswers = answers.filter((answer): answer is number => answer !== null);
      const saved = await submitDassCheckin(uid, rest, completeAnswers);
      const blocked = isBlocked(storedSeverities(saved));
      setResult(saved);
      setResultBlocked(blocked);
      setContextResult(saved);
      setAssessmentDate(rest.assessment_date);
      setDass(blocked ? 'blocked' : 'passed', saved);
      setStep('result');
    } catch (submitError) {
      console.error('[rest] check-in submission failed:', submitError);
      if ((submitError as Error)?.name === 'DassAlreadyTakenError') {
        setError('This check-in was already submitted. We are refreshing your rest status.');
        void load(true);
      } else {
        setError('We could not save your check-in. Check your connection and try again.');
      }
    } finally {
      setBusy(false);
    }
  };

  const severeContext = contextResult
    ? (Object.values(storedSeverities(contextResult)) as DassSeverity[]).some((severity) =>
        isAtOrAbove(severity, DASS_SUPPORT_LINE_MIN_SEVERITY),
      )
    : false;

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

      {step === 'error' && (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-center text-base leading-6 text-ink2 dark:text-ink2Dark">{error}</Text>
          <Pressable
            onPress={() => void load()}
            accessibilityRole="button"
            className="mt-4 min-h-[48px] items-center justify-center rounded-xl bg-primary px-6"
          >
            <Text className="font-semibold text-white">Retry</Text>
          </Pressable>
        </View>
      )}

      {step === 'missing' && (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-center text-2xl font-display font-bold text-ink dark:text-inkDark">No rest period is needed</Text>
          <Text className="font-sans mt-3 text-center text-base leading-6 text-ink2 dark:text-ink2Dark">
            Your latest check does not currently require a break. You can return to the session checks.
          </Text>
          <Pressable
            onPress={() => router.replace(ROUTES.FOCUS)}
            accessibilityRole="button"
            className="mt-5 min-h-[52px] items-center justify-center rounded-xl bg-primary px-6"
          >
            <Text className="text-base font-semibold text-white">Back to checks</Text>
          </Pressable>
        </View>
      )}

      {step === 'choose' && (
        <ScrollView className="flex-1" contentContainerStyle={{ paddingHorizontal: 24, paddingVertical: 20 }}>
          <Text className="text-sm font-semibold uppercase tracking-wide text-primary">Rest period</Text>
          <Text className="mt-2 text-3xl font-display font-bold leading-9 text-ink dark:text-inkDark">Take the break your check suggested</Text>
          <Text className="font-sans mt-3 text-base leading-6 text-ink2 dark:text-ink2Dark">
            Sessions stay paused while you rest. Choose the amount of time that feels right — you can pick based on what you need, from a short calm break to a longer cool-down.
          </Text>
          <Text className="font-sans mt-2 text-sm leading-5 text-ink3 dark:text-ink3Dark">
            We will ask for notification permission so PomoJI can remind you when your rest ends. If permission is denied, the app will still check your rest status when you open it.
          </Text>

          {severeContext ? (
            <View className="mt-4 rounded-xl border border-line p-3 dark:border-lineDark">
              <Text className="text-base font-semibold text-ink dark:text-inkDark">Need someone to talk to?</Text>
              {SUPPORT_LINE.phone ? (
                <Text className="font-sans mt-1 text-base text-ink dark:text-inkDark">
                  {SUPPORT_LINE.name}: {SUPPORT_LINE.phone}
                  {SUPPORT_LINE.hours ? ` (${SUPPORT_LINE.hours})` : ''}
                </Text>
              ) : null}
              <Text className="font-sans mt-1 text-sm leading-5 text-ink2 dark:text-ink2Dark">{SUPPORT_LINE.note}</Text>
            </View>
          ) : null}

          <View className="mt-5">
            <RestOptions selected={selectedDuration} busy={busy} onSelect={setSelectedDuration} />
          </View>

          {notice ? <Text className="font-sans mt-3 text-sm leading-5 text-ink2 dark:text-ink2Dark">{notice}</Text> : null}
          {error ? <Text accessibilityRole="alert" className="font-sans mt-3 text-sm text-[#C94C3C]">{error}</Text> : null}

          <View className="mt-5 flex-row gap-3">
            <Pressable
              onPress={() => router.replace(ROUTES.HOME)}
              disabled={busy}
              accessibilityRole="button"
              className="min-h-[52px] flex-1 items-center justify-center rounded-xl border border-line bg-card px-4 dark:border-lineDark dark:bg-cardDark"
            >
              <Text className="text-base font-semibold text-ink2 dark:text-ink2Dark">Back to Home</Text>
            </Pressable>
            <Pressable
              onPress={() => void startRest()}
              disabled={busy || !selectedDuration}
              accessibilityRole="button"
              className={`min-h-[52px] flex-1 items-center justify-center rounded-xl px-4 ${busy || !selectedDuration ? 'bg-primary/40' : 'bg-primary'}`}
            >
              <Text className="text-base font-semibold text-white">{busy ? 'Saving…' : 'Start rest'}</Text>
            </Pressable>
          </View>
          <View className="mt-5">
            <RestRecommendations variant="dass" />
          </View>
        </ScrollView>
      )}

      {step === 'active' && rest && (
        <ScrollView className="flex-1" contentContainerStyle={{ paddingHorizontal: 24, paddingVertical: 24 }}>
          <Text className="text-sm font-semibold uppercase tracking-wide text-primary">Resting</Text>
          <Text className="mt-2 text-3xl font-display font-bold leading-9 text-ink dark:text-inkDark">Give yourself this time</Text>
          <Text className="font-sans mt-3 text-base leading-6 text-ink2 dark:text-ink2Dark">
            Sessions stay paused until your rest ends. The countdown uses the saved end time, so it stays accurate if you close or restart the app.
          </Text>
          <View className="mt-8">
            <RestCountdown restEndTime={rest.rest_end_time} onEnded={() => void load(true)} />
          </View>
          {notice ? <Text className="font-sans mt-5 text-center text-sm leading-5 text-ink2 dark:text-ink2Dark">{notice}</Text> : null}
          <Pressable
            onPress={() => router.replace(ROUTES.HOME)}
            accessibilityRole="button"
            className="mt-8 min-h-[52px] items-center justify-center rounded-xl border border-line bg-card px-5 dark:border-lineDark dark:bg-cardDark"
          >
            <Text className="text-base font-semibold text-ink2 dark:text-ink2Dark">Back to Home</Text>
          </Pressable>
        </ScrollView>
      )}

      {step === 'prompt' && (
        <ScrollView className="flex-1" contentContainerStyle={{ paddingHorizontal: 24, paddingVertical: 24 }}>
          <RestCheckinPrompt busy={busy} onStart={startCheckin} onHome={() => router.replace(ROUTES.HOME)} />
          {notice ? <Text className="font-sans mt-4 text-center text-sm leading-5 text-ink2 dark:text-ink2Dark">{notice}</Text> : null}
        </ScrollView>
      )}

      {step === 'test' && (
        <DassTest
          answers={answers}
          onChange={setAnswer}
          onFinish={() => setStep('review')}
          onExit={() => setStep('prompt')}
        />
      )}

      {step === 'review' && (
        <DassReview
          answers={answers}
          submitting={busy}
          error={error}
          onChange={setAnswer}
          onSubmit={() => void submitCheckin()}
          onExit={() => setStep('prompt')}
          helperText="Review your follow-up check-in answers. You can change any response before submitting."
        />
      )}

      {step === 'result' && result && (
        <DassResultView
          result={result}
          blocked={resultBlocked}
          pendingSync={false}
          onContinue={() =>
            router.replace({
              pathname: ROUTES.TIMER,
              params: { autostart: String(Date.now()) },
            } as never)
          }
          onChooseRest={() => {
            setError(null);
            setNotice(null);
            setStep('choose');
          }}
          onHome={() => router.replace(ROUTES.HOME)}
        />
      )}
    </View>
  );
}
