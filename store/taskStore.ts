import { create } from "zustand";
import { auth, db } from "@/services/firebase";
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
} from "firebase/firestore";
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
    id: typeof task.id === "string" ? task.id : uid(),
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
  addTask: (task: Task) => Promise<void>;
  updateTask: (id: string, patch: TaskPatch) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  completeTask: (id: string, completed?: boolean) => Promise<void>;
  addTimeToTask: (id: string, seconds: number) => Promise<void>;
  getPendingReminders: () => Array<Task & { status: "upcoming" | "overdue" }>;
}

let unsubscribeTasks: (() => void) | null = null;

const getCurrentUid = () => auth.currentUser?.uid ?? null;

export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: [],
  initialized: false,
  initialize: () => {
    if (unsubscribeTasks) return;
    const currentUid = getCurrentUid();
    if (!currentUid) {
      set({ tasks: [], initialized: true });
      return;
    }

    const tasksQuery = query(
      collection(db, "users", currentUid, "tasks"),
      orderBy("createdAt", "desc"),
    );
    unsubscribeTasks = onSnapshot(tasksQuery, (snapshot) => {
      const tasks = snapshot.docs.map((snapshotDoc) =>
        normalizeTask({ id: snapshotDoc.id, ...snapshotDoc.data() }),
      );
      set({ tasks, initialized: true });
    });
  },
  addTask: async (task) => {
    const currentUid = getCurrentUid();
    if (!currentUid) return;
    const normalized = normalizeTask(task);
    const reminderNotificationId = await upsertTaskReminder(
      normalized,
      normalized.reminderNotificationId,
    );
    await setDoc(doc(db, "users", currentUid, "tasks", normalized.id), {
      ...normalized,
      reminderNotificationId,
    });
  },
  updateTask: async (id, patch) => {
    const currentUid = getCurrentUid();
    if (!currentUid) return;
    const existing = get().tasks.find((task) => task.id === id);
    if (!existing) return;

    const merged = normalizeTask({ ...existing, ...patch, id, createdAt: existing.createdAt });
    const reminderNotificationId = await upsertTaskReminder(
      merged,
      existing.reminderNotificationId,
    );
    await updateDoc(doc(db, "users", currentUid, "tasks", id), {
      ...patch,
      dueDate: merged.dueDate,
      reminderEnabled: merged.reminderEnabled,
      reminderNotificationId,
    });
  },
  deleteTask: async (id) => {
    const currentUid = getCurrentUid();
    if (!currentUid) return;
    const existing = get().tasks.find((task) => task.id === id);
    await cancelTaskReminder(existing?.reminderNotificationId);
    await deleteDoc(doc(db, "users", currentUid, "tasks", id));
  },
  completeTask: async (id, completed = true) => {
    const currentUid = getCurrentUid();
    if (!currentUid) return;
    const existing = get().tasks.find((task) => task.id === id);
    if (!existing) return;

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
  },
  addTimeToTask: async (id, seconds) => {
    const currentUid = getCurrentUid();
    if (!currentUid) return;
    const existing = get().tasks.find((task) => task.id === id);
    if (!existing) return;
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
