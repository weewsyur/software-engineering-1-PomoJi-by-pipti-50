import { create } from "zustand";
import { auth, db } from "@/services/firebase";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import {
  cancelTaskReminder,
  upsertTaskReminder,
} from "@/services/notificationService";

export type TaskCategory = "work" | "study" | "personal" | "health" | "other";

export interface Task {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  reminderEnabled: boolean;
  category: TaskCategory;
  completed: boolean;
  totalTime: number;
  createdAt: string;
  reminderNotificationId?: string | null;
}

const VALID_CATEGORIES: TaskCategory[] = ["work", "study", "personal", "health", "other"];
const uid = () => Math.random().toString(36).slice(2, 10);

const normalizeTask = (raw: unknown): Task => {
  const task = (raw ?? {}) as Record<string, unknown>;
  const categoryCandidate = task.category;
  const category: TaskCategory =
    typeof categoryCandidate === "string" && VALID_CATEGORIES.includes(categoryCandidate as TaskCategory)
      ? (categoryCandidate as TaskCategory)
      : "other";
  const dueDate = typeof task.dueDate === "string" ? task.dueDate : "";

  return {
    id: typeof task.id === "string" && task.id.trim() ? task.id : uid(),
    title: typeof task.title === "string" ? task.title : "Untitled Task",
    description: typeof task.description === "string" ? task.description : "",
    dueDate,
    reminderEnabled: typeof task.reminderEnabled === "boolean" ? task.reminderEnabled : Boolean(dueDate),
    category,
    completed: Boolean(task.completed),
    totalTime: typeof task.totalTime === "number" ? task.totalTime : 0,
    createdAt: typeof task.createdAt === "string" ? task.createdAt : new Date().toISOString(),
    reminderNotificationId:
      typeof task.reminderNotificationId === "string" ? task.reminderNotificationId : null,
  };
};

type TaskPatch = Partial<Omit<Task, "id" | "createdAt">>;

interface TaskState {
  tasks: Task[];
  initialized: boolean;
  initialize: () => void;
  addTask: (task: Task) => Promise<string>;
  updateTask: (id: string, patch: TaskPatch) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  completeTask: (id: string, completed?: boolean) => Promise<void>;
  addTimeToTask: (id: string, seconds: number) => Promise<void>;
  getPendingReminders: () => Array<Task & { status: "upcoming" | "overdue" }>;
}

let unsubscribeTasks: (() => void) | null = null;
let unsubscribeAuth: (() => void) | null = null;
let activeUid: string | null = null;

const getCurrentUid = () => auth.currentUser?.uid ?? null;

