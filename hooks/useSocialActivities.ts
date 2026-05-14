import { useEffect, useState, useRef } from "react";
import { auth, db } from "@/services/firebase";
import { collection, onSnapshot, orderBy, query, getDocs, doc, getDoc, limit } from "firebase/firestore";
import { getFollowedUsers } from "@/services/social";
import { Activity, normalizeActivity } from "./useActivities";

export interface SocialActivity extends Activity {
  userName: string;
  userPhotoUri: string | null;
}

const PROFILE_CACHE = new Map<string, { name: string; photoUri: string | null }>();
const ACTIVITIES_LIMIT = 50;

const fetchUserProfile = async (uid: string): Promise<{ name: string; photoUri: string | null }> => {
  // Check cache first
  if (PROFILE_CACHE.has(uid)) {
    return PROFILE_CACHE.get(uid)!;
  }

  try {
    const userDoc = await getDoc(doc(db, "users", uid));
    if (!userDoc.exists()) {
      const fallback = { name: "User", photoUri: null };
      PROFILE_CACHE.set(uid, fallback);
      return fallback;
    }
    const data = userDoc.data();
    const profile = {
      name: data.username || "User",
      photoUri: data.photoUrl || null,
    };
    PROFILE_CACHE.set(uid, profile);
    return profile;
  } catch (error) {
    console.error("Error fetching user profile:", error);
    const fallback = { name: "User", photoUri: null };
    PROFILE_CACHE.set(uid, fallback);
    return fallback;
  }
};

export function useSocialActivities() {
  const [activities, setActivities] = useState<SocialActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const isFetchingRef = useRef(false);

  useEffect(() => {
    const currentUid = auth.currentUser?.uid;
    if (!currentUid) {
      console.warn("useSocialActivities: auth.currentUser is null; skipping activities listener.");
      setActivities([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    const fetchSocialActivities = async () => {
      if (isFetchingRef.current) return;
      isFetchingRef.current = true;

      try {
        // Get followed users
        const followedIds = await getFollowedUsers(currentUid);

        // Include current user in the list
        const allUserIds = [currentUid, ...followedIds];

        // Fetch activities from all users with limit
        const activityPromises = allUserIds.map(async (uid) => {
          const activitiesRef = collection(db, "users", uid, "activities");
          const activitiesQuery = query(activitiesRef, orderBy("createdAt", "desc"), limit(20));
          const snapshot = await getDocs(activitiesQuery);
          const activities = snapshot.docs.map((snapshotDoc) =>
            normalizeActivity({ id: snapshotDoc.id, ...snapshotDoc.data() })
          );

          // Fetch user profile for this uid (cached)
          const userProfile = await fetchUserProfile(uid);

          // Attach user info to each activity
          return activities.map((activity) => ({
            ...activity,
            uid,
            userName: userProfile.name,
            userPhotoUri: userProfile.photoUri,
          }));
        });

        const allActivities = await Promise.all(activityPromises);

        // Flatten and sort by createdAt
        const flattenedActivities = allActivities.flat().sort((a, b) => {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });

        // Limit total activities
        const limitedActivities = flattenedActivities.slice(0, ACTIVITIES_LIMIT);

        setActivities(limitedActivities);
        setIsLoading(false);
      } catch (error) {
        console.error("Error fetching social activities:", error);
        setActivities([]);
        setIsLoading(false);
      } finally {
        isFetchingRef.current = false;
      }
    };

    fetchSocialActivities();

    // Set up real-time listener for current user's activities with debounce
    const activitiesRef = collection(db, "users", currentUid, "activities");
    const activitiesQuery = query(activitiesRef, orderBy("createdAt", "desc"), limit(20));
    let timeoutId: NodeJS.Timeout | null = null;

    const unsubscribe = onSnapshot(
      activitiesQuery,
      () => {
        // Debounce refresh to avoid rapid re-fetches
        if (timeoutId) clearTimeout(timeoutId);
        timeoutId = setTimeout(fetchSocialActivities, 500);
      },
      () => {
        setActivities([]);
        setIsLoading(false);
      }
    );

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      unsubscribe();
    };
  }, [auth.currentUser?.uid]);

  return { activities, isLoading };
}
