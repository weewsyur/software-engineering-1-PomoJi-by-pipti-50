import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  where,
  writeBatch,
} from "firebase/firestore";
import { ref, uploadString } from "firebase/storage";
import { updateProfile as updateFirebaseProfile } from "firebase/auth";
import { auth, db, storage } from "./firebase";
import * as FileSystem from "expo-file-system";
import { getFreshDownloadURL, isStoragePath } from "@/utils/imageStorage";
import { getDisplayStreak } from "@/utils/streakCalculator";
import {
  EMPTY_USER_NAME_FIELDS,
  formatUserName,
  generateUsername,
  getPublicUsername,
  readUserNameFields,
  UserNameFields,
} from "@/utils/userName";
import {
  migrateUserNameFields,
  syncPublicProfile,
  synchronizeUserDisplayName,
  UserDocument,
} from "@/services/firestore";
import { recoverPendingUserProfile } from "@/services/auth";

export interface UserProfile extends UserNameFields {
  fullName: string;
  displayName: string;
  username: string;
  email: string;
  photoUri: string | null;
}

export interface UserStats {
  totalHours: number;
  sessions: number;
  streakDays: number;
  following: number;
  followers: number;
}

export interface UserListItem {
  id: string;
  username: string;
}

export const fetchUserProfile = async (userId: string): Promise<UserProfile | null> => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser || currentUser.uid !== userId) return null;

    const userRef = doc(db, "users", userId);
    let userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      if (await recoverPendingUserProfile(currentUser)) {
        userSnap = await getDoc(userRef);
      }
    }

    if (!userSnap.exists()) {
      console.warn("Firestore profile is missing for authenticated user:", userId);
      const displayName = currentUser.displayName?.trim() || "";
      const photoUri = currentUser.photoURL || null;
      const username = displayName.replace(/\s+/g, "").toLowerCase();
      return {
        ...EMPTY_USER_NAME_FIELDS,
        fullName: displayName,
        displayName,
        username,
        email: currentUser.email || "",
        photoUri,
      };
    }

    const userData = userSnap.data();
    let nameFields = readUserNameFields(userData);
    const needsMigration = Object.keys(EMPTY_USER_NAME_FIELDS).some(
      (field) => !(field in userData),
    );
    if (currentUser?.uid === userId && needsMigration) {
      try {
        nameFields =
          (await migrateUserNameFields(userId)) ?? nameFields;
      } catch (error) {
        console.error("Failed to migrate legacy profile name fields:", error);
      }
    }
    const displayName = await synchronizeUserDisplayName(currentUser);
    const fullName =
      formatUserName(nameFields, typeof userData.fullName === "string"
        ? userData.fullName
        : displayName);
    const storedUsername =
      typeof userData.username === "string" ? userData.username.trim() : "";
    const username =
      (storedUsername && !storedUsername.includes("@") ? storedUsername : "") ||
      generateUsername(nameFields) ||
      fullName.replace(/\s+/g, "").toLowerCase();
    const storedPhoto =
      typeof userData.photoURL === "string"
          ? userData.photoURL
          : typeof userData.photoUrl === "string"
            ? userData.photoUrl
            : null;
    const photoUri = storedPhoto || currentUser.photoURL || null;
    if (displayName && username) {
      await syncPublicProfile(userId, {
        displayName,
        username,
        photoUrl: photoUri,
      });
    }
    return {
      ...nameFields,
      fullName,
      displayName,
      username,
      email:
        currentUser.email ||
        (typeof userData.email === "string" ? userData.email : ""),
      photoUri,
    };
  } catch (error) {
    console.error("Failed to fetch or synchronize profile:", error);
    throw new Error("Failed to fetch profile");
  }
};

export const fetchUserStats = async (userId: string): Promise<UserStats> => {
  try {
    const sessionsQuery = query(
      collection(db, "users", userId, "sessions"),
      where("mode", "==", "focus")
    );
    const sessionsSnapshot = await getDocs(sessionsQuery);

    let totalSeconds = 0;
    sessionsSnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.duration) {
        totalSeconds += data.duration;
      }
    });

    const totalHours = Math.floor(totalSeconds / 3600);
    const sessionCount = sessionsSnapshot.size;

    const streakDoc = await getDoc(doc(db, "streaks", userId));
    let streakDays = 0;
    if (streakDoc.exists()) {
      const streakData = streakDoc.data();
      const lastActiveDate = streakData.lastActiveDate
        ? new Date(streakData.lastActiveDate.toMillis())
        : null;
      streakDays = getDisplayStreak(
        streakData.currentStreak || 0,
        lastActiveDate,
        streakData.timezone || "UTC"
      );
    }

    const [followingSnapshot, followersSnapshot] = await Promise.all([
      getDocs(collection(db, "following", userId, "list")),
      getDocs(collection(db, "followers", userId, "list")),
    ]);

    return {
      totalHours,
      sessions: sessionCount,
      streakDays,
      following: followingSnapshot.size,
      followers: followersSnapshot.size,
    };
  } catch {
    throw new Error("Failed to fetch stats");
  }
};

export const fetchConnections = async (
  userId: string,
  type: "Following" | "Followers"
): Promise<UserListItem[]> => {
  try {
    const sourceCollection =
      type === "Following"
        ? collection(db, "following", userId, "list")
        : collection(db, "followers", userId, "list");
    const snapshot = await getDocs(sourceCollection);
    return snapshot.docs.map((itemDoc) => ({
      id: itemDoc.id,
      username: (itemDoc.data().username as string) || "User",
    }));
  } catch {
    throw new Error("Failed to fetch connections");
  }
};

