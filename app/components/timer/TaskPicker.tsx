import { X } from "lucide-react";
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Colors } from "@/constants/colors";
import { Task } from "@/hooks/usePomodoro";
import { getTaskTitle } from "./TaskRow";

interface TaskPickerProps {
  visible: boolean;
  tasks: Task[];
  activeTask: Task | null;
  onSelect: (task: Task | null) => void;
  onClose: () => void;
}

export const TaskPicker = ({
  visible,
  tasks,
  activeTask,
  onSelect,
  onClose,
}: TaskPickerProps) => (
  <Modal
    visible={visible}
    animationType="fade"
    transparent
    onRequestClose={onClose}
  >
    <View style={pickerStyles.overlay}>
      <View style={pickerStyles.sheet}>
        <View style={pickerStyles.header}>
          <Text style={pickerStyles.title}>Choose Focus Task</Text>
          <TouchableOpacity onPress={onClose}>
            <X size={20} color={Colors.textMuted} strokeWidth={2.5} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={StyleSheet.flatten([
            pickerStyles.item,
            !activeTask && pickerStyles.itemActive,
          ])}
          onPress={() => {
            onSelect(null);
            onClose();
          }}
        >
          <Text style={pickerStyles.itemTitle}>Unassigned Session</Text>
          <Text style={pickerStyles.itemMeta}>No task linked</Text>
        </TouchableOpacity>

        <ScrollView
          style={pickerStyles.list}
          showsVerticalScrollIndicator={false}
        >
          {tasks
            .filter((task) => !task.completed)
            .map((task) => (
              <TouchableOpacity
                key={task.id}
                style={StyleSheet.flatten([
                  pickerStyles.item,
                  activeTask?.id === task.id && pickerStyles.itemActive,
                ])}
                onPress={() => {
                  onSelect(task);
                  onClose();
                }}
              >
                <Text style={pickerStyles.itemTitle}>{getTaskTitle(task)}</Text>
                <Text style={pickerStyles.itemMeta}>
                  {Math.floor(task.totalTime / 3600)}h{" "}
                  {Math.floor((task.totalTime % 3600) / 60)}m logged
                </Text>
              </TouchableOpacity>
            ))}
        </ScrollView>
      </View>
    </View>
  </Modal>
);

export default TaskPicker;

const pickerStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    paddingHorizontal: 18,
  },
  sheet: {
    backgroundColor: Colors.background,
    borderRadius: 16,
    padding: 14,
    maxHeight: "70%",
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  title: { fontSize: 16, fontWeight: "800", color: Colors.text },
  list: { marginTop: 6, flex: 1 },
  item: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 8,
    backgroundColor: Colors.surface,
  },
  itemActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + "14",
  },
  itemTitle: { fontSize: 14, fontWeight: "700", color: Colors.text },
  itemMeta: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
});
