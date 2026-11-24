/**
 * Old session documents do not have the new fields. Run every session you read
 * through this so the UI never crashes on missing data.
 */
export interface BeforeSessionFields {
  before_mood: number | null;
  distractions: string[];
  cause_category: string | null;
}

export function withBeforeSessionDefaults<T extends object>(session: T): T & BeforeSessionFields {
  const s = session as Partial<BeforeSessionFields>;
  return {
    ...session,
    before_mood: typeof s.before_mood === 'number' ? s.before_mood : null,
    distractions: Array.isArray(s.distractions) ? s.distractions : [],
    cause_category: typeof s.cause_category === 'string' ? s.cause_category : null,
  };
}
