import { Ionicons } from "@expo/vector-icons";
import { useState, useEffect } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Colors } from "@/constants/colors";
import { Task, TaskCategory } from "@/hooks/usePomodoro";

const CATEGORIES: TaskCategory[] = [
  "work",
  "study",
  "personal",
  "health",
  "other",
];

const CATEGORY_COLORS: Record<TaskCategory, string> = {
  work: "#C94C3C",
  study: "#4C7AC9",
  personal: "#7AC94C",
  health: "#C9A44C",
  other: "#9A7AC9",
};

const uid = () => Math.random().toString(36).slice(2, 10);

interface TaskModalProps {
  visible: boolean;
  initial?: Task | null;
  onSave: (task: Task) => void;
  onClose: () => void;
}

export const TaskModal = ({ visible, initial, onSave, onClose }: TaskModalProps) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [category, setCategory] = useState<TaskCategory>("work");

  useEffect(() => {
    if (initial) {
      setTitle(initial.title);
      setDescription(initial.description);
      setDueDate(initial.dueDate);
      setCategory(initial.category);
    } else {
      setTitle("");
      setDescription("");
      setDueDate("");
      setCategory("work");
    }
  }, [initial, visible]);

  const handleSave = () => {
    if (!title.trim()) {
      Alert.alert("Title required", "Please enter a task title.");
      return;
    }
    const task: Task = {
      id: initial?.id ?? uid(),
      title: title.trim(),
      description: description.trim(),
      dueDate,
      category,
      completed: initial?.completed ?? false,
      totalTime: initial?.totalTime ?? 0,
      createdAt: initial?.createdAt ?? new Date().toISOString(),
    };
    onSave(task);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={modalStyles.overlay}
      >
        <View style={modalStyles.sheet}>
          <View style={modalStyles.sheetHeader}>
            <Text style={modalStyles.sheetTitle}>
              {initial ? "Edit Task" : "New Task"}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={22} color={Colors.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={modalStyles.fieldLabel}>Title *</Text>
            <TextInput
              style={modalStyles.input}
              placeholder="Task title"
              placeholderTextColor="#C4A8A8"
              value={title}
              onChangeText={setTitle}
            />
            <Text style={modalStyles.fieldLabel}>Description</Text>
            <TextInput
              style={StyleSheet.flatten([
                modalStyles.input,
                modalStyles.textArea,
              ])}
              placeholder="Optional details…"
              placeholderTextColor="#C4A8A8"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
            />
            <Text style={modalStyles.fieldLabel}>Due Date</Text>
            <TextInput
              style={modalStyles.input}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#C4A8A8"
              value={dueDate}
              onChangeText={setDueDate}
            />
            <Text style={modalStyles.fieldLabel}>Category</Text>
            <View style={modalStyles.catRow}>
              {CATEGORIES.map((c) => (
                <TouchableOpacity
                  key={c}
                  style={StyleSheet.flatten([
                    modalStyles.catBtn,
                    { borderColor: CATEGORY_COLORS[c] },
                    category === c && { backgroundColor: CATEGORY_COLORS[c] },
                  ])}
                  onPress={() => setCategory(c)}
                >
                  <Text
                    style={StyleSheet.flatten([
                      modalStyles.catBtnText,
                      { color: category === c ? "#fff" : CATEGORY_COLORS[c] },
                    ])}
                  >
                    {c.charAt(0).toUpperCase() + c.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          <View style={modalStyles.actions}>
            <TouchableOpacity style={modalStyles.cancelBtn} onPress={onClose}>
              <Text style={modalStyles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={modalStyles.saveBtn} onPress={handleSave}>
              <Text style={modalStyles.saveText}>Save Task</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

export default TaskModal;

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#F5F1E8",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: "85%",
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  sheetTitle: { fontSize: 17, fontWeight: "800", color: "#1A0808" },
  fieldLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#9A7070",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    backgroundColor: "#fff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#EAD8D8",
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#1A0808",
  },
  textArea: { minHeight: 72, textAlignVertical: "top" },
  catRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  catBtn: {
    borderWidth: 1.5,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  catBtnText: { fontSize: 12, fontWeight: "600" },
  actions: { flexDirection: "row", gap: 10, marginTop: 20 },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "#EAD8D8",
    alignItems: "center",
  },
  cancelText: { fontSize: 14, fontWeight: "700", color: "#9A7070" },
  saveBtn: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "#C94C3C",
    alignItems: "center",
  },
  saveText: { fontSize: 14, fontWeight: "700", color: "#fff" },
});
