import { resolveDassError } from '../../hooks/useDassErrorMessage';

const firebaseError = (code: string) => ({ code, message: 'raw firebase text' });

describe('resolveDassError', () => {
  test.each([
    'permission-denied',
    'unavailable',
    'network-request-failed',
    'deadline-exceeded',
    'offline',
    'already-exists',
    'unauthenticated',
    'resource-exhausted',
  ])('maps firestore code %s', (code) => {
    const result = resolveDassError(firebaseError(code));
    expect(result.code).toBe(code);
    expect(result.message).not.toContain('raw firebase text');
    expect(result.message.length).toBeGreaterThan(0);
  });

  test('permission-denied is not retryable', () => {
    const r = resolveDassError(firebaseError('permission-denied'));
    expect(r.retryable).toBe(false);
    expect(r.message).toMatch(/sign in again/i);
  });

  test.each(['unavailable', 'network-request-failed', 'deadline-exceeded', 'offline'])(
    '%s is retryable with connection message',
    (code) => {
      const r = resolveDassError(firebaseError(code));
      expect(r.retryable).toBe(true);
      expect(r.message).toMatch(/connection/i);
    },
  );

  test('already-exists is not retryable', () => {
    const r = resolveDassError(firebaseError('already-exists'));
    expect(r.retryable).toBe(false);
    expect(r.message).toMatch(/already completed/i);
  });

  test('DassAlreadyTakenError maps to already-completed', () => {
    const e = new Error('DASS-21 already recorded for today');
    e.name = 'DassAlreadyTakenError';
    const r = resolveDassError(e);
    expect(r.code).toBe('already-exists');
    expect(r.retryable).toBe(false);
    expect(r.message).toMatch(/already completed/i);
  });

  test('unauthenticated is not retryable', () => {
    const r = resolveDassError(firebaseError('unauthenticated'));
    expect(r.retryable).toBe(false);
    expect(r.message).toMatch(/session expired/i);
  });

  test('resource-exhausted is retryable', () => {
    const r = resolveDassError(firebaseError('resource-exhausted'));
    expect(r.retryable).toBe(true);
    expect(r.message).toMatch(/too many attempts/i);
  });

  test('prefixed codes like firestore/permission-denied are handled', () => {
    const r = resolveDassError({ code: 'firestore/permission-denied' });
    expect(r.code).toBe('permission-denied');
    expect(r.retryable).toBe(false);
  });

  test('unknown code falls back to generic retryable message', () => {
    const r = resolveDassError(firebaseError('internal'));
    expect(r.code).toBe('internal');
    expect(r.retryable).toBe(true);
    expect(r.message).toBe('Something went wrong. Please try again.');
  });

  test('plain Error falls back to generic message', () => {
    const r = resolveDassError(new Error('boom'));
    expect(r.code).toBeNull();
    expect(r.retryable).toBe(true);
    expect(r.message).toBe('Something went wrong. Please try again.');
  });

  test('friendly string passes through as retryable', () => {
    const r = resolveDassError('We could not load your consent status. Please retry.');
    expect(r.message).toBe('We could not load your consent status. Please retry.');
    expect(r.retryable).toBe(true);
    expect(r.code).toBeNull();
  });

  test.each([null, undefined, 42, {}, { code: 123 }, { code: '' }])(
    'non-error input %p falls back to generic message',
    (input) => {
      const r = resolveDassError(input);
      expect(r.retryable).toBe(true);
      expect(r.message).toBe('Something went wrong. Please try again.');
    },
  );
});