export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: [],
  initialized: false,
  initialize: () => {
    if (unsubscribeAuth) return;

    const bindTasksForUid = (uid: string | null) => {
      if (unsubscribeTasks) {
        unsubscribeTasks();
        unsubscribeTasks = null;
      }

      activeUid = uid;
      if (!uid) {
        set({ tasks: [], initialized: true });
        return;
      }

      const tasksQuery = query(
        collection(db, "users", uid, "tasks"),
        orderBy("createdAt", "desc"),
      );
      unsubscribeTasks = onSnapshot(tasksQuery, (snapshot) => {
        const tasks = snapshot.docs.map((snapshotDoc) =>
          normalizeTask({ id: snapshotDoc.id, ...snapshotDoc.data() }),
        );
        set({ tasks, initialized: true });
      });
    };

    bindTasksForUid(getCurrentUid());
    unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      const nextUid = user?.uid ?? null;
      if (nextUid === activeUid) return;
      bindTasksForUid(nextUid);
    });
  },
  addTask: async (task) => {
    const currentUid = getCurrentUid();
    if (!currentUid) {
      throw new Error("You need to sign in before saving tasks.");
    }
    const normalized = normalizeTask(task);
    const reminderNotificationId = await upsertTaskReminder(
      normalized,
      normalized.reminderNotificationId,
    );
    // Optimistic update: add task to local state immediately
    const tempId = `temp-${Date.now()}`;
    const optimisticTask = { ...normalized, id: tempId, reminderNotificationId };
    set((state) => ({ tasks: [optimisticTask, ...state.tasks] }));
    try {
      // Strip id field so Firestore auto-generates it
      const { id, ...taskData } = normalized;
      const docRef = await addDoc(collection(db, "users", currentUid, "tasks"), {
        ...taskData,
        reminderNotificationId,
      });
      // Replace temp ID with real ID from Firestore
      set((state) => ({
        tasks: state.tasks.map((t) =>
          t.id === tempId ? { ...t, id: docRef.id } : t
        ),
      }));
      return docRef.id;
    } catch (error) {
      // Rollback optimistic update on error
      set((state) => ({ tasks: state.tasks.filter((t) => t.id !== tempId) }));
      throw error;
    }
  },
  updateTask: async (id, patch) => {
    const currentUid = getCurrentUid();
    if (!currentUid) {
      throw new Error("You need to sign in before updating tasks.");
    }
    const existing = get().tasks.find((task) => task.id === id);
    if (!existing) {
      throw new Error("Task not found. Please refresh and try again.");
    }

    const merged = normalizeTask({ ...existing, ...patch, id, createdAt: existing.createdAt });
    // Optimistic update: update task in local state immediately
    set((state) => ({
      tasks: state.tasks.map((t) => (t.id === id ? merged : t)),
    }));
    try {
      const reminderNotificationId = await upsertTaskReminder(
        merged,
        existing.reminderNotificationId,
      );
      await updateDoc(doc(db, "users", currentUid, "tasks", id), {
        ...patch,
        category: merged.category,
        dueDate: merged.dueDate,
        reminderEnabled: merged.reminderEnabled,
        reminderNotificationId,
      });
    } catch (error) {
      // Rollback optimistic update on error
      set((state) => ({
        tasks: state.tasks.map((t) => (t.id === id ? existing : t)),
      }));
      throw error;
    }
  },
  deleteTask: async (id) => {
    const currentUid = getCurrentUid();
    if (!currentUid) {
      throw new Error("You need to sign in before deleting tasks.");
    }
    const existing = get().tasks.find((task) => task.id === id);
    if (!existing) {
      throw new Error("Task not found. Please refresh and try again.");
    }
    // Optimistic update: remove task from local state immediately
    set((state) => ({
      tasks: state.tasks.filter((t) => t.id !== id),
    }));
    try {
      await cancelTaskReminder(existing?.reminderNotificationId);
      await deleteDoc(doc(db, "users", currentUid, "tasks", id));
    } catch (error) {
      // Rollback optimistic update on error
      set((state) => ({
        tasks: [...state.tasks, existing],
      }));
      throw error;
    }
  },
  completeTask: async (id, completed = true) => {
    const currentUid = getCurrentUid();
    if (!currentUid) {
      throw new Error("You need to sign in before updating tasks.");
    }
    const existing = get().tasks.find((task) => task.id === id);
    if (!existing) {
      throw new Error("Task not found. Please refresh and try again.");
    }

    // Optimistic update: update task in local state immediately
    set((state) => ({
      tasks: state.tasks.map((t) => (t.id === id ? { ...t, completed } : t)),
    }));

    try {
      let reminderNotificationId = existing.reminderNotificationId ?? null;
      if (completed) {
        await cancelTaskReminder(reminderNotificationId);
        reminderNotificationId = null;
      } else {
        // Ensure we pass `completed: false` so upsertTaskReminder can schedule.
        reminderNotificationId = await upsertTaskReminder(
          { ...existing, completed: false },
          reminderNotificationId,
        );
      }
      await updateDoc(doc(db, "users", currentUid, "tasks", id), {
        completed,
        reminderNotificationId,
      });
    } catch (error) {
      // Rollback optimistic update on error
      set((state) => ({
        tasks: state.tasks.map((t) => (t.id === id ? existing : t)),
      }));
      throw error;
    }
  },
  addTimeToTask: async (id, seconds) => {
    const currentUid = getCurrentUid();
    if (!currentUid) {
      throw new Error("You need to sign in before updating tasks.");
    }
    const existing = get().tasks.find((task) => task.id === id);
    if (!existing) {
      throw new Error("Task not found. Please refresh and try again.");
    }
    await updateDoc(doc(db, "users", currentUid, "tasks", id), {
      totalTime: Math.max(0, (existing.totalTime ?? 0) + seconds),
    });
  },
  getPendingReminders: () => {
    const now = Date.now();
    return get()
      .tasks.filter(
        (task) =>
          !task.completed &&
          task.reminderEnabled &&
          typeof task.dueDate === "string" &&
          task.dueDate.trim(),
      )
      .map((task) => {
        const due = new Date(task.dueDate);
        return {
          ...task,
          status: due.getTime() < now ? "overdue" : "upcoming",
        } as Task & { status: "upcoming" | "overdue" };
      })
      .filter((task) => !Number.isNaN(new Date(task.dueDate).getTime()))
      .sort((a, b) => +new Date(a.dueDate) - +new Date(b.dueDate));
  },
}));
