import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  writeBatch,
  serverTimestamp,
  limit,
} from "firebase/firestore";
import { auth, db } from "./firebase";

export interface UserSearchResult {
  id: string;
  username: string;
}

export type FollowStatus = "follow" | "followBack" | "following";

/**
 * Search for users by username prefix
 */
export const searchUsers = async (
  searchQuery: string,
  currentUserId: string | null
): Promise<UserSearchResult[]> => {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    return [];
  }

  const trimmed = searchQuery.trim();
  if (!trimmed) {
    return [];
  }

  try {
    const usersRef = collection(db, "users");
    const usersQuery = query(
      usersRef,
      where("username", ">=", trimmed),
      where("username", "<=", `${trimmed}\uf8ff`),
      limit(20)
    );
    const snapshot = await getDocs(usersQuery);
    const results = snapshot.docs
      .map((userDoc) => ({
        id: userDoc.id,
        username: userDoc.data().username as string,
      }))
      .filter((item) => item.id !== currentUserId && Boolean(item.username));
    return results;
  } catch (error) {
    return [];
  }
};

/**
 * Get follow status for a list of users
 */
export const getFollowStatusMap = async (
  results: UserSearchResult[],
  currentUserId: string | null
): Promise<Record<string, FollowStatus>> => {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    return {};
  }

  const currentUid = currentUser.uid;
  if (!currentUid) {
    return {};
  }

  try {
    const statusEntries = await Promise.all(
      results.map(async (item): Promise<[string, FollowStatus]> => {
        const currentToTargetRef = doc(db, "following", currentUid, "list", item.id);
        const targetToCurrentRef = doc(db, "following", item.id, "list", currentUid);
        const [currentToTargetSnap, targetToCurrentSnap] = await Promise.all([
          getDoc(currentToTargetRef),
          getDoc(targetToCurrentRef),
        ]);
        if (currentToTargetSnap.exists()) return [item.id, "following"];
        if (targetToCurrentSnap.exists()) return [item.id, "followBack"];
        return [item.id, "follow"];
      })
    );
    return Object.fromEntries(statusEntries);
  } catch (error) {
    return {};
  }
};

/**
 * Follow a user
 */
export const followUser = async (
  target: UserSearchResult,
  currentUsername: string
): Promise<void> => {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error("User not authenticated");
  }

  const currentUid = currentUser.uid;
  if (!currentUid || currentUid === target.id) {
    return;
  }

  try {
    const batch = writeBatch(db);
    batch.set(doc(db, "following", currentUid, "list", target.id), {
      username: target.username,
      createdAt: serverTimestamp(),
    });
    batch.set(doc(db, "followers", target.id, "list", currentUid), {
      username: currentUsername,
      createdAt: serverTimestamp(),
    });
    const notificationRef = doc(collection(db, "notifications", target.id, "items"));
    batch.set(notificationRef, {
      type: "follow",
      fromUid: currentUid,
      fromUsername: currentUsername,
      read: false,
      createdAt: serverTimestamp(),
    });
    await batch.commit();
  } catch (error) {
    throw error;
  }
};
