import { useCallback, useEffect, useState } from "react";
import { auth, db } from "@/services/firebase";
import { addDoc, collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { getLocalISODateTime } from "@/utils/dateHelpers";

export interface Activity {
  id: string;
  title: string;
  description: string;
  sessions: number;
  totalTime: number; // seconds
  images: string[];
  category: string;
  createdAt: string;
  uid?: string;
}

const uid = () => Math.random().toString(36).slice(2, 10);

export const normalizeActivity = (raw: unknown): Activity => {
  const value = (raw ?? {}) as Record<string, unknown>;
  return {
    id: typeof value.id === "string" ? value.id : uid(),
    title: typeof value.title === "string" && value.title.trim() ? value.title : "Focus Session",
    description: typeof value.description === "string" ? value.description : "",
    sessions: typeof value.sessions === "number" ? value.sessions : 1,
    totalTime: typeof value.totalTime === "number" ? value.totalTime : 0,
    images: Array.isArray(value.images) ? value.images.filter((img): img is string => typeof img === "string") : [],
    category: typeof value.category === "string" && value.category.trim() ? value.category : "other",
    createdAt: typeof value.createdAt === "string" ? value.createdAt : getLocalISODateTime(),
  };
};

export function useActivities() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const currentUid = auth.currentUser?.uid;
    if (!currentUid) {
      console.warn("useActivities: auth.currentUser is null; skipping activities listener.");
      setActivities([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    const activitiesRef = collection(db, "users", currentUid, "activities");
    const activitiesQuery = query(activitiesRef, orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(
      activitiesQuery,
      (snapshot) => {
        const list = snapshot.docs.map((snapshotDoc) =>
          normalizeActivity({ id: snapshotDoc.id, ...snapshotDoc.data() })
        );
        setActivities(list);
        setIsLoading(false);
      },
      () => {
        setActivities([]);
        setIsLoading(false);
      }
    );
    return () => unsubscribe();
  }, [auth.currentUser?.uid]);

  const createActivity = useCallback(
    async (payload: Omit<Activity, "id" | "createdAt" | "uid"> & { createdAt?: string }) => {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        console.warn("useActivities: auth.currentUser is null; skipping activity write.");
        return null;
      }
      const activityPayload = {
        title: payload.title ?? "Focus Session",
        description: payload.description ?? "",
        sessions: payload.sessions ?? 1,
        totalTime: payload.totalTime ?? 0,
        images: payload.images ?? [],
        category: payload.category ?? "other",
        createdAt: payload.createdAt ?? getLocalISODateTime(),
        uid: currentUser.uid,
      };
      return addDoc(collection(db, "users", currentUser.uid, "activities"), activityPayload);
    },
    []
  );

  return { activities, isLoading, createActivity };
}
