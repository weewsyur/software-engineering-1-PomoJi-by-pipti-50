import { useCallback, useEffect, useRef, useState } from 'react';
import type { Firestore } from 'firebase/firestore';
import {
  DEFAULT_FIELD_MAP,
  type SessionFieldMap,
} from '@/utils/moodCheckIn';
import {
  MoodCheckInError,
  createMoodPromptGuard,
  saveMoodToSession,
  shouldPromptMoodCheckIn,
} from '@/utils/moodCheckIn';

export interface UseMoodCheckInOptions {
  firestore: Firestore;
  /** Pass auth.currentUser?.uid (or your auth context's uid). */
  userId: string | null | undefined;
  fieldMap?: SessionFieldMap;
  /** Called after a mood was saved successfully. */
  onSaved?: (sessionId: string, rating: number) => void;
}

/**
 * Call `requestMoodCheckIn(sessionId, sessionType)` from your Pomodoro
 * completion handler. It is safe to call repeatedly.
 */
export function useMoodCheckIn({ firestore, userId, fieldMap = DEFAULT_FIELD_MAP, onSaved }: UseMoodCheckInOptions) {
  const guardRef = useRef(createMoodPromptGuard());
  const activeRef = useRef<string | null>(null);
  const savingRef = useRef(false);
  const mountedRef = useRef(true);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  /** Returns true only if a modal is being opened for this call. */
  const requestMoodCheckIn = useCallback(
    (sessionId: string | null | undefined, sessionType: unknown): boolean => {
      if (!shouldPromptMoodCheckIn(sessionId, sessionType, fieldMap)) return false; // breaks / unknown / no id
      if (!userId) return false; // not signed in: nothing to save to
      if (activeRef.current !== null) return false; // a prompt is already open
      if (!guardRef.current.claim(sessionId as string)) return false; // duplicate completion event
      activeRef.current = sessionId as string;
      setError(null);
      setActiveSessionId(sessionId as string);
      return true;
    },
    [fieldMap, userId],
  );

  const close = useCallback(() => {
    activeRef.current = null;
    savingRef.current = false;
    if (!mountedRef.current) return;
    setSaving(false);
    setError(null);
    setActiveSessionId(null);
  }, []);

  /** "Skip for now": closes without writing anything. */
  const skip = useCallback(() => {
    if (savingRef.current) return;
    close();
  }, [close]);

  const submit = useCallback(
    async (rating: number): Promise<void> => {
      const sessionId = activeRef.current;
      if (!sessionId || savingRef.current) return;
      savingRef.current = true;
      if (mountedRef.current) {
        setSaving(true);
        setError(null);
      }
      try {
        await saveMoodToSession({ firestore, userId, sessionId, rating, fieldMap });
        onSaved?.(sessionId, rating);
        close();
      } catch (err) {
        savingRef.current = false;
        if (!mountedRef.current) return;
        setSaving(false);
        if (err instanceof MoodCheckInError && err.code === 'already-recorded') {
          close(); // nothing left to ask
          return;
        }
        setError(err instanceof Error ? err.message : 'Could not save your mood. Please try again.');
      }
    },
    [close, fieldMap, firestore, onSaved, userId],
  );

  return {
    visible: activeSessionId !== null,
    sessionId: activeSessionId,
    saving,
    error,
    requestMoodCheckIn,
    submit,
    skip,
  };
}
