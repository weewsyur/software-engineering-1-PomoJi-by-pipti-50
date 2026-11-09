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
import {
  EMPTY_USER_NAME_FIELDS,
  formatUserName,
  getPublicUsername,
  UserNameFields,
} from "@/utils/userName";

export const useProfile = () => {
  const [profile, setProfile] = useState<UserProfile>({
    ...EMPTY_USER_NAME_FIELDS,
    name: "",
    email: "",
    photoUri: null,
  });
  const [loadingProfile, setLoadingProfile] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const loadProfile = async (userId: string | undefined) => {
      if (!userId) {
        if (!cancelled) {
          setProfile({
            ...EMPTY_USER_NAME_FIELDS,
            name: "",
            email: "",
            photoUri: null,
          });
          setLoadingProfile(false);
        }
        return;
      }

      setLoadingProfile(true);
      try {
        const data = await fetchUserProfile(userId);
        if (data && !cancelled) {
          const freshPhotoUri = await getProfileImageURL(data.photoUri);
          setProfile({ ...data, photoUri: freshPhotoUri });
        }
      } catch {
        // Error handling is done in service layer
      } finally {
        if (!cancelled) setLoadingProfile(false);
      }
    };

    const unsubscribe = auth.onAuthStateChanged((user) => {
      loadProfile(user?.uid);
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
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
    let cancelled = false;

    const loadStats = async (userId: string | undefined) => {
      if (!userId) {
        if (!cancelled) setLoadingStats(false);
        return;
      }

      setLoadingStats(true);
      try {
        const data = await fetchUserStats(userId);
        if (!cancelled) setStats(data);
      } catch {
        // Error handling is done in service layer
      } finally {
        if (!cancelled) setLoadingStats(false);
      }
    };

    const unsubscribe = auth.onAuthStateChanged((user) => {
      loadStats(user?.uid);
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
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
    async (
      nameFields: UserNameFields,
      photoUri: string | null,
      currentPhotoUri: string | null,
    ) => {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error("User not authenticated");
      }

      const userId = currentUser.uid;
      if (!nameFields.firstName?.trim() || !nameFields.lastName?.trim()) {
        throw new Error("First name and last name are required.");
      }
      let nextPhotoUri = currentPhotoUri;
      const displayName = getPublicUsername(
        formatUserName(nameFields),
        currentUser.email,
      );
      const updates: UserNameFields & {
        username: string;
        photoUrl?: string | null;
      } = {
        ...nameFields,
        username: displayName,
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
      const authPhotoUrl = nextPhotoUri
        ? await getProfileImageURL(nextPhotoUri)
        : null;
      await updateFirebaseUserProfile(displayName, authPhotoUrl);

      return { ...nameFields, name: displayName, photoUri: nextPhotoUri };
    },
    []
  );

  return { updateProfile };
};
