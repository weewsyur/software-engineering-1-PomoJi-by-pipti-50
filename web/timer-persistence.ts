import AsyncStorage from '@react-native-async-storage/async-storage';

export type TimerMode = 'focus' | 'short' | 'long';

export interface TimerState {
  mode: TimerMode;
  timeLeft: number;
  isRunning: boolean;
  hasStarted: boolean;
  sessions: number;
  streakCount: number;
  startTime?: number;
  pausedTime?: number;
  sessionStartTime?: number;
  pausedAccumulatedMs?: number;
}

const STORAGE_KEY = '@pomoji_timer_state';
const TIMER_DURATION = {
  focus: 25 * 60, // 25 minutes
  short: 5 * 60, // 5 minutes
  long: 15 * 60, // 15 minutes
};

export class TimerPersistence {
  static async saveState(state: TimerState): Promise<void> {
    try {
      const timestamp = Date.now();
      const stateWithTimestamp = {
        ...state,
        lastSaved: timestamp,
      };

      // Use both AsyncStorage (for React Native) and localStorage (for web)
      const serialized = JSON.stringify(stateWithTimestamp);

      if (typeof window !== 'undefined' && window.localStorage) {
        try {
          localStorage.setItem(STORAGE_KEY, serialized);
        } catch (e) {
          console.warn('localStorage unavailable:', e);
        }
      }

      try {
        await AsyncStorage.setItem(STORAGE_KEY, serialized);
      } catch (e) {
        console.warn('AsyncStorage unavailable:', e);
      }
    } catch (error) {
      console.error('Failed to save timer state:', error);
    }
  }

  static async loadState(): Promise<TimerState | null> {
    try {
      let serialized: string | null = null;

      // Try localStorage first (web)
      if (typeof window !== 'undefined' && window.localStorage) {
        try {
          serialized = localStorage.getItem(STORAGE_KEY);
        } catch (e) {
          console.warn('localStorage error:', e);
        }
      }

      // Fallback to AsyncStorage (React Native)
      if (!serialized) {
        try {
          serialized = await AsyncStorage.getItem(STORAGE_KEY);
        } catch (e) {
          console.warn('AsyncStorage error:', e);
        }
      }

      if (!serialized) return null;

      const saved = JSON.parse(serialized) as TimerState & { lastSaved: number };

      // Validate and recover timer state
      return TimerPersistence.recoverTimerState(saved);
    } catch (error) {
      console.error('Failed to load timer state:', error);
      return null;
    }
  }

  static recoverTimerState(saved: TimerState & { lastSaved: number }): TimerState {
    if (!saved.isRunning) {
      return {
        mode: saved.mode,
        timeLeft: saved.timeLeft,
        isRunning: false,
        hasStarted: saved.hasStarted,
        sessions: saved.sessions,
        streakCount: saved.streakCount,
      };
    }

    // Timer was running - calculate current time
    const elapsed = Date.now() - saved.lastSaved;
    const maxDuration = TIMER_DURATION[saved.mode];
    let timeLeft = Math.max(saved.timeLeft - Math.floor(elapsed / 1000), 0);

    // If more time passed than remaining, session finished
    if (timeLeft === 0) {
      return {
        mode: saved.mode,
        timeLeft: 0,
        isRunning: false,
        hasStarted: false,
        sessions: saved.mode === 'focus' ? saved.sessions + 1 : saved.sessions,
        streakCount:
          saved.mode === 'focus'
            ? saved.streakCount + 1
            : saved.streakCount % 4 === 0
              ? 0
              : saved.streakCount,
      };
    }

    return {
      mode: saved.mode,
      timeLeft,
      isRunning: true,
      hasStarted: saved.hasStarted,
      sessions: saved.sessions,
      streakCount: saved.streakCount,
    };
  }

  static async clearState(): Promise<void> {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        try {
          localStorage.removeItem(STORAGE_KEY);
        } catch (e) {
          console.warn('localStorage error:', e);
        }
      }

      try {
        await AsyncStorage.removeItem(STORAGE_KEY);
      } catch (e) {
        console.warn('AsyncStorage error:', e);
      }
    } catch (error) {
      console.error('Failed to clear timer state:', error);
    }
  }

  static calculateTimeLeft(
    startTime: number,
    pausedTime: number,
    isRunning: boolean,
    maxDuration: number
  ): number {
    if (!isRunning) {
      return pausedTime;
    }

    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    const timeLeft = maxDuration - elapsed;

    return Math.max(timeLeft, 0);
  }
}
