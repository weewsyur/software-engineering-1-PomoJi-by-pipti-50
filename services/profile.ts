import { doc, getDoc, updateDoc, collection, query, where, getDocs } from "firebase/firestore";
import { getDownloadURL, ref, uploadString } from "firebase/storage";
import { updateProfile as updateFirebaseProfile } from "firebase/auth";
import { auth, db, storage } from "./firebase";
import * as FileSystem from "expo-file-system";

export interface UserProfile {
  name: string;
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
    const userRef = doc(db, "users", userId);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) return null;

    const userData = userSnap.data();
    return {
      name: (userData.username as string) || "Your Name",
      email: (userData.email as string) || auth.currentUser?.email || "your@email.com",
      photoUri: (userData.photoUrl as string) || null,
    };
  } catch (error) {
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

    const userDoc = await getDoc(doc(db, "users", userId));
    let streakDays = 0;
    if (userDoc.exists()) {
      const userData = userDoc.data();
      streakDays = userData.streakDays || 0;
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
  data: { username: string; photoUrl?: string | null }
): Promise<void> => {
  try {
    const userRef = doc(db, "users", userId);
    await updateDoc(userRef, data);
  } catch {
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

    const ext = photoUri.split(".").pop()?.toLowerCase() ?? "jpg";
    const mimeMap: Record<string, string> = {
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      webp: "image/webp",
    };
    const contentType = mimeMap[ext] ?? "image/jpeg";

    if (!Object.values(mimeMap).includes(contentType)) {
      throw new Error("Invalid photo type. Please upload a JPG, PNG, or WEBP.");
    }

    const base64 = await FileSystem.readAsStringAsync(photoUri, {
      encoding: "base64",
    });
    await uploadString(avatarRef, base64, "base64", { contentType });
    return await getDownloadURL(avatarRef);
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Failed to upload image");
  }
};
