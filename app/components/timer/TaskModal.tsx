import { X, Calendar } from "lucide-react";
import { useState, useEffect } from "react";
import DateTimePicker, {
  DateTimePickerEvent,
  DateTimePickerAndroid,
} from "@react-native-community/datetimepicker";
import {
  ActivityIndicator,
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

const formatDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const parseDueDate = (dateText: string): Date | null => {
  if (!dateText) return null;
  const [yearText, monthText, dayText] = dateText.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  if (!year || !month || !day) return null;
  const parsed = new Date(year, month - 1, day);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
};

interface TaskModalProps {
  visible: boolean;
  initial?: Task | null;
  onSave: (task: Task) => Promise<void>;
  onClose: () => void;
}

export const TaskModal = ({
  visible,
  initial,
  onSave,
  onClose,
}: TaskModalProps) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [category, setCategory] = useState<TaskCategory>("work");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (initial) {
      setTitle(initial.title);
      setDescription(initial.description);
      setDueDate(initial.dueDate);
      setSelectedDate(parseDueDate(initial.dueDate));
      setCategory(initial.category);
    } else {
      setTitle("");
      setDescription("");
      setDueDate("");
      setSelectedDate(null);
      setCategory("work");
    }
    setShowDatePicker(false);
  }, [initial, visible]);

  const handleDateChange = (event: DateTimePickerEvent, date?: Date) => {
    if (event.type === "dismissed" || !date) {
      return;
    }
    const formatted = formatDate(date);
    setSelectedDate(date);
    setDueDate(formatted);
  };

  const openWebDatePicker = () => {
    const doc = (globalThis as { document?: Document }).document;
    if (!doc) return;

    const input = doc.createElement("input");
    input.type = "date";
    input.value = dueDate || formatDate(selectedDate ?? new Date());
    // Position off-screen instead of hiding with opacity/pointer-events
    input.style.position = "fixed";
    input.style.left = "-9999px";
    input.style.top = "-9999px";
    input.style.zIndex = "9999";
    input.style.visibility = "visible";

    let isCleaningUp = false;

    const cleanup = () => {
      if (isCleaningUp) return;
      isCleaningUp = true;
      if (input.parentNode) {
        input.parentNode.removeChild(input);
      }
    };

    input.addEventListener("change", () => {
      const value = input.value;
      if (!value) {
        cleanup();
        return;
      }
      const parsed = parseDueDate(value);
      setDueDate(value);
      setSelectedDate(parsed);
      // Delay cleanup to ensure state updates complete
      setTimeout(cleanup, 100);
    });

    // Only cleanup on cancel/dismiss, not on blur during selection
    input.addEventListener("cancel", cleanup);
    input.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        cleanup();
      }
    });

    doc.body.appendChild(input);

    // Try showPicker() first if available (Chrome/Edge) - must be synchronous
    const pickerInput = input as HTMLInputElement & { showPicker?: () => void };
    if (pickerInput.showPicker) {
      try {
        pickerInput.showPicker();
      } catch (e) {
        // Fallback to click() if showPicker fails
        input.click();
      }
    } else {
      // Fallback for browsers without showPicker support
      input.click();
    }
  };

  const openDatePicker = () => {
    if (Platform.OS === "web") {
      openWebDatePicker();
      return;
    }

    if (Platform.OS === "android") {
      DateTimePickerAndroid.open({
        value: selectedDate ?? new Date(),
        mode: "date",
        onChange: handleDateChange,
      });
      return;
    }

    setShowDatePicker(true);
  };

  const handleClearDueDate = () => {
    setSelectedDate(null);
    setDueDate("");
    if (Platform.OS === "android") {
      setShowDatePicker(false);
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert("Title required", "Please enter a task title.");
      return;
    }

    if (saving) return;

    const task: Task = {
      id: initial?.id ?? "", // Empty string for new tasks, Firestore will generate ID
      title: title.trim(),
      description: description.trim(),
      dueDate,
      reminderEnabled: initial?.reminderEnabled ?? Boolean(dueDate.trim()),
      category,
      completed: initial?.completed ?? false,
      totalTime: initial?.totalTime ?? 0,
      createdAt: initial?.createdAt ?? new Date().toISOString(),
    };
    try {
      setSaving(true);
      await onSave(task);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to save task. Please try again.";
      Alert.alert("Error", message);
    } finally {
      setSaving(false);
    }
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
              <X size={22} color={Colors.textMuted} strokeWidth={2.5} />
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
            <TouchableOpacity
              style={modalStyles.dateInput}
              onPress={openDatePicker}
              activeOpacity={0.8}
            >
              <Text
                style={
                  dueDate ? modalStyles.dateText : modalStyles.placeholderText
                }
              >
                {dueDate || "Select due date"}
              </Text>
              <Calendar size={18} color={Colors.textMuted} strokeWidth={2.5} />
            </TouchableOpacity>
            {Platform.OS === "ios" && showDatePicker && (
              <View style={modalStyles.datePickerContainer}>
                <DateTimePicker
                  value={selectedDate ?? new Date()}
                  mode="date"
                  display="spinner"
                  onChange={handleDateChange}
                />
                <TouchableOpacity
                  style={modalStyles.dateDoneBtn}
                  onPress={() => setShowDatePicker(false)}
                  activeOpacity={0.8}
                >
                  <Text style={modalStyles.dateDoneText}>Done</Text>
                </TouchableOpacity>
              </View>
            )}
            {Boolean(dueDate) && (
              <TouchableOpacity
                style={modalStyles.clearDateBtn}
                onPress={handleClearDueDate}
                activeOpacity={0.8}
              >
                <Text style={modalStyles.clearDateText}>Clear due date</Text>
              </TouchableOpacity>
            )}
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
            <TouchableOpacity
              style={modalStyles.cancelBtn}
              onPress={onClose}
              disabled={saving}
            >
              <Text style={modalStyles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={StyleSheet.flatten([
                modalStyles.saveBtn,
                saving ? modalStyles.saveBtnDisabled : null,
              ])}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={modalStyles.saveText}>Save Task</Text>
              )}
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
  dateInput: {
    backgroundColor: "#fff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#EAD8D8",
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 42,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dateText: { fontSize: 14, color: "#1A0808", fontWeight: "500" },
  placeholderText: { fontSize: 14, color: "#C4A8A8" },
  datePickerContainer: {
    marginTop: 8,
    backgroundColor: "#fff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#EAD8D8",
    paddingHorizontal: 8,
    paddingTop: 4,
    paddingBottom: 8,
  },
  dateDoneBtn: {
    alignSelf: "flex-end",
    marginTop: 6,
    backgroundColor: "#EAD8D8",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  dateDoneText: { fontSize: 12, fontWeight: "700", color: "#9A7070" },
  clearDateBtn: {
    alignSelf: "flex-start",
    marginTop: 8,
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  clearDateText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#9A7070",
    textDecorationLine: "underline",
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
  saveBtnDisabled: { opacity: 0.7 },
  saveText: { fontSize: 14, fontWeight: "700", color: "#fff" },
});
