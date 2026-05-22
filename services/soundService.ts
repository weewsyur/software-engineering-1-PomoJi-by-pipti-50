import { Platform } from 'react-native';

/**
 * Sound Service for Pomodoro app
 * Provides joyful audio feedback for key moments
 */

class SoundService {
  private audioContext: AudioContext | null = null;
  private isSupported: boolean = false;

  constructor() {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      this.isSupported = !!(window.AudioContext || (window as any).webkitAudioContext);
      if (this.isSupported) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        this.audioContext = new AudioCtx();
      }
    }
  }

  private playTone(frequency: number, duration: number, type: OscillatorType = 'sine') {
    if (!this.isSupported || !this.audioContext) return;

    try {
      const ctx = this.audioContext;
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.frequency.value = frequency;
      oscillator.type = type;

      gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + duration);
    } catch (error) {
      console.warn('Sound playback error:', error);
    }
  }

  private playMelody(notes: Array<{ freq: number; duration: number }>) {
    if (!this.isSupported || !this.audioContext) return;

    let time = 0;
    notes.forEach(({ freq, duration }) => {
      setTimeout(() => {
        this.playTone(freq, duration);
      }, time);
      time += duration * 1000;
    });
  }

  /**
   * 🟢 Focus Session Started - Energizing upbeat sound
   */
  public playSessionStart() {
    this.playMelody([
      { freq: 523.25, duration: 0.1 }, // C5
      { freq: 659.25, duration: 0.1 }, // E5
      { freq: 784, duration: 0.2 },    // G5
    ]);
  }

  /**
   * 🏁 Session Complete - Celebratory triumphant sound
   */
  public playSessionComplete() {
    this.playMelody([
      { freq: 523.25, duration: 0.1 }, // C5
      { freq: 523.25, duration: 0.1 },
      { freq: 784, duration: 0.1 },    // G5
      { freq: 784, duration: 0.1 },
      { freq: 987.77, duration: 0.4 }, // B5
    ]);
  }

  /**
   * ☕ Break Time - Soft relaxing chime
   */
  public playBreakStart() {
    this.playMelody([
      { freq: 440, duration: 0.15 },   // A4
      { freq: 554.37, duration: 0.15 }, // C#5
      { freq: 659.25, duration: 0.3 }, // E5
    ]);
  }

  /**
   * ⚠️ Focus Violation - Alert warning tone
   */
  public playFocusViolation() {
    this.playMelody([
      { freq: 800, duration: 0.1 },
      { freq: 600, duration: 0.1 },
      { freq: 800, duration: 0.1 },
      { freq: 600, duration: 0.2 },
    ]);
  }

  /**
   * 👋 Break Over - Gentle reminder
   */
  public playBreakOver() {
    this.playMelody([
      { freq: 659.25, duration: 0.15 }, // E5
      { freq: 523.25, duration: 0.15 }, // C5
      { freq: 659.25, duration: 0.3 },  // E5
    ]);
  }

  /**
   * ⭐ Milestone/Streak - Celebratory ding
   */
  public playMilestone() {
    this.playMelody([
      { freq: 659.25, duration: 0.1 },  // E5
      { freq: 784, duration: 0.1 },     // G5
      { freq: 987.77, duration: 0.1 },  // B5
      { freq: 1174.66, duration: 0.4 }, // D6
    ]);
  }

  /**
   * Generic success notification
   */
  public playSuccess() {
    this.playTone(800, 0.1, 'sine');
  }

  /**
   * Soft tick sound for timer progress
   */
  public playTick() {
    this.playTone(1000, 0.05, 'sine');
  }

  public isAudioSupported(): boolean {
    return this.isSupported;
  }
}

export const soundService = new SoundService();
