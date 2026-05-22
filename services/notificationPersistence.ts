import { auth, db } from "@/services/firebase";
import {
  addDoc,
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  serverTimestamp,
} from "firebase/firestore";
import type { Task } from "@/store/taskStore";
import {
  scheduleSessionCompletionNotification as scheduleSystemNotification,
} from "@/services/notificationService";

export interface PersistentNotification {
  id: string;
  type: "follow" | "task_reminder" | "session_complete";
  read: boolean;
  createdAt: any;
  taskId?: string;
  taskTitle?: string;
  dueDate?: string;
  reminderStatus?: "upcoming" | "overdue";
  durationSeconds?: number;
  sessionsCompleted?: number;
  fromUid?: string;
  fromUsername?: string;
}

async function checkDuplicate(
  userId: string,
  type: "task_reminder" | "session_complete",
  taskId: string | null,
  windowSecs: number = 5,
): Promise<boolean> {
  if (!taskId) return false;

  try {
    const windowMs = windowSecs * 1000;
    const recentTime = Date.now() - windowMs;

    // Simplified query without orderBy to avoid composite index requirement
    // Filter by time in code instead
    const q = query(
      collection(db, "notifications", userId, "items"),
      where("type", "==", type),
      where("taskId", "==", taskId),
      limit(10), // Get a few recent docs to check in code
    );

    const snapshot = await getDocs(q);
    
    // Filter results by time in code (avoid composite index)
    const isDuplicate = snapshot.docs.some((doc) => {
      const createdAt = doc.data().createdAt;
      if (!createdAt) return false;
      const timestamp = typeof createdAt.toMillis === 'function' 
        ? createdAt.toMillis() 
        : createdAt.getTime?.() || 0;
      return timestamp > recentTime;
    });
    
    return isDuplicate;
  } catch (error) {
    console.error("Error checking duplicate notification:", error);
    return false;
  }
}

export async function createTaskReminderNotification(params: {
  taskId: string;
  taskTitle: string;
  dueDate: string;
  reminderStatus: "upcoming" | "overdue";
}) {
  const currentUid = auth.currentUser?.uid;
  if (!currentUid) return null;

  try {
    // Check for duplicate within 5 seconds
    const isDuplicate = await checkDuplicate(
      currentUid,
      "task_reminder",
      params.taskId,
      5,
    );
    if (isDuplicate) {
      console.log("Skipped duplicate task reminder notification");
      return null;
    }

    // Create persistent notification
    const docRef = await addDoc(
      collection(db, "notifications", currentUid, "items"),
      {
        type: "task_reminder",
        taskId: params.taskId,
        taskTitle: params.taskTitle,
        dueDate: params.dueDate,
        reminderStatus: params.reminderStatus,
        read: false,
        createdAt: serverTimestamp(),
      },
    );

    return docRef.id;
  } catch (error) {
    console.error("Error creating task reminder notification:", error);
    return null;
  }
}

export async function createSessionCompleteNotification(params: {
  taskId: string | null;
  taskTitle: string;
  durationSeconds: number;
  sessionsCompleted: number;
}) {
  const currentUid = auth.currentUser?.uid;
  if (!currentUid) return null;

  try {
    // Check for duplicate within 3 seconds (sessions complete quickly)
    if (params.taskId) {
      const isDuplicate = await checkDuplicate(
        currentUid,
        "session_complete",
        params.taskId,
        3,
      );
      if (isDuplicate) {
        console.log("Skipped duplicate session complete notification");
        return null;
      }
    }

    // Create persistent notification
    const docRef = await addDoc(
      collection(db, "notifications", currentUid, "items"),
      {
        type: "session_complete",
        taskId: params.taskId || null,
        taskTitle: params.taskTitle,
        durationSeconds: params.durationSeconds,
        sessionsCompleted: params.sessionsCompleted,
        read: false,
        createdAt: serverTimestamp(),
      },
    );

    // Also schedule system notification
    await scheduleSystemNotification({
      taskId: params.taskId,
      taskTitle: params.taskTitle,
      durationSeconds: params.durationSeconds,
    }).catch(() => null);

    return docRef.id;
  } catch (error) {
    console.error("Error creating session complete notification:", error);
    return null;
  }
}

export async function markNotificationAsRead(notificationId: string) {
  const currentUid = auth.currentUser?.uid;
  if (!currentUid) return;

  try {
    const { updateDoc, doc } = await import("firebase/firestore");
    await updateDoc(
      doc(db, "notifications", currentUid, "items", notificationId),
      { read: true },
    );
  } catch (error) {
    console.error("Error marking notification as read:", error);
  }
}
