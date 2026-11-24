import { useCallback, useState } from 'react';

/**
 * Maps thrown DASS-21 errors to student-safe messages. Raw Firebase codes and
 * error text never reach the UI; in dev builds only the code is logged.
 */

export interface DassErrorInfo {
  message: string;
  code: string | null;
  retryable: boolean;
}

type MessageKind =
  | 'permissionDenied'
  | 'network'
  | 'alreadyCompleted'
  | 'sessionExpired'
  | 'rateLimited'
  | 'generic';

const DASS_ERROR_MESSAGES: Record<MessageKind, { message: string; retryable: boolean }> = {
  permissionDenied: {
    message:
      "We couldn't save your result. Please sign in again and try once more. If it keeps happening, contact support.",
    retryable: false,
  },
  network: {
    message: 'No connection. Connect to the internet and try again.',
    retryable: true,
  },
  alreadyCompleted: {
    message: "You already completed today's check. Your result is saved.",
    retryable: false,
  },
  sessionExpired: {
    message: 'Your session expired. Please sign in again.',
    retryable: false,
  },
  rateLimited: {
    message: 'Too many attempts. Wait a moment and try again.',
    retryable: true,
  },
  generic: {
    message: 'Something went wrong. Please try again.',
    retryable: true,
  },
};

const CODE_TO_KIND: Record<string, MessageKind> = {
  'permission-denied': 'permissionDenied',
  unavailable: 'network',
  'network-request-failed': 'network',
  'deadline-exceeded': 'network',
  offline: 'network',
  'already-exists': 'alreadyCompleted',
  unauthenticated: 'sessionExpired',
  'resource-exhausted': 'rateLimited',
};

function isDassAlreadyTaken(e: unknown): boolean {
  return e instanceof Error && e.name === 'DassAlreadyTakenError';
}

function extractCode(e: unknown): string | null {
  if (!e || typeof e !== 'object' || !('code' in e)) return null;
  const raw = (e as { code?: unknown }).code;
  if (typeof raw !== 'string' || raw.length === 0) return null;
  // SDKs sometimes prefix codes, e.g. "firestore/permission-denied".
  const code = raw.slice(raw.lastIndexOf('/') + 1);
  return code.length > 0 ? code : null;
}

/** Pure resolver — safe to unit test without React. */
export function resolveDassError(e: unknown): DassErrorInfo {
  // Caller-provided friendly strings pass through unchanged.
  if (typeof e === 'string' && e.length > 0) {
    return { message: e, code: null, retryable: true };
  }
  const code = extractCode(e);
  const kind: MessageKind =
    (code ? CODE_TO_KIND[code] : undefined) ??
    (isDassAlreadyTaken(e) ? 'alreadyCompleted' : 'generic');
  const mapped = DASS_ERROR_MESSAGES[kind];
  return {
    message: mapped.message,
    code: code ?? (kind === 'alreadyCompleted' ? 'already-exists' : null),
    retryable: mapped.retryable,
  };
}

export function useDassErrorMessage() {
  const [info, setInfo] = useState<DassErrorInfo | null>(null);

  const setError = useCallback((e: unknown) => {
    const resolved = resolveDassError(e);
    if ((globalThis as { __DEV__?: boolean }).__DEV__) {
      // Dev only: log the code, never the payload or answers.
      console.warn('[dass] error code:', resolved.code ?? 'unknown');
    }
    setInfo(resolved);
  }, []);

  const clearError = useCallback(() => setInfo(null), []);

  return {
    message: info?.message ?? null,
    code: info?.code ?? null,
    retryable: info?.retryable ?? false,
    setError,
    clearError,
  };
}
