import { Ionicons } from "@expo/vector-icons";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Task } from "@/hooks/usePomodoro";
import { CategoryPill } from "./CategoryPill";

const isTaskCategory = (value: unknown): value is "work" | "study" | "personal" | "health" | "other" =>
  value === "work" ||
  value === "study" ||
  value === "personal" ||
  value === "health" ||
  value === "other";

export const getTaskTitle = (task: Task) => {
  if (typeof task?.title === "string") return task.title;
  const nestedTitle =
    task?.title && typeof task.title === "object"
      ? (task.title as unknown as { title?: unknown }).title
      : null;
  return typeof nestedTitle === "string" ? nestedTitle : "Untitled Task";
};

const getTaskCategory = (task: Task) =>
  isTaskCategory(task?.category) ? task.category : "other";

const getTaskDueDate = (task: Task) =>
  typeof task?.dueDate === "string" ? task.dueDate : "";

interface TaskRowProps {
  task: Task;
  onToggle: (id: string) => void;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
}

export const TaskRow = ({ task, onToggle, onEdit, onDelete }: TaskRowProps) => (
  <View style={taskRowStyles.row}>
    <TouchableOpacity
      style={taskRowStyles.check}
      onPress={() => onToggle(task.id)}
    >
      <Ionicons
        name={task.completed ? "checkmark-circle" : "ellipse-outline"}
        size={22}
        color={task.completed ? "#C94C3C" : "#C4A8A8"}
      />
    </TouchableOpacity>
    <View style={taskRowStyles.body}>
      <Text
        style={StyleSheet.flatten([
          taskRowStyles.title,
          task.completed ? taskRowStyles.done : undefined,
        ])}
      >
        {getTaskTitle(task)}
      </Text>
      <View style={taskRowStyles.meta}>
        <CategoryPill cat={getTaskCategory(task)} />
        {!!getTaskDueDate(task) && (
          <Text style={taskRowStyles.due}>📅 {getTaskDueDate(task)}</Text>
        )}
      </View>
    </View>
    <TouchableOpacity style={taskRowStyles.icon} onPress={() => onEdit(task)}>
      <Ionicons name="pencil-outline" size={16} color="#9A7070" />
    </TouchableOpacity>
    <TouchableOpacity
      style={taskRowStyles.icon}
      onPress={() =>
        Alert.alert("Delete Task", "Are you sure?", [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: () => onDelete(task.id),
          },
        ])
      }
    >
      <Ionicons name="trash-outline" size={16} color="#C94C3C" />
    </TouchableOpacity>
  </View>
);

export default TaskRow;

const taskRowStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#EAD8D8",
  },
  check: { padding: 2 },
  body: { flex: 1, gap: 4 },
  title: { fontSize: 14, fontWeight: "600", color: "#1A0808" },
  done: { textDecorationLine: "line-through", color: "#9A7070" },
  meta: { flexDirection: "row", alignItems: "center", gap: 8 },
  due: { fontSize: 10, color: "#9A7070" },
  icon: { padding: 4 },
});
