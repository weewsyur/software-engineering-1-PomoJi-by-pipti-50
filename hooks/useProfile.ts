import { useState, useEffect, useCallback } from "react";
import { auth } from "@/services/firebase";
import {
  fetchUserProfile,
  fetchUserStats,
  fetchConnections,
  updateProfileData,
  updateFirebaseUserProfile,
  uploadProfileImage,
  getProfileImageURL,
  UserProfile,
  UserStats,
  UserListItem,
} from "@/services/profile";

export const useProfile = () => {
  const [profile, setProfile] = useState<UserProfile>({
    name: "Your Name",
    email: "your@email.com",
    photoUri: null,
  });
  const [loadingProfile, setLoadingProfile] = useState(true);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const userId = auth.currentUser?.uid;
        if (!userId) {
          setLoadingProfile(false);
          return;
        }
        const data = await fetchUserProfile(userId);
        if (data) {
          setProfile(data);
        }
      } catch {
        // Error handling is done in service layer
      } finally {
        setLoadingProfile(false);
      }
    };

    loadProfile();
  }, []);

  return { profile, loadingProfile, setProfile };
};

export const useProfileStats = () => {
  const [stats, setStats] = useState<UserStats>({
    totalHours: 0,
    sessions: 0,
    streakDays: 0,
    following: 0,
    followers: 0,
  });
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const userId = auth.currentUser?.uid;
        if (!userId) {
          setLoadingStats(false);
          return;
        }
        const data = await fetchUserStats(userId);
        setStats(data);
      } catch {
        // Error handling is done in service layer
      } finally {
        setLoadingStats(false);
      }
    };

    loadStats();
  }, []);

  return { stats, loadingStats };
};

export const useConnections = () => {
  const [connectionsList, setConnectionsList] = useState<UserListItem[]>([]);
  const [loadingConnections, setLoadingConnections] = useState(false);

  const loadConnections = useCallback(async (type: "Following" | "Followers") => {
    const userId = auth.currentUser?.uid;
    if (!userId) return;

    setLoadingConnections(true);
    try {
      const data = await fetchConnections(userId, type);
      setConnectionsList(data);
    } catch {
      // Error handling is done in service layer
    } finally {
      setLoadingConnections(false);
    }
  }, []);

  return { connectionsList, loadingConnections, loadConnections };
};

export const useProfileUpdate = () => {
  const updateProfile = useCallback(
    async (username: string, photoUri: string | null, currentPhotoUri: string | null) => {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error("User not authenticated");
      }

      const userId = currentUser.uid;
      let nextPhotoUri = currentPhotoUri;
      const updates: { username: string; photoUrl?: string | null } = {
        username: username.trim(),
      };

      if (photoUri !== currentPhotoUri) {
        if (photoUri) {
          nextPhotoUri = await uploadProfileImage(userId, photoUri);
          updates.photoUrl = nextPhotoUri;
        } else {
          nextPhotoUri = null;
          updates.photoUrl = null;
        }
      }

      await updateProfileData(userId, updates);
      await updateFirebaseUserProfile(username.trim(), nextPhotoUri ?? null);

      return { name: username.trim(), photoUri: nextPhotoUri };
    },
    []
  );

  return { updateProfile };
};
