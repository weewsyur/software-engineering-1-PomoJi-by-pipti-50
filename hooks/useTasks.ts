import { useEffect } from "react";
import { useTaskStore } from "@/store/taskStore";

export function useTasks() {
  const initialize = useTaskStore((state) => state.initialize);
  const tasks = useTaskStore((state) => state.tasks);
  const addTask = useTaskStore((state) => state.addTask);
  const updateTask = useTaskStore((state) => state.updateTask);
  const deleteTask = useTaskStore((state) => state.deleteTask);
  const completeTask = useTaskStore((state) => state.completeTask);
  const addTimeToTask = useTaskStore((state) => state.addTimeToTask);
  const getPendingReminders = useTaskStore((state) => state.getPendingReminders);

  useEffect(() => {
    initialize();
  }, [initialize]);

  return {
    tasks,
    addTask,
    updateTask,
    deleteTask,
    completeTask,
    addTimeToTask,
    getPendingReminders,
  };
}
