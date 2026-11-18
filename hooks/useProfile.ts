import { useState, useEffect, useCallback } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db } from "@/services/firebase";
import { useAuth } from "@/contexts/AuthContext";
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
  generateUsername,
  UserNameFields,
} from "@/utils/userName";

export const useProfile = () => {
  const [profile, setProfile] = useState<UserProfile>({
    ...EMPTY_USER_NAME_FIELDS,
    fullName: "",
    displayName: "",
    username: "",
    email: "",
    photoUri: null,
  });
  const [loadingProfile, setLoadingProfile] = useState(true);

  useEffect(() => {
    let cancelled = false;
    let requestId = 0;

    const loadProfile = async (userId: string | undefined) => {
      const currentRequestId = ++requestId;
      if (!userId) {
        if (!cancelled && currentRequestId === requestId) {
          setProfile({
            ...EMPTY_USER_NAME_FIELDS,
            fullName: "",
            displayName: "",
            username: "",
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
        if (
          data &&
          !cancelled &&
          currentRequestId === requestId &&
          auth.currentUser?.uid === userId
        ) {
          const freshPhotoUri = await getProfileImageURL(data.photoUri);
          if (
            !cancelled &&
            currentRequestId === requestId &&
            auth.currentUser?.uid === userId
          ) {
            setProfile({ ...data, photoUri: freshPhotoUri });
          }
        }
      } catch (error) {
        if (!cancelled && currentRequestId === requestId) {
          console.error("Failed to load profile:", error);
        }
      } finally {
        if (!cancelled && currentRequestId === requestId) {
          setLoadingProfile(false);
        }
      }
    };

    let unsubscribeProfile: (() => void) | undefined;
    let activeUserId: string | null = null;
    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      unsubscribeProfile?.();
      const nextUserId = user?.uid ?? null;
      if (activeUserId !== nextUserId) {
        activeUserId = nextUserId;
        setProfile({
          ...EMPTY_USER_NAME_FIELDS,
          fullName: "",
          displayName: "",
          username: "",
          email: "",
          photoUri: null,
        });
      }
      if (!user) {
        loadProfile(undefined);
        return;
      }

      unsubscribeProfile = onSnapshot(
        doc(db, "users", user.uid),
        () => loadProfile(user.uid),
        (error) => {
          console.error("Failed to listen for profile updates:", error);
          if (!cancelled) setLoadingProfile(false);
        },
      );
    });

    return () => {
      cancelled = true;
      unsubscribeProfile?.();
      unsubscribeAuth();
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
  const { refreshUser } = useAuth();
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
      const displayName = formatUserName(nameFields);
      const username = generateUsername(nameFields);
      const updates: UserNameFields & {
        displayName: string;
        username: string;
        photoUrl?: string | null;
      } = {
        ...nameFields,
        displayName,
        username,
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
      refreshUser();

      return {
        ...nameFields,
        fullName: displayName,
        displayName,
        username,
        email: currentUser.email || "",
        photoUri: nextPhotoUri,
      };
    },
    [refreshUser]
  );

  return { updateProfile };
};
