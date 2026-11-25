import {
  selectFocusPlayAction,
  useSessionFlowStore,
} from '@/store/sessionFlowStore';

const store = () => useSessionFlowStore.getState();

beforeEach(() => {
  store().resetAll();
});

describe('focus play action (DASS-21 gate)', () => {
  it('shows the check flow when no DASS result is done yet', () => {
    expect(selectFocusPlayAction(store())).toBe('checks');
  });

  it('starts the timer once today\'s DASS-21 check passed', () => {
    store().setDass('passed', null);
    expect(selectFocusPlayAction(store())).toBe('start');
  });

  it('keeps showing the check flow after a blocked or unknown result', () => {
    store().setDass('blocked', null);
    expect(selectFocusPlayAction(store())).toBe('checks');
    store().setDass('unknown', null);
    expect(selectFocusPlayAction(store())).toBe('checks');
  });
});
