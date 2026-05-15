import React, { useState } from "react";
import { CheckCircle2, Circle, Edit, Trash2, X } from "lucide-react";
import { Modal, Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
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

interface DeleteConfirmModalProps {
  visible: boolean;
  taskTitle: string;
  onConfirm: () => void;
  onCancel: () => void;
}

function DeleteConfirmModal({ visible, taskTitle, onConfirm, onCancel }: DeleteConfirmModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={modalStyles.overlay}>
        <View style={modalStyles.container}>
          <View style={modalStyles.header}>
            <Text style={modalStyles.title}>Delete Task</Text>
            <TouchableOpacity onPress={onCancel} style={modalStyles.closeBtn}>
              <X size={20} color="#9A7070" strokeWidth={2.5} />
            </TouchableOpacity>
          </View>
          <Text style={modalStyles.message}>
            Are you sure you want to delete "{taskTitle}"? This action cannot be undone.
          </Text>
          <View style={modalStyles.buttons}>
            <TouchableOpacity
              style={modalStyles.cancelButton}
              onPress={onCancel}
              activeOpacity={0.8}
            >
              <Text style={modalStyles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={modalStyles.deleteButton}
              onPress={onConfirm}
              activeOpacity={0.8}
            >
              <Text style={modalStyles.deleteButtonText}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export const TaskRow = React.memo(({ task, onToggle, onEdit, onDelete }: TaskRowProps) => {
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const handleDeletePress = () => {
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = () => {
    setShowDeleteModal(false);
    onDelete(task.id);
  };

  const handleDeleteCancel = () => {
    setShowDeleteModal(false);
  };

  return (
    <>
      <View style={taskRowStyles.row}>
        <TouchableOpacity
          style={taskRowStyles.check}
          onPress={() => onToggle(task.id)}
        >
          {task.completed ? (
            <CheckCircle2 size={22} color="#C94C3C" strokeWidth={2.5} />
          ) : (
            <Circle size={22} color="#C4A8A8" strokeWidth={2.5} />
          )}
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
          <Edit size={16} color="#9A7070" strokeWidth={2.5} />
        </TouchableOpacity>
        <TouchableOpacity
          style={taskRowStyles.icon}
          onPress={handleDeletePress}
        >
          <Trash2 size={16} color="#C94C3C" strokeWidth={2.5} />
        </TouchableOpacity>
      </View>
      <DeleteConfirmModal
        visible={showDeleteModal}
        taskTitle={getTaskTitle(task)}
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
      />
    </>
  );
});

TaskRow.displayName = 'TaskRow';

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

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  container: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 24,
    width: "100%",
    maxWidth: 400,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1A0808",
  },
  closeBtn: {
    padding: 4,
  },
  message: {
    fontSize: 14,
    color: "#1A0808",
    lineHeight: 20,
    marginBottom: 24,
  },
  buttons: {
    flexDirection: "row",
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: "#EAD8D8",
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#9A7070",
  },
  deleteButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: "#C94C3C",
    alignItems: "center",
  },
  deleteButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});
