import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const TIMER_STORAGE_KEY = '@pomoji_timer_state';

interface TimerState {
  mode: 'focus' | 'short' | 'long';
  timeLeft: number;
  isRunning: boolean;
  hasStarted: boolean;
  sessions: number;
  streakCount: number;
  startTime: number | null;
  pausedAt: number | null;
  pausedAccumulated: number;
}

const DEFAULT_STATE: TimerState = {
  mode: 'focus',
  timeLeft: 25 * 60,
  isRunning: false,
  hasStarted: false,
  sessions: 0,
  streakCount: 0,
  startTime: null,
  pausedAt: null,
  pausedAccumulated: 0,
};

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

  // Load timer state from storage on mount
  useEffect(() => {
    loadTimerState();
  }, []);

  // Save timer state whenever it changes
  useEffect(() => {
    if (isLoaded) {
      saveTimerState(timerState);
    }
  }, [timerState, isLoaded]);

  const loadTimerState = useCallback(async () => {
    try {
      const storage = Platform.OS === 'web' ? webStorage : AsyncStorage;
      const savedState = await storage.getItem(TIMER_STORAGE_KEY);
      
      if (savedState) {
        const parsed = JSON.parse(savedState);
        
        // Calculate elapsed time if timer was running
        if (parsed.isRunning && parsed.startTime) {
          const now = Date.now();
          const elapsed = Math.floor((now - parsed.startTime - parsed.pausedAccumulated) / 1000);
          const newTimeLeft = Math.max(0, parsed.timeLeft - elapsed);
          
          // If timer finished while app was closed
          if (newTimeLeft === 0) {
            parsed.isRunning = false;
            parsed.hasStarted = false;
            parsed.timeLeft = parsed.mode === 'focus' ? 25 * 60 : 
                            parsed.mode === 'short' ? 5 * 60 : 15 * 60;
            parsed.startTime = null;
            parsed.pausedAt = null;
            parsed.pausedAccumulated = 0;
          } else {
            parsed.timeLeft = newTimeLeft;
          }
        }
        
        setTimerState(parsed);
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
      await storage.setItem(TIMER_STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.error('Failed to save timer state:', error);
    }
  }, []);

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
