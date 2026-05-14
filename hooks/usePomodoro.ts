import { useState, useEffect, useCallback } from "react";
import { auth, db } from "@/services/firebase";
import {
  addDoc,
  collection,
  onSnapshot,
  orderBy,
  query,
} from "firebase/firestore";
import { useTasks as useGlobalTasks } from "@/hooks/useTasks";
import type { Task as StoreTask, TaskCategory } from "@/store/taskStore";
export type { TaskCategory, Task as StoreTask };
export type Task = StoreTask;

export interface Session {
  id: string;
  taskTitle: string;
  taskId: string | null;
  date: string;
  durationMinutes: number;
  mode: "focus" | "short" | "long";
}

export function useTasks() {
  const {
    tasks,
    addTask,
    updateTask,
    deleteTask,
    completeTask,
    addTimeToTask,
  } = useGlobalTasks();

  const createTask = useCallback(
    async (task: Task) => {
      await addTask(task);
    },
    [addTask],
  );

  const patchTask = useCallback(
    async (id: string, patch: Partial<Task>) => {
      await updateTask(id, patch);
    },
    [updateTask],
  );

  return {
    tasks,
    createTask,
    updateTask: patchTask,
    deleteTask,
    completeTask,
    addTimeToTask,
  };
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
