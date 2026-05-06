import { useMemo, useState } from "react";
import { useTasks } from "@/hooks/usePomodoro";

export type ReminderStatus = "upcoming" | "overdue";

export interface Reminder {
  id: string;
  title: string;
  dueDate: string;
  status: ReminderStatus;
  source: "task" | "manual";
}

interface ManualReminderInput {
  title: string;
  dueDate: string;
}

const uid = () => Math.random().toString(36).slice(2, 10);

export function useReminders() {
  const { tasks } = useTasks();
  const [manualReminders, setManualReminders] = useState<Reminder[]>([]);

  const taskReminders = useMemo(() => {
    const now = new Date();
    return tasks
      .filter((task) => !task.completed && typeof task.dueDate === "string" && task.dueDate.trim())
      .map((task) => {
        const due = new Date(task.dueDate);
        const status: ReminderStatus = due.getTime() < now.getTime() ? "overdue" : "upcoming";
        return {
          id: `task-${task.id}`,
          title: task.title || "Untitled Task",
          dueDate: due.toISOString(),
          status,
          source: "task" as const,
        };
      })
      .filter((reminder) => !Number.isNaN(new Date(reminder.dueDate).getTime()));
  }, [tasks]);

  const reminders = useMemo(
    () =>
      [...taskReminders, ...manualReminders].sort(
        (a, b) => +new Date(a.dueDate) - +new Date(b.dueDate)
      ),
    [manualReminders, taskReminders]
  );

  const addManualReminder = ({ title, dueDate }: ManualReminderInput) => {
    const due = new Date(dueDate);
    if (!title.trim() || Number.isNaN(due.getTime())) return;
    const status: ReminderStatus = due.getTime() < Date.now() ? "overdue" : "upcoming";
    setManualReminders((prev) => [
      ...prev,
      { id: uid(), title: title.trim(), dueDate: due.toISOString(), status, source: "manual" },
    ]);
  };

  const removeManualReminder = (id: string) => {
    setManualReminders((prev) => prev.filter((item) => item.id !== id));
  };

  return {
    reminders,
    pendingCount: reminders.length,
    addManualReminder,
    removeManualReminder,
  };
}