export const updateProfileData = async (
  userId: string,
  data: Partial<
    Pick<
      UserDocument,
      | "firstName"
      | "lastName"
      | "middleName"
      | "suffix"
      | "displayName"
      | "username"
      | "photoUrl"
    >
  >
): Promise<void> => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser || currentUser.uid !== userId) {
      throw new Error("User not authenticated");
    }

    const userRef = doc(db, "users", userId);
    const publicProfileRef = doc(db, "publicProfiles", userId);
    const [userSnapshot, publicProfileSnapshot] = await Promise.all([
      getDoc(userRef),
      getDoc(publicProfileRef),
    ]);
    if (
      data.firstName === undefined &&
      data.lastName === undefined &&
      data.middleName === undefined &&
      data.suffix === undefined &&
      data.displayName === undefined &&
      data.username === undefined &&
      data.photoUrl === undefined
    ) {
      return;
    }

    const existingUser = userSnapshot.data();
    const nameFields = {
      ...readUserNameFields(existingUser ?? {}),
      ...(data.firstName !== undefined ? { firstName: data.firstName } : {}),
      ...(data.lastName !== undefined ? { lastName: data.lastName } : {}),
      ...(data.middleName !== undefined ? { middleName: data.middleName } : {}),
      ...(data.suffix !== undefined ? { suffix: data.suffix } : {}),
    };
    const displayName =
      data.displayName ??
      formatUserName(
        nameFields,
        typeof existingUser?.displayName === "string"
          ? existingUser.displayName
          : null,
      );
    const username =
      data.username ??
      (typeof existingUser?.username === "string"
        ? existingUser.username
        : generateUsername(nameFields) ||
          displayName.replace(/\s+/g, "").toLowerCase());
    const userUpdates: Partial<UserDocument> = {
      ...(!userSnapshot.exists()
        ? {
            uid: userId,
            email: currentUser.email,
            createdAt: serverTimestamp(),
            photoURL: currentUser.photoURL || null,
          }
        : {}),
      ...nameFields,
      fullName: displayName,
      displayName,
      username,
      updatedAt: serverTimestamp(),
      ...(data.photoUrl !== undefined ? { photoURL: data.photoUrl } : {}),
    };
    const existingPublicProfile = publicProfileSnapshot.data();
    const batch = writeBatch(db);
    batch.set(userRef, userUpdates, { merge: true });
    batch.set(
      publicProfileRef,
      {
        uid: userId,
        displayName:
          displayName ||
          (typeof existingPublicProfile?.displayName === "string"
            ? existingPublicProfile.displayName
            : ""),
        username: getPublicUsername(
          username ||
            (typeof existingPublicProfile?.username === "string"
              ? existingPublicProfile.username
              : ""),
          currentUser.email,
        ),
        ...(data.photoUrl !== undefined ? { photoUrl: data.photoUrl } : {}),
      },
      { merge: true },
    );
    await batch.commit();
  } catch (error) {
    console.error("Failed to update Firestore profile:", error);
    throw new Error("Failed to update profile");
  }
};

export const updateFirebaseUserProfile = async (
  displayName: string,
  photoURL: string | null
): Promise<void> => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error("User not authenticated");
    await updateFirebaseProfile(currentUser, { displayName, photoURL });
  } catch {
    throw new Error("Failed to update Firebase profile");
  }
};

export const uploadProfileImage = async (
  userId: string,
  photoUri: string
): Promise<string> => {
  try {
    const avatarRef = ref(storage, `profileImages/${userId}`);
    const fileInfo = await FileSystem.getInfoAsync(photoUri);

    if (!fileInfo.exists) {
      throw new Error("Photo file not found.");
    }

    if (fileInfo.size && fileInfo.size > 5 * 1024 * 1024) {
      throw new Error("Photo too large. Please upload an image under 5MB.");
    }

    const ext =
      photoUri.split(/[?#]/)[0].split(".").pop()?.toLowerCase() ?? "jpg";
    const mimeMap: Record<string, string> = {
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      webp: "image/webp",
    };
    const contentType = mimeMap[ext];

    if (!contentType) {
      throw new Error("Invalid photo type. Please upload a JPG, PNG, or WEBP.");
    }

    const base64 = await FileSystem.readAsStringAsync(photoUri, {
      encoding: "base64",
    });
    await uploadString(avatarRef, base64, "base64", { contentType });
    // Return storage path instead of download URL
    return `profileImages/${userId}`;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Failed to upload image");
  }
};

/**
 * Get fresh download URL for profile image
 * @param photoUri - Storage path or existing URL
 * @returns Fresh download URL
 */
export const getProfileImageURL = async (photoUri: string | null): Promise<string | null> => {
  if (!photoUri) return null;

  // If it's already a URL, return it as-is (for backward compatibility)
  if (photoUri.startsWith('http://') || photoUri.startsWith('https://')) {
    return photoUri;
  }

  // If it's a storage path, get fresh download URL
  if (isStoragePath(photoUri)) {
    try {
      return await getFreshDownloadURL(photoUri);
    } catch (error) {
      console.error('Failed to get profile image URL:', error);
      return null;
    }
  }

  return photoUri;
};
