import { useEffect, useState, useCallback, useRef } from 'react';
import { Platform } from 'react-native';

interface FocusModeConfig {
  enabled: boolean;
  invalidateOnTabSwitch: boolean;
  invalidateOnMinimize: boolean;
  invalidateOnVisibilityChange: boolean;
  warningThreshold: number; // seconds before invalidation
}

interface FocusModeState {
  isActive: boolean;
  isFocused: boolean;
  violations: number;
  lastViolationTime: number | null;
  warningActive: boolean;
}

const DEFAULT_CONFIG: FocusModeConfig = {
  enabled: true,
  invalidateOnTabSwitch: true,
  invalidateOnMinimize: true,
  invalidateOnVisibilityChange: true,
  warningThreshold: 5,
};

export function useStrictFocusMode(config: Partial<FocusModeConfig> = {}) {
  const fullConfig = { ...DEFAULT_CONFIG, ...config };
  const [state, setState] = useState<FocusModeState>({
    isActive: false,
    isFocused: true,
    violations: 0,
    lastViolationTime: null,
    warningActive: false,
  });

  const warningTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const focusStartTimeRef = useRef<number | null>(null);
  const onFocusInvalidatedRef = useRef<(() => void) | null>(null);

  // Register callback for focus invalidation
  const onFocusInvalidated = useCallback((callback: () => void) => {
    onFocusInvalidatedRef.current = callback;
  }, []);

  // Start focus mode
  const startFocusMode = useCallback(() => {
    setState(prev => ({
      ...prev,
      isActive: true,
      isFocused: true,
      violations: 0,
      lastViolationTime: null,
    }));
    focusStartTimeRef.current = Date.now();
  }, []);

  // Stop focus mode
  const stopFocusMode = useCallback(() => {
    setState(prev => ({
      ...prev,
      isActive: false,
      isFocused: true,
      warningActive: false,
    }));
    focusStartTimeRef.current = null;
    if (warningTimeoutRef.current) {
      clearTimeout(warningTimeoutRef.current);
      warningTimeoutRef.current = null;
    }
  }, []);

  // Handle visibility change (Page Visibility API)
  useEffect(() => {
    if (Platform.OS !== 'web' || !fullConfig.enabled) return;

    const handleVisibilityChange = () => {
      const isHidden = document.hidden;
      
      setState(prev => ({
        ...prev,
        isFocused: !isHidden,
      }));

      if (state.isActive && isHidden && fullConfig.invalidateOnVisibilityChange) {
        // Show warning before invalidating
        setState(prev => ({ ...prev, warningActive: true }));
        
        if (warningTimeoutRef.current) {
          clearTimeout(warningTimeoutRef.current);
        }

        warningTimeoutRef.current = setTimeout(() => {
          setState(prev => ({
            ...prev,
            violations: prev.violations + 1,
            lastViolationTime: Date.now(),
            warningActive: false,
          }));

          if (onFocusInvalidatedRef.current) {
            onFocusInvalidatedRef.current();
          }
        }, fullConfig.warningThreshold * 1000);
      } else if (!isHidden && warningTimeoutRef.current) {
        // User returned before threshold - cancel invalidation
        clearTimeout(warningTimeoutRef.current);
        warningTimeoutRef.current = null;
        setState(prev => ({ ...prev, warningActive: false }));
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleVisibilityChange);
    window.addEventListener('focus', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleVisibilityChange);
      window.removeEventListener('focus', handleVisibilityChange);
      if (warningTimeoutRef.current) {
        clearTimeout(warningTimeoutRef.current);
      }
    };
  }, [state.isActive, fullConfig]);

  // Handle window resize (minimize detection)
  useEffect(() => {
    if (Platform.OS !== 'web' || !fullConfig.enabled || !fullConfig.invalidateOnMinimize) return;

    let previousWidth = window.innerWidth;
    let previousHeight = window.innerHeight;

    const handleResize = () => {
      const currentWidth = window.innerWidth;
      const currentHeight = window.innerHeight;

      // Detect minimize (significant size reduction)
      if (state.isActive && 
          (currentWidth < 100 || currentHeight < 100) &&
          (previousWidth > 100 && previousHeight > 100)) {
        
        setState(prev => ({
          ...prev,
          violations: prev.violations + 1,
          lastViolationTime: Date.now(),
        }));

        if (onFocusInvalidatedRef.current) {
          onFocusInvalidatedRef.current();
        }
      }

      previousWidth = currentWidth;
      previousHeight = currentHeight;
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [state.isActive, fullConfig]);

  // Get focus session duration
  const getFocusDuration = useCallback(() => {
    if (!focusStartTimeRef.current) return 0;
    return Date.now() - focusStartTimeRef.current;
  }, []);

  // Reset violations
  const resetViolations = useCallback(() => {
    setState(prev => ({
      ...prev,
      violations: 0,
      lastViolationTime: null,
    }));
  }, []);

  return {
    state,
    startFocusMode,
    stopFocusMode,
    onFocusInvalidated,
    getFocusDuration,
    resetViolations,
  };
}
