import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const TIMER_STORAGE_KEY = '@pomoji_timer_state';

export type TimerMode = 'focus' | 'short';

export interface TimerState {
  mode: TimerMode;
  timeLeft: number;
  isRunning: boolean;
  hasStarted: boolean;
  sessions: number;
  focusDurationMinutes: number;
  breakDurationMinutes: number;
  activeDurationMinutes: number | null;
  totalFocusSeconds: number;
  startTime: number | null;
  pausedAt: number | null;
  pausedAccumulated: number;
}

const MIN_DURATION_MINUTES = 1;
const MAX_DURATION_MINUTES = 180;
const DEFAULT_FOCUS_DURATION_MINUTES = 30;
const DEFAULT_BREAK_DURATION_MINUTES = 5;

const DEFAULT_STATE: TimerState = {
  mode: 'focus',
  timeLeft: DEFAULT_FOCUS_DURATION_MINUTES * 60,
  isRunning: false,
  hasStarted: false,
  sessions: 0,
  focusDurationMinutes: DEFAULT_FOCUS_DURATION_MINUTES,
  breakDurationMinutes: DEFAULT_BREAK_DURATION_MINUTES,
  activeDurationMinutes: null,
  totalFocusSeconds: 0,
  startTime: null,
  pausedAt: null,
  pausedAccumulated: 0,
};

const isValidDuration = (value: unknown): value is number =>
  typeof value === 'number' &&
  Number.isInteger(value) &&
  value >= MIN_DURATION_MINUTES &&
  value <= MAX_DURATION_MINUTES;

const isNonNegativeNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0;

const durationInSeconds = (
  mode: TimerMode,
  state: Pick<TimerState, 'focusDurationMinutes' | 'breakDurationMinutes'>,
) =>
  (mode === 'focus'
    ? state.focusDurationMinutes
    : state.breakDurationMinutes) * 60;

// Web localStorage fallback for non-native platforms
const webStorage = {
  async getItem(key: string): Promise<string | null> {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(key);
    }
    return null;
  },
  async setItem(key: string, value: string): Promise<void> {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, value);
    }
  },
  async removeItem(key: string): Promise<void> {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(key);
    }
  },
};

export function useTimerPersistence() {
  const [timerState, setTimerState] = useState<TimerState>(DEFAULT_STATE);
  const [isLoaded, setIsLoaded] = useState(false);

  const loadTimerState = useCallback(async () => {
    try {
      const storage = Platform.OS === 'web' ? webStorage : AsyncStorage;
      const savedState = await storage.getItem(TIMER_STORAGE_KEY);
      
      if (savedState) {
        const parsed = JSON.parse(savedState) as Omit<Partial<TimerState>, 'mode'> & {
          mode?: string;
          lastUpdatedAt?: unknown;
        };
        const mode: TimerMode =
          parsed.mode === 'short' || parsed.mode === 'long' ? 'short' : 'focus';
        const focusDurationMinutes = isValidDuration(parsed.focusDurationMinutes)
          ? parsed.focusDurationMinutes
          : DEFAULT_FOCUS_DURATION_MINUTES;
        const breakDurationMinutes = isValidDuration(parsed.breakDurationMinutes)
          ? parsed.breakDurationMinutes
          : DEFAULT_BREAK_DURATION_MINUTES;
        const sessions = isNonNegativeNumber(parsed.sessions)
          ? Math.floor(parsed.sessions)
          : 0;
        const hasStarted = parsed.hasStarted === true || parsed.isRunning === true;
        const state: TimerState = {
          mode,
          timeLeft: isNonNegativeNumber(parsed.timeLeft)
            ? Math.min(Math.floor(parsed.timeLeft), MAX_DURATION_MINUTES * 60)
            : durationInSeconds(mode, { focusDurationMinutes, breakDurationMinutes }),
          isRunning: parsed.isRunning === true,
          hasStarted,
          sessions,
          focusDurationMinutes,
          breakDurationMinutes,
          activeDurationMinutes: hasStarted
            ? isValidDuration(parsed.activeDurationMinutes)
              ? parsed.activeDurationMinutes
              : mode === 'focus'
                ? focusDurationMinutes
                : breakDurationMinutes
            : null,
          totalFocusSeconds: isNonNegativeNumber(parsed.totalFocusSeconds)
            ? Math.floor(parsed.totalFocusSeconds)
            : sessions * 25 * 60,
          startTime: isNonNegativeNumber(parsed.startTime) ? parsed.startTime : null,
          pausedAt: isNonNegativeNumber(parsed.pausedAt) ? parsed.pausedAt : null,
          pausedAccumulated: isNonNegativeNumber(parsed.pausedAccumulated)
            ? parsed.pausedAccumulated
            : 0,
        };

        if (state.isRunning && isNonNegativeNumber(parsed.lastUpdatedAt)) {
          const elapsed = Math.max(
            0,
            Math.floor((Date.now() - parsed.lastUpdatedAt) / 1000),
          );
          state.timeLeft = Math.max(0, state.timeLeft - elapsed);
        }

        if (state.isRunning && state.timeLeft === 0) {
          state.isRunning = false;
          state.hasStarted = false;
          state.timeLeft = durationInSeconds(state.mode, state);
          state.startTime = null;
          state.pausedAt = null;
          state.pausedAccumulated = 0;
        } else if (!state.hasStarted && !state.isRunning) {
          state.timeLeft = durationInSeconds(state.mode, state);
        }

        setTimerState(state);
      }
    } catch (error) {
      console.error('Failed to load timer state:', error);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  const saveTimerState = useCallback(async (state: TimerState) => {
    try {
      const storage = Platform.OS === 'web' ? webStorage : AsyncStorage;
      await storage.setItem(
        TIMER_STORAGE_KEY,
        JSON.stringify({ ...state, lastUpdatedAt: Date.now() }),
      );
    } catch (error) {
      console.error('Failed to save timer state:', error);
    }
  }, []);

  // Load timer state from storage on mount
  useEffect(() => {
    loadTimerState();
  }, [loadTimerState]);

  // Save timer state whenever it changes
  useEffect(() => {
    if (isLoaded) {
      saveTimerState(timerState);
    }
  }, [timerState, isLoaded, saveTimerState]);

  const updateTimerState = useCallback((updates: Partial<TimerState>) => {
    setTimerState(prev => ({ ...prev, ...updates }));
  }, []);

  const resetTimerState = useCallback(() => {
    setTimerState(DEFAULT_STATE);
  }, []);

  const clearTimerState = useCallback(async () => {
    try {
      const storage = Platform.OS === 'web' ? webStorage : AsyncStorage;
      await storage.removeItem(TIMER_STORAGE_KEY);
      setTimerState(DEFAULT_STATE);
    } catch (error) {
      console.error('Failed to clear timer state:', error);
    }
  }, []);

  return {
    timerState,
    isLoaded,
    updateTimerState,
    resetTimerState,
    clearTimerState,
  };
}
