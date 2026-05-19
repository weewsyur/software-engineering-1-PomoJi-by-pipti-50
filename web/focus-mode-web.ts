export type FocusEventType = 'focus-gained' | 'focus-lost' | 'tab-hidden' | 'tab-visible';

export interface FocusState {
  isFocused: boolean;
  isTabVisible: boolean;
  lastFocusLossTime?: number;
}

export class FocusMode {
  private static state: FocusState = {
    isFocused: true,
    isTabVisible: true,
  };

  private static listeners: Map<FocusEventType, Set<(state: FocusState) => void>> = new Map(
    [
      ['focus-gained', new Set()],
      ['focus-lost', new Set()],
      ['tab-hidden', new Set()],
      ['tab-visible', new Set()],
    ]
  );

  private static initialized = false;

  static initialize(): void {
    if (this.initialized) return;

    if (typeof window === 'undefined') return;

    // Page Visibility API
    document.addEventListener('visibilitychange', () => {
      this.state.isTabVisible = !document.hidden;
      this.notifyListeners(document.hidden ? 'tab-hidden' : 'tab-visible');
    });

    // Window Focus/Blur events
    window.addEventListener('focus', () => {
      this.state.isFocused = true;
      this.notifyListeners('focus-gained');
    });

    window.addEventListener('blur', () => {
      this.state.isFocused = false;
      this.state.lastFocusLossTime = Date.now();
      this.notifyListeners('focus-lost');
    });

    this.initialized = true;
    console.log('✓ Focus mode initialized');
  }

  private static notifyListeners(eventType: FocusEventType): void {
    const listeners = this.listeners.get(eventType);
    if (listeners) {
      listeners.forEach((callback) => {
        try {
          callback(this.state);
        } catch (error) {
          console.error(`Error in focus listener (${eventType}):`, error);
        }
      });
    }
  }

  static on(eventType: FocusEventType, callback: (state: FocusState) => void): () => void {
    const listeners = this.listeners.get(eventType);
    if (listeners) {
      listeners.add(callback);
    }

    return () => {
      listeners?.delete(callback);
    };
  }

  static getState(): FocusState {
    return { ...this.state };
  }

  static isFocused(): boolean {
    if (typeof window === 'undefined') return false;
    return this.state.isFocused && this.state.isTabVisible;
  }

  static isTabVisible(): boolean {
    if (typeof window === 'undefined') return false;
    return this.state.isTabVisible;
  }

  static hasLostFocusRecently(thresholdMs: number = 5000): boolean {
    if (!this.state.lastFocusLossTime) return false;
    return Date.now() - this.state.lastFocusLossTime < thresholdMs;
  }

  static markSessionInterrupted(): boolean {
    return !this.isFocused();
  }
}

// Auto-initialize on import
if (typeof window !== 'undefined') {
  FocusMode.initialize();
}
