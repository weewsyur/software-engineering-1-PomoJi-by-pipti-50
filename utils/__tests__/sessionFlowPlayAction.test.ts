import {
  selectFocusPlayAction,
  useSessionFlowStore,
} from '@/store/sessionFlowStore';

const store = () => useSessionFlowStore.getState();

const completePreSessionChecks = () => {
  store().setDass('passed', null);
  store().completeBeforeCheck({
    beforeMood: 4,
    distractions: [],
    causeCategory: 'none',
  });
};

beforeEach(() => {
  store().resetAll();
});

describe('focus play action (pre-session check gate)', () => {
  it('shows the check flow when no checks are done yet', () => {
    expect(selectFocusPlayAction(store())).toBe('checks');
  });

  it('starts the timer once DASS passed and the before-check is done', () => {
    completePreSessionChecks();
    expect(selectFocusPlayAction(store())).toBe('start');
  });

  it('does not re-show the check after it was completed for this session start', () => {
    completePreSessionChecks();
    // Simulates pressing play again after "Start session" navigated back:
    // the completed flag must survive, so the timer starts directly.
    expect(selectFocusPlayAction(store())).toBe('start');
  });

  it('requires the checks again after the session ends or is reset', () => {
    completePreSessionChecks();
    store().resetBeforeCheck();
    expect(selectFocusPlayAction(store())).toBe('checks');
  });

  it('still requires the checks when the before-check is done but DASS is not passed today', () => {
    store().completeBeforeCheck({
      beforeMood: 4,
      distractions: [],
      causeCategory: 'none',
    });
    expect(selectFocusPlayAction(store())).toBe('checks'); // dassStatus 'unknown'
    store().setDass('blocked', null);
    expect(selectFocusPlayAction(store())).toBe('checks');
  });
});
