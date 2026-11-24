import { create } from 'zustand';
import type { CauseId } from '@/constants/sessionFlow';
import type { StoredDassResult } from '@/services/dassService';
import { getLocalDateString } from '@/utils/localDate';

/**
 * Pre-session flow state. Intentionally NOT persisted: a page reload / direct URL
 * on web starts with an empty store, so the timer guard sends the student back
 * through the checks.
 */
type DassStatus = 'unknown' | 'passed' | 'blocked';

interface SessionFlowState {
  dassStatus: DassStatus;
  dassDate: string | null; // local date the status was confirmed from the server
  dassResult: StoredDassResult | null;
  dassRevision: number;

  beforeCheckDone: boolean;
  beforeMood: number | null;
  distractions: string[];
  causeCategory: CauseId | null;

  setDass: (status: DassStatus, result: StoredDassResult | null) => void;
  clearDass: () => void;
  completeBeforeCheck: (p: { beforeMood: number; distractions: string[]; causeCategory: CauseId }) => void;
  /** Call after a session ends or is abandoned: next session needs a fresh mood check. */
  resetBeforeCheck: () => void;
  resetAll: () => void;
}

const emptyBefore = {
  beforeCheckDone: false,
  beforeMood: null,
  distractions: [] as string[],
  causeCategory: null,
};

export const useSessionFlowStore = create<SessionFlowState>((set) => ({
  dassStatus: 'unknown',
  dassDate: null,
  dassResult: null,
  dassRevision: 0,
  ...emptyBefore,

  setDass: (status, result) =>
    set({ dassStatus: status, dassDate: status === 'unknown' ? null : getLocalDateString(), dassResult: result }),

  clearDass: () =>
    set((state) => ({
      dassStatus: 'unknown',
      dassDate: null,
      dassResult: null,
      dassRevision: state.dassRevision + 1,
    })),

  completeBeforeCheck: ({ beforeMood, distractions, causeCategory }) =>
    set({ beforeCheckDone: true, beforeMood, distractions, causeCategory }),

  resetBeforeCheck: () => set({ ...emptyBefore }),

  resetAll: () => set({ dassStatus: 'unknown', dassDate: null, dassResult: null, ...emptyBefore }),
}));

export const selectDassPassedToday = (s: SessionFlowState) =>
  s.dassStatus === 'passed' && s.dassDate === getLocalDateString();

export const selectReadyToStart = (s: SessionFlowState) =>
  selectDassPassedToday(s) && s.beforeCheckDone && s.beforeMood !== null && s.causeCategory !== null;

export type FocusPlayAction = 'start' | 'checks';

/** Play-button decision in Focus mode: 'start' once today's checks are done. */
export const selectFocusPlayAction = (s: SessionFlowState): FocusPlayAction =>
  selectReadyToStart(s) ? 'start' : 'checks';

/** Fields to merge into the session document when a session is saved.
 *  Nulls are omitted so Firestore rules (which reject null before_mood) pass. */
export function getBeforeSessionPayload() {
  const s = useSessionFlowStore.getState();
  return {
    ...(s.beforeMood !== null ? { before_mood: s.beforeMood } : {}),
    distractions: s.distractions,
    ...(s.causeCategory !== null ? { cause_category: s.causeCategory } : {}),
  };
}
