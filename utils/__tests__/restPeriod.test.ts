import { formatRestCountdown, restRemainingSeconds, timestampToMillis } from '../restPeriod';

describe('restPeriod helpers', () => {
  it('converts Firestore-like timestamps to millis', () => {
    expect(timestampToMillis({ toMillis: () => 1234 })).toBe(1234);
    expect(timestampToMillis(new Date('2026-01-01T00:00:00Z'))).toBe(Date.parse('2026-01-01T00:00:00Z'));
    expect(timestampToMillis('not-a-date')).toBeNull();
  });

  it('calculates remaining seconds from the saved end timestamp', () => {
    const end = Date.now() + 90_000;
    expect(restRemainingSeconds(end, end - 30_000)).toBe(30);
    expect(restRemainingSeconds(end, end + 1)).toBe(0);
  });

  it('formats countdowns with and without hours', () => {
    expect(formatRestCountdown(65)).toBe('01:05');
    expect(formatRestCountdown(3661)).toBe('1:01:01');
  });
});
