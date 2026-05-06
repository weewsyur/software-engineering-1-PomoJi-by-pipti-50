import { useState, useEffect, useCallback } from "react";
import { auth, db } from "@/services/firebase";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
} from "firebase/firestore";

export type TaskCategory = "work" | "study" | "personal" | "health" | "other";

export interface Task {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  category: TaskCategory;
  completed: boolean;
  totalTime: number; // seconds
  createdAt: string;
}

export interface Session {
  id: string;
  taskTitle: string;
  taskId: string | null;
  date: string;
  durationMinutes: number;
  mode: "focus" | "short" | "long";
}

const uid = () => Math.random().toString(36).slice(2, 10);
const VALID_CATEGORIES: TaskCategory[] = ["work", "study", "personal", "health", "other"];

const normalizeTask = (raw: unknown): Task => {
  const task = (raw ?? {}) as Record<string, unknown>;
  const nestedTitle =
    typeof task.title === "object" && task.title !== null
      ? (task.title as Record<string, unknown>).title
      : null;
  const title =
    typeof task.title === "string"
      ? task.title
      : typeof nestedTitle === "string"
        ? nestedTitle
        : "Untitled Task";
  const categoryCandidate = task.category;
  const category: TaskCategory =
    typeof categoryCandidate === "string" && VALID_CATEGORIES.includes(categoryCandidate as TaskCategory)
      ? (categoryCandidate as TaskCategory)
      : "other";

  return {
    id: typeof task.id === "string" ? task.id : uid(),
    title,
    description: typeof task.description === "string" ? task.description : "",
    dueDate: typeof task.dueDate === "string" ? task.dueDate : "",
    category,
    completed: Boolean(task.completed),
    totalTime: typeof task.totalTime === "number" ? task.totalTime : 0,
    createdAt: typeof task.createdAt === "string" ? task.createdAt : new Date().toISOString(),
  };
};

export function useTasks() {
  const [tasks, setTasksState] = useState<Task[]>([]);

  useEffect(() => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      setTasksState([]);
      return;
    }

    const tasksQuery = query(collection(db, "users", currentUser.uid, "tasks"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(tasksQuery, (snapshot) => {
      const list = snapshot.docs.map((snapshotDoc) =>
        normalizeTask({ id: snapshotDoc.id, ...snapshotDoc.data() })
      );
      setTasksState(list);
    });
    return unsubscribe;
  }, []);

  const getUid = useCallback(() => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      return null;
    }
    return currentUser.uid;
  }, []);

  const createTask = useCallback(
    async (task: Task) => {
      const currentUid = getUid();
      if (!currentUid) return;
      await setDoc(doc(db, "users", currentUid, "tasks", task.id), task);
    },
    [getUid]
  );

  const updateTask = useCallback(
    async (id: string, patch: Partial<Task>) => {
      const currentUid = getUid();
      if (!currentUid) return;
      await updateDoc(doc(db, "users", currentUid, "tasks", id), patch);
    },
    [getUid]
  );

  const deleteTask = useCallback(
    async (id: string) => {
      const currentUid = getUid();
      if (!currentUid) return;
      await deleteDoc(doc(db, "users", currentUid, "tasks", id));
    },
    [getUid]
  );

  const addTimeToTask = useCallback(
    async (id: string, seconds: number) => {
      const currentUid = getUid();
      if (!currentUid) return;
      const target = tasks.find((task) => task.id === id);
      if (!target) return;
      await updateDoc(doc(db, "users", currentUid, "tasks", id), {
        totalTime: (target.totalTime ?? 0) + seconds,
      });
    },
    [tasks, getUid]
  );

  return { tasks, createTask, updateTask, deleteTask, addTimeToTask };
}

export function useSessions() {
  const [sessions, setSessionsState] = useState<Session[]>([]);

  useEffect(() => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      setSessionsState([]);
      return;
    }

    const sessionsQuery = query(collection(db, "users", currentUser.uid, "sessions"), orderBy("date", "desc"));
    const unsubscribe = onSnapshot(sessionsQuery, (snapshot) => {
      const nextSessions = snapshot.docs.map((snapshotDoc) => ({
        id: snapshotDoc.id,
        ...(snapshotDoc.data() as Omit<Session, "id">),
      }));
      setSessionsState(nextSessions);
    });
    return unsubscribe;
  }, []);

  const createSession = useCallback(
    async (params: Omit<Session, "id">) => {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        return;
      }
      await addDoc(collection(db, "users", currentUser.uid, "sessions"), params);
    },
    []
  );

  return { sessions, createSession };
}
