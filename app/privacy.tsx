import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  Text,
  View,
} from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useSessionFlowStore } from '@/store/sessionFlowStore';
import {
  deleteAllDass,
  fetchAllDass,
  hasDassConsent,
  isDassNetworkError,
  saveDassConsent,
} from '@/services/dassService';
import { useDassErrorMessage } from '@/hooks/useDassErrorMessage';
import {
  clearLocalAssessments,
  getLocalAssessments,
  hasLocalConsent,
  markLocalConsent,
} from '@/services/dassOffline';

type ConfirmAction = 'withdraw' | 'delete' | null;

export default function PrivacyScreen() {
  const router = useRouter();
  const { user, initializing } = useAuth();
  const clearDass = useSessionFlowStore((state) => state.clearDass);
  const [consent, setConsent] = useState<boolean | null>(null);
  const [consentSource, setConsentSource] = useState<'account' | 'device' | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);
  const dassError = useDassErrorMessage();
  const setErrorMessage = dassError.setError;
  const retryAction = useRef<(() => void) | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (initializing) return;
    let cancelled = false;
    (async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      try {
        const accountConsent = await hasDassConsent(user.uid);
        if (!cancelled) {
          setConsent(accountConsent);
          setConsentSource('account');
        }
      } catch (loadError) {
        console.error('[privacy] unable to load account consent status:', loadError);
        try {
          const localConsent = await hasLocalConsent(user.uid);
          if (!cancelled) {
            setConsent(localConsent ? true : null);
            setConsentSource(localConsent ? 'device' : null);
            setErrorMessage('Account consent status could not be verified. Showing any consent saved on this device.');
          }
        } catch (localError) {
          console.error('[privacy] unable to load local consent status:', localError);
          if (!cancelled) setErrorMessage('We could not load your consent status. Please retry.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [initializing, user, setErrorMessage]);

  if (initializing) {
    return (
      <View className="flex-1 items-center justify-center bg-canvas dark:bg-canvasDark">
        <ActivityIndicator size="large" />
      </View>
    );
  }
  if (!user) return <Redirect href="/(auth)/welcome" />;

  const withdrawConsent = async () => {
    setBusy(true);
    dassError.clearError();
    retryAction.current = () => void withdrawConsent();
    setNotice(null);
    try {
      await saveDassConsent(user.uid, false);
      try {
        await markLocalConsent(user.uid, false, false);
      } catch (localError) {
        console.error('[privacy] account consent withdrawn but local status update failed:', localError);
        setConsent(false);
        setConsentSource('account');
        dassError.setError('Consent was withdrawn for your account, but this device could not update its saved status.');
        return;
      }
      setConsent(false);
      setConsentSource('account');
      setNotice('Consent withdrawn. Existing assessment history has been kept.');
    } catch (withdrawError) {
      if (isDassNetworkError(withdrawError)) {
        try {
          await markLocalConsent(user.uid, false);
          setConsent(false);
          setConsentSource('device');
          setNotice('Consent is withdrawn on this device and will sync to your account when you are online.');
        } catch (localError) {
          console.error('[privacy] unable to save offline consent withdrawal:', localError);
          dassError.setError('We could not save the withdrawal on this device. Please retry while connected.');
        }
      } else {
        console.error('[privacy] unable to withdraw account consent:', withdrawError);
        dassError.setError(withdrawError);
      }
    } finally {
      setBusy(false);
      setConfirmAction(null);
    }
  };

  const exportAssessments = async () => {
    setBusy(true);
    dassError.clearError();
    retryAction.current = () => void exportAssessments();
    setNotice(null);
    try {
      const [accountRecords, localRecords] = await Promise.all([
        fetchAllDass(user.uid),
        getLocalAssessments(user.uid),
      ]);
      const byDate = new Map(localRecords.map((record) => [record.date, record]));
      accountRecords.forEach((record) => byDate.set(record.date, record));
      const assessments = [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
      const content = JSON.stringify(
        {
          format: 'pomoji-dass21-export-v1',
          exportedAt: new Date().toISOString(),
          assessments,
        },
        null,
        2,
      );

      if (Platform.OS === 'web') {
        const url = URL.createObjectURL(new Blob([content], { type: 'application/json' }));
        const link = document.createElement('a');
        link.href = url;
        link.download = `pomoji-dass21-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
        setNotice(`Exported ${assessments.length} assessment record${assessments.length === 1 ? '' : 's'}.`);
      } else {
        const result = await Share.share({
          title: 'PomoJI DASS-21 data export',
          message: content,
        });
        setNotice(
          result.action === Share.dismissedAction
            ? 'Export sharing was cancelled.'
            : `Shared ${assessments.length} assessment record${assessments.length === 1 ? '' : 's'} as JSON.`,
        );
      }
    } catch (exportError) {
      console.error('[privacy] unable to export assessment records:', exportError);
      dassError.setError(exportError);
    } finally {
      setBusy(false);
    }
  };

  const deleteAssessments = async () => {
    setBusy(true);
    dassError.clearError();
    retryAction.current = () => void deleteAssessments();
    setNotice(null);
    try {
      await deleteAllDass(user.uid);
    } catch (deleteError) {
      console.error('[privacy] unable to delete cloud assessment records:', deleteError);
      dassError.setError(deleteError);
      setBusy(false);
      setConfirmAction(null);
      return;
    }
    try {
      await clearLocalAssessments(user.uid);
    } catch (localError) {
      console.error('[privacy] cloud records deleted but local assessment cleanup failed:', localError);
      dassError.setError('Cloud history was deleted, but this device could not clear its offline copy. Please retry deletion on this device.');
      setBusy(false);
      setConfirmAction(null);
      return;
    }
    clearDass();
    setNotice('All DASS-21 assessment records were deleted from your account and this device.');
    setBusy(false);
    setConfirmAction(null);
  };

  const runConfirmedAction = () => {
    if (confirmAction === 'withdraw') void withdrawConsent();
    if (confirmAction === 'delete') void deleteAssessments();
  };

  return (
    <View className="flex-1 bg-canvas dark:bg-canvasDark">
      <View className="flex-row items-center border-b border-line px-2 py-1 dark:border-lineDark">
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Back to Profile"
          className="min-h-[44px] flex-row items-center gap-1 px-2"
        >
          <ChevronLeft size={22} />
          <Text className="text-base font-semibold text-ink dark:text-inkDark">Back</Text>
        </Pressable>
        <Text className="flex-1 text-center text-lg font-bold text-ink dark:text-inkDark">Privacy</Text>
        <View className="w-16" />
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
        <Text className="text-sm leading-5 text-ink2 dark:text-ink2Dark">
          Control your DASS-21 participation and the assessment data saved to your account.
        </Text>

        <View className="mt-4 rounded-2xl border border-line bg-card p-4 dark:border-lineDark dark:bg-cardDark">
          <Text className="text-base font-bold text-ink dark:text-inkDark">Assessment data</Text>
          <Text className="mt-2 text-sm leading-5 text-ink2 dark:text-ink2Dark">
            New assessments store your 21 numeric responses, raw and doubled Depression, Anxiety, and Stress scores, severity labels, assessment version, consent, and completion time in your private Firestore account. Older records may not include raw scores or an exact completion time. If completed offline, new records are stored on this device until they can sync.
          </Text>
          <Text className="mt-2 text-sm leading-5 text-ink2 dark:text-ink2Dark">
            Security rules restrict these records to your signed-in account. Assessment history is not included in public profiles.
          </Text>
        </View>

        <View className="mt-3 rounded-2xl border border-line bg-card p-4 dark:border-lineDark dark:bg-cardDark">
          <Text className="text-base font-bold text-ink dark:text-inkDark">Participation consent</Text>
          {loading ? (
            <ActivityIndicator className="mt-3 self-start" />
          ) : (
            <Text className="mt-2 text-sm text-ink2 dark:text-ink2Dark">
              {consent === null
                ? 'No active consent is recorded, or the status could not be verified.'
                : `${consent ? 'Consent is active' : 'No active consent'}${                consentSource === 'device' ? ' on this device' : ' for your account'}.`}
            </Text>
          )}
          {consent ? (
            <Pressable
              onPress={() => setConfirmAction('withdraw')}
              disabled={busy || loading}
              accessibilityRole="button"
              accessibilityState={{ disabled: busy || loading }}
              className="mt-3 min-h-[48px] items-center justify-center rounded-xl border border-line px-4 dark:border-lineDark"
            >
              <Text className="font-semibold text-ink dark:text-inkDark">
                Withdraw consent
              </Text>
            </Pressable>
          ) : (
            <Text className="mt-3 text-sm text-ink3 dark:text-ink3Dark">
              You can choose to participate and grant consent before starting a future assessment.
            </Text>
          )}
          <Text className="mt-2 text-xs leading-5 text-ink3 dark:text-ink3Dark">
            Withdrawing consent stops future participation; it does not delete existing results.
          </Text>
        </View>

        <View className="mt-3 rounded-2xl border border-line bg-card p-4 dark:border-lineDark dark:bg-cardDark">
          <Text className="text-base font-bold text-ink dark:text-inkDark">Your records</Text>
          <Pressable
            onPress={() => router.push('/dass-history')}
            accessibilityRole="button"
            className="mt-3 min-h-[48px] items-center justify-center rounded-xl bg-primary px-4"
          >
            <Text className="font-semibold text-white">View assessment history</Text>
          </Pressable>
          <Pressable
            onPress={() => void exportAssessments()}
            disabled={busy}
            accessibilityRole="button"
            accessibilityState={{ disabled: busy }}
            className={`mt-2 min-h-[48px] items-center justify-center rounded-xl border border-line px-4 dark:border-lineDark ${busy ? 'opacity-50' : ''}`}
          >
            <Text className="font-semibold text-ink dark:text-inkDark">{busy ? 'Please wait…' : 'Export all records as JSON'}</Text>
          </Pressable>
          <Pressable
            onPress={() => setConfirmAction('delete')}
            disabled={busy}
            accessibilityRole="button"
            accessibilityState={{ disabled: busy }}
            className={`mt-2 min-h-[48px] items-center justify-center rounded-xl border border-red-300 px-4 dark:border-red-800 ${busy ? 'opacity-50' : ''}`}
          >
            <Text className="font-semibold text-red-700 dark:text-red-300">Delete all assessment records</Text>
          </Pressable>
          <Text className="mt-2 text-xs leading-5 text-ink3 dark:text-ink3Dark">
            Export includes account history and unsynced on-device records and requires a connection. Deleting account history also requires a connection.
          </Text>
        </View>

        {dassError.message ? (
          <View className="mt-3">
            <Text accessibilityRole="alert" className="text-sm leading-5 text-[#C94C3C]">{dassError.message}</Text>
            {dassError.retryable ? (
              <Pressable
                onPress={() => retryAction.current?.()}
                disabled={busy}
                accessibilityRole="button"
                accessibilityState={{ disabled: busy }}
                className="mt-2 min-h-[44px] items-center justify-center self-start rounded-xl border border-line px-4 dark:border-lineDark"
              >
                <Text className="font-semibold text-ink dark:text-inkDark">Retry</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
        {notice ? <Text accessibilityLiveRegion="polite" className="mt-3 text-sm leading-5 text-primary">{notice}</Text> : null}
      </ScrollView>

      <Modal
        visible={confirmAction !== null}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!busy) setConfirmAction(null);
        }}
      >
        <View className="flex-1 items-center justify-center bg-black/50 px-6">
          <View className="w-full max-w-md rounded-2xl bg-card p-5 dark:bg-cardDark">
            <Text className="text-lg font-bold text-ink dark:text-inkDark">
              {confirmAction === 'delete' ? 'Delete all assessment records?' : 'Withdraw DASS-21 consent?'}
            </Text>
            <Text className="mt-2 text-sm leading-5 text-ink2 dark:text-ink2Dark">
              {confirmAction === 'delete'
                ? 'This permanently removes all of your DASS-21 history from your account and this device. This cannot be undone.'
                : 'You will no longer be able to start an assessment until you consent again. Your existing results will remain.'}
            </Text>
            <View className="mt-4 flex-row justify-end gap-2">
              <Pressable
                onPress={() => setConfirmAction(null)}
                disabled={busy}
                accessibilityRole="button"
                className="min-h-[44px] items-center justify-center rounded-xl border border-line px-4 dark:border-lineDark"
              >
                <Text className="font-semibold text-ink dark:text-inkDark">Cancel</Text>
              </Pressable>
              <Pressable
                onPress={runConfirmedAction}
                disabled={busy}
                accessibilityRole="button"
                className="min-h-[44px] items-center justify-center rounded-xl bg-primary px-4"
              >
                <Text className="font-semibold text-white">{busy ? 'Working…' : confirmAction === 'delete' ? 'Delete all' : 'Withdraw'}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
