// ─── app/components/RealTimeStreakCard.tsx ─────────────────────────────────────
// Example component demonstrating real-time Firestore integration
// Automatically fetches and updates streak data from Firestore

import React, { useMemo } from 'react';
import { useStreak } from '@/hooks/useFirestore';
import { StreakCard } from './StreakCard';
import { StreakData as LocalStreakData } from '@/utils/streakCalculator';
import { FirestoreStreakData } from '@/services/firebase/firestore';

interface RealTimeStreakCardProps {
  userId: string;
  streakUnit?: string;
}

/**
 * Convert Firestore streak data to local StreakData format
 */
const convertToLocalStreakData = (
  firestoreData: FirestoreStreakData | null
): LocalStreakData | null => {
  if (!firestoreData) return null;

  return {
    currentStreak: firestoreData.currentStreak,
    lastActiveDate: firestoreData.lastActivityDate
      ? new Date(firestoreData.lastActivityDate.toMillis())
      : null,
    highestStreak: firestoreData.longestStreak,
  };
};

/**
 * Real-time Streak Card Component
 * 
 * This component demonstrates:
 * 1. Using the useStreak hook for real-time data
 * 2. Automatic loading and error states
 * 3. Automatic cleanup on unmount
 * 4. Converting Firestore data to local format
 * 5. Passing real-time data to existing components
 * 
 * Usage:
 * <RealTimeStreakCard userId="user-123" />
 */
export const RealTimeStreakCard: React.FC<RealTimeStreakCardProps> = ({
  userId,
  streakUnit = 'Days',
}) => {
  // Real-time subscription to user's streak data
  const { streakData, loading, error } = useStreak(userId);

  // Convert Firestore data to local format
  const localStreakData = useMemo(() =>
    convertToLocalStreakData(streakData),
    [streakData]
  );

  return (
    <StreakCard
      streakData={localStreakData}
      loading={loading}
      error={error}
      streakUnit={streakUnit}
    />
  );
};

export default RealTimeStreakCard;
