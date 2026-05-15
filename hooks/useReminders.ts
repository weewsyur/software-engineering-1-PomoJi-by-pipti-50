import { useEffect, useMemo, useState } from "react";
import { useTasks } from "@/hooks/useTasks";

export type ReminderStatus = "upcoming" | "overdue";

export interface Reminder {
  id: string;
  taskId: string;
  title: string;
  dueDate: string;
  status: ReminderStatus;
}

export function useReminders() {
  const { tasks } = useTasks();
  const [now, setNow] = useState(() => Date.now());

  // Keep overdue/upcoming status fresh without user interaction.
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);

  const reminders = useMemo(
    () =>
      tasks
        .filter((task) => !task.completed && task.reminderEnabled && task.dueDate.trim())
        .map((task) => {
          const dueMs = new Date(task.dueDate).getTime();
          if (Number.isNaN(dueMs)) return null;
          const status: ReminderStatus = dueMs < now ? "overdue" : "upcoming";
          return {
            id: `task-${task.id}`,
            taskId: task.id,
            title: task.title || "Untitled Task",
            dueDate: task.dueDate,
            status,
          };
        })
        .filter((r): r is Reminder => r !== null)
        .sort((a, b) => +new Date(a.dueDate) - +new Date(b.dueDate)),
    [tasks, now],
  );

  return {
    reminders,
    pendingCount: reminders.length,
  };
}
