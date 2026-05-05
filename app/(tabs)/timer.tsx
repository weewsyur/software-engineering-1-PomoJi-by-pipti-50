import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  StatusBar,
  Animated,
  Easing,
  Modal,
  TextInput,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/colors";
import { SharedStyles } from "@/constants/styles";

// ─── Types ────────────────────────────────────────────────────────────────────

type TimerMode = "focus" | "short" | "long";
type TaskCategory = "work" | "study" | "personal" | "health" | "other";

interface Task {
  id: string;
  title: string;
  description: string;
  dueDate: string; // ISO string – persistence handled by caller (Firebase/MongoDB)
  category: TaskCategory;
  completed: boolean;
  createdAt: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MODES: { key: TimerMode; label: string; duration: number }[] = [
  { key: "focus", label: "Focus", duration: 25 * 60 },
  { key: "short", label: "Short Break", duration: 5 * 60 },
  { key: "long", label: "Long Break", duration: 15 * 60 },
];

const SESSIONS_BEFORE_LONG_BREAK = 4;

const CATEGORY_COLORS: Record<TaskCategory, string> = {
  work: "#C94C3C",
  study: "#4C7AC9",
  personal: "#7AC94C",
  health: "#C9A44C",
  other: "#9A7AC9",
};

const CATEGORIES: TaskCategory[] = ["work", "study", "personal", "health", "other"];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatTime = (s: number) => {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
};

const uid = () => Math.random().toString(36).slice(2, 10);

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Pill showing a task category */
const CategoryPill = ({ cat }: { cat: TaskCategory }) => (
  <View style={[pillStyles.pill, { backgroundColor: CATEGORY_COLORS[cat] + "22" }]}>
    <View style={[pillStyles.dot, { backgroundColor: CATEGORY_COLORS[cat] }]} />
    <Text style={[pillStyles.label, { color: CATEGORY_COLORS[cat] }]}>
      {cat.charAt(0).toUpperCase() + cat.slice(1)}
    </Text>
  </View>
);

const pillStyles = StyleSheet.create({
  pill: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    gap: 4,
    alignSelf: "flex-start",
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  label: { fontSize: 10, fontWeight: "600" },
});

// ─── Task Modal ───────────────────────────────────────────────────────────────

interface TaskModalProps {
  visible: boolean;
  initial?: Task | null;
  onSave: (task: Task) => void;
  onClose: () => void;
}

const TaskModal = ({ visible, initial, onSave, onClose }: TaskModalProps) => {
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
      createdAt: initial?.createdAt ?? new Date().toISOString(),
    };
    onSave(task);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={modalStyles.overlay}
      >
        <View style={modalStyles.sheet}>
          {/* Header */}
          <View style={modalStyles.sheetHeader}>
            <Text style={modalStyles.sheetTitle}>{initial ? "Edit Task" : "New Task"}</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={22} color={Colors.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Title */}
            <Text style={modalStyles.fieldLabel}>Title *</Text>
            <TextInput
              style={modalStyles.input}
              placeholder="Task title"
              placeholderTextColor="#C4A8A8"
              value={title}
              onChangeText={setTitle}
            />

            {/* Description */}
            <Text style={modalStyles.fieldLabel}>Description</Text>
            <TextInput
              style={[modalStyles.input, modalStyles.textArea]}
              placeholder="Optional details…"
              placeholderTextColor="#C4A8A8"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
            />

            {/* Due date – plain text input; caller wires a date-picker if desired */}
            <Text style={modalStyles.fieldLabel}>Due Date</Text>
            <TextInput
              style={modalStyles.input}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#C4A8A8"
              value={dueDate}
              onChangeText={setDueDate}
            />

            {/* Category */}
            <Text style={modalStyles.fieldLabel}>Category</Text>
            <View style={modalStyles.catRow}>
              {CATEGORIES.map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[
                    modalStyles.catBtn,
                    { borderColor: CATEGORY_COLORS[c] },
                    category === c && { backgroundColor: CATEGORY_COLORS[c] },
                  ]}
                  onPress={() => setCategory(c)}
                >
                  <Text
                    style={[
                      modalStyles.catBtnText,
                      { color: category === c ? "#fff" : CATEGORY_COLORS[c] },
                    ]}
                  >
                    {c.charAt(0).toUpperCase() + c.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          {/* Actions */}
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
  sheetTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#1A0808",
  },
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
  textArea: {
    minHeight: 72,
    textAlignVertical: "top",
  },
  catRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  catBtn: {
    borderWidth: 1.5,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  catBtnText: { fontSize: 12, fontWeight: "600" },
  actions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 20,
  },
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

// ─── Task Row ─────────────────────────────────────────────────────────────────

interface TaskRowProps {
  task: Task;
  onToggle: (id: string) => void;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
}

const TaskRow = ({ task, onToggle, onEdit, onDelete }: TaskRowProps) => (
  <View style={taskRowStyles.row}>
    <TouchableOpacity style={taskRowStyles.check} onPress={() => onToggle(task.id)}>
      <Ionicons
        name={task.completed ? "checkmark-circle" : "ellipse-outline"}
        size={22}
        color={task.completed ? "#C94C3C" : "#C4A8A8"}
      />
    </TouchableOpacity>
    <View style={taskRowStyles.body}>
      <Text style={[taskRowStyles.title, task.completed && taskRowStyles.done]}>
        {task.title}
      </Text>
      <View style={taskRowStyles.meta}>
        <CategoryPill cat={task.category} />
        {!!task.dueDate && (
          <Text style={taskRowStyles.due}>📅 {task.dueDate}</Text>
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
          { text: "Delete", style: "destructive", onPress: () => onDelete(task.id) },
        ])
      }
    >
      <Ionicons name="trash-outline" size={16} color="#C94C3C" />
    </TouchableOpacity>
  </View>
);

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

// ─── Break Banner ─────────────────────────────────────────────────────────────

interface BreakBannerProps {
  mode: TimerMode;
  onSkip: () => void;
}

const BreakBanner = ({ mode, onSkip }: BreakBannerProps) => {
  if (mode === "focus") return null;
  return (
    <View style={bannerStyles.banner}>
      <Text style={bannerStyles.emoji}>{mode === "long" ? "🛋️" : "☕"}</Text>
      <Text style={bannerStyles.text}>
        {mode === "long" ? "Long Break – great work on 4 sessions!" : "Short Break – recharge!"}
      </Text>
      <TouchableOpacity onPress={onSkip}>
        <Text style={bannerStyles.skip}>Skip</Text>
      </TouchableOpacity>
    </View>
  );
};

const bannerStyles = StyleSheet.create({
  banner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF3CD",
    borderRadius: 10,
    marginHorizontal: 16,
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  emoji: { fontSize: 16 },
  text: { flex: 1, fontSize: 12, color: "#856404", fontWeight: "500" },
  skip: { fontSize: 12, fontWeight: "700", color: "#C94C3C" },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function TimerScreen() {
  // ── Timer state ──────────────────────────────────────────────────────────
  const [mode, setMode] = useState<TimerMode>("focus");
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  /** true once started at least once; enables "pause" vs "resume" semantics */
  const [hasStarted, setHasStarted] = useState(false);
  const [sessions, setSessions] = useState(0);
  /** sessions completed in current streak (resets after long break) */
  const [streakCount, setStreakCount] = useState(0);

  // ── Task state ───────────────────────────────────────────────────────────
  const [tasks, setTasks] = useState<Task[]>([]);
  const [taskModalVisible, setTaskModalVisible] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [showTasks, setShowTasks] = useState(false);

  // ── Refs ─────────────────────────────────────────────────────────────────
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const glowRef = useRef(new Animated.Value(0)).current;

  const currentMode = MODES.find((m) => m.key === mode)!;
  const progress = timeLeft / currentMode.duration;

  // ── FR-05: Automated Break Management ─────────────────────────────────
  /**
   * Called when a focus session timer hits zero.
   * Determines whether the next break is short or long.
   */
  const triggerAutoBreak = useCallback(
    (completedSessions: number, currentStreak: number) => {
      const newStreak = currentStreak + 1;
      setStreakCount(newStreak);

      if (newStreak >= SESSIONS_BEFORE_LONG_BREAK) {
        // Long break after 4 sessions
        setStreakCount(0);
        setMode("long");
        setTimeLeft(15 * 60);
      } else {
        // Short break after every other session
        setMode("short");
        setTimeLeft(5 * 60);
      }

      // Auto-start the break
      setHasStarted(true);
      setIsRunning(true);
    },
    []
  );

  /**
   * Called when a break timer hits zero – return to focus.
   */
  const endBreak = useCallback(() => {
    setMode("focus");
    setTimeLeft(25 * 60);
    setIsRunning(false);
    setHasStarted(false);
  }, []);

  // ── Countdown tick ───────────────────────────────────────────────────────
  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(intervalRef.current!);
            setIsRunning(false);

            if (mode === "focus") {
              // Complete a focus session
              const newSessions = sessions + 1;
              setSessions(newSessions);
              triggerAutoBreak(newSessions, streakCount);
            } else {
              // Break finished
              endBreak();
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRunning, mode]);

  // ── Glow animation ───────────────────────────────────────────────────────
  useEffect(() => {
    if (isRunning) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowRef, {
            toValue: 1,
            duration: 1500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: false,
          }),
          Animated.timing(glowRef, {
            toValue: 0,
            duration: 1500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: false,
          }),
        ])
      ).start();
    } else {
      glowRef.setValue(0);
    }
  }, [isRunning]);

  // ── FR-04: Timer Controls ───────────────────────────────────────────────

  /** Start – first press from idle state */
  const handleStart = () => {
    setHasStarted(true);
    setIsRunning(true);
  };

  /** Pause – stop the countdown, keep the time */
  const handlePause = () => setIsRunning(false);

  /** Resume – continue from where we left off */
  const handleResume = () => setIsRunning(true);

  /** Stop – reset to beginning of current mode, clear started flag */
  const handleStop = () => {
    setIsRunning(false);
    setHasStarted(false);
    setTimeLeft(currentMode.duration);
  };

  /** Manual mode switch */
  const handleModeSwitch = (m: TimerMode) => {
    setMode(m);
    setIsRunning(false);
    setHasStarted(false);
    setTimeLeft(MODES.find((x) => x.key === m)!.duration);
  };

  /** Skip current break and go back to focus */
  const handleSkipBreak = () => {
    setMode("focus");
    setTimeLeft(25 * 60);
    setIsRunning(false);
    setHasStarted(false);
  };

  // ── FR-03: Task Management ──────────────────────────────────────────────

  const handleSaveTask = (task: Task) => {
    setTasks((prev) => {
      const exists = prev.find((t) => t.id === task.id);
      return exists ? prev.map((t) => (t.id === task.id ? task : t)) : [task, ...prev];
    });
    setTaskModalVisible(false);
    setEditingTask(null);
    // TODO: persist via Firebase / MongoDB (caller responsibility)
  };

  const handleToggleTask = (id: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
    );
  };

  const handleDeleteTask = (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    // TODO: delete from Firebase / MongoDB
  };

  const openNewTask = () => {
    setEditingTask(null);
    setTaskModalVisible(true);
  };

  const openEditTask = (task: Task) => {
    setEditingTask(task);
    setTaskModalVisible(true);
  };

  // ── Derived ──────────────────────────────────────────────────────────────
  const SIZE = 240;
  const STROKE = 10;
  const RADIUS = (SIZE - STROKE) / 2;
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
  const strokeDashoffset = CIRCUMFERENCE * (1 - progress);

  const pendingTasks = tasks.filter((t) => !t.completed).length;

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={[SharedStyles.screen, styles.safe]}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerLabel}>TIMER</Text>
        {/* Tasks toggle */}
        <TouchableOpacity style={styles.tasksToggle} onPress={() => setShowTasks((v) => !v)}>
          {pendingTasks > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{pendingTasks}</Text>
            </View>
          )}
          <Ionicons
            name={showTasks ? "list" : "list-outline"}
            size={20}
            color={showTasks ? Colors.primary : Colors.textMuted}
          />
        </TouchableOpacity>
      </View>

      {/* Break Banner (FR-05) */}
      <BreakBanner mode={mode} onSkip={handleSkipBreak} />

      {/* Mode selector */}
      <View style={styles.modeRow}>
        {MODES.map((m) => (
          <TouchableOpacity
            key={m.key}
            style={[styles.modeBtn, ...(mode === m.key ? [styles.modeBtnActive] : [])]}
            onPress={() => handleModeSwitch(m.key)}
          >
            <Text
              style={[
                styles.modeBtnText,
                ...(mode === m.key ? [styles.modeBtnTextActive] : []),
              ]}
            >
              {m.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Timer circle */}
      <View style={styles.timerContainer}>
        <Animated.View
          style={[
            styles.timerCircle,
            {
              width: SIZE,
              height: SIZE,
              shadowOpacity: glowRef.interpolate({
                inputRange: [0, 1],
                outputRange: [0.2, 0.6],
              }),
              shadowRadius: glowRef.interpolate({
                inputRange: [0, 1],
                outputRange: [4, 24],
              }),
            },
          ]}
        >
          <Text style={styles.timeText}>{formatTime(timeLeft)}</Text>
          <Text style={styles.modeLabel}>{currentMode.label}</Text>
          {/* Session streak dots */}
          <View style={styles.streakDots}>
            {Array.from({ length: SESSIONS_BEFORE_LONG_BREAK }).map((_, i) => (
              <View
                key={i}
                style={[styles.dot, i < streakCount && styles.dotFilled]}
              />
            ))}
          </View>
        </Animated.View>
      </View>

      {/* FR-04: Controls – Start / Pause / Resume / Stop */}
      <View style={styles.controls}>
        {/* Stop button – only visible once started */}
        {hasStarted ? (
          <TouchableOpacity style={styles.resetBtn} onPress={handleStop}>
            <Ionicons name="stop" size={20} color={Colors.textSecondary} />
          </TouchableOpacity>
        ) : (
          <View style={styles.resetBtn} />
        )}

        {/* Primary action */}
        {!hasStarted ? (
          // Start
          <TouchableOpacity style={styles.playBtn} onPress={handleStart}>
            <Ionicons name="play" size={28} color={Colors.surface} />
          </TouchableOpacity>
        ) : isRunning ? (
          // Pause
          <TouchableOpacity style={styles.playBtn} onPress={handlePause}>
            <Ionicons name="pause" size={28} color={Colors.surface} />
          </TouchableOpacity>
        ) : (
          // Resume
          <TouchableOpacity style={[styles.playBtn, styles.resumeBtn]} onPress={handleResume}>
            <Ionicons name="play" size={28} color={Colors.surface} />
          </TouchableOpacity>
        )}

        {/* Session count badge */}
        <View style={styles.sessionBadge}>
          <Text style={styles.sessionCount}>{sessions}</Text>
          <Text style={styles.sessionLabel}>done</Text>
        </View>
      </View>

      {/* Session info card */}
      <View style={[SharedStyles.card, styles.infoCard]}>
        <View style={styles.infoRow}>
          <View style={styles.infoBlock}>
            <Text style={styles.infoLabel}>Sessions Today</Text>
            <Text style={styles.infoValue}>{sessions}</Text>
          </View>
          <View style={styles.infoDivider} />
          <View style={styles.infoBlock}>
            <Text style={styles.infoLabel}>Focus Time</Text>
            <Text style={styles.infoValue}>
              {Math.floor((sessions * 25) / 60)}h {(sessions * 25) % 60}m
            </Text>
          </View>
          <View style={styles.infoDivider} />
          <View style={styles.infoBlock}>
            <Text style={styles.infoLabel}>Tasks Left</Text>
            <Text style={styles.infoValue}>{pendingTasks}</Text>
          </View>
        </View>
      </View>

      {/* ── FR-03: Task list panel ────────────────────────────────────────── */}
      {showTasks && (
        <View style={[SharedStyles.card, styles.taskCard]}>
          <View style={styles.taskHeader}>
            <Text style={styles.taskTitle}>Tasks</Text>
            <TouchableOpacity style={styles.addBtn} onPress={openNewTask}>
              <Ionicons name="add" size={18} color="#fff" />
              <Text style={styles.addBtnText}>Add Task</Text>
            </TouchableOpacity>
          </View>

          {tasks.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="clipboard-outline" size={32} color="#C4A8A8" />
              <Text style={styles.emptyText}>No tasks yet. Add one!</Text>
            </View>
          ) : (
            <FlatList
              data={tasks}
              keyExtractor={(t) => t.id}
              renderItem={({ item }) => (
                <TaskRow
                  task={item}
                  onToggle={handleToggleTask}
                  onEdit={openEditTask}
                  onDelete={handleDeleteTask}
                />
              )}
              scrollEnabled={false}
            />
          )}
        </View>
      )}

      {/* Task modal (create / edit) */}
      <TaskModal
        visible={taskModalVisible}
        initial={editingTask}
        onSave={handleSaveTask}
        onClose={() => {
          setTaskModalVisible(false);
          setEditingTask(null);
        }}
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  headerLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 2,
    color: Colors.textMuted,
    textTransform: "uppercase",
  },
  tasksToggle: {
    position: "relative",
    padding: 4,
  },
  badge: {
    position: "absolute",
    top: -2,
    right: -2,
    backgroundColor: "#C94C3C",
    borderRadius: 8,
    width: 16,
    height: 16,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  badgeText: { fontSize: 9, fontWeight: "800", color: "#fff" },
  modeRow: {
    flexDirection: "row",
    marginHorizontal: 16,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 4,
    marginBottom: 32,
  },
  modeBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 9,
  },
  modeBtnActive: { backgroundColor: Colors.primary },
  modeBtnText: { fontSize: 12, fontWeight: "600", color: Colors.textMuted },
  modeBtnTextActive: { color: Colors.surface },
  timerContainer: {
    alignItems: "center",
    marginBottom: 36,
  },
  timerCircle: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 120,
    borderWidth: 10,
    borderColor: Colors.primary,
    shadowColor: "#FFA500",
    shadowOffset: { width: 5, height: 5 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 10,
  },
  timeText: {
    fontSize: 52,
    fontWeight: "800",
    color: Colors.text,
    letterSpacing: -2,
  },
  modeLabel: {
    fontSize: 13,
    color: Colors.textMuted,
    fontWeight: "500",
    marginTop: 4,
  },
  streakDots: {
    flexDirection: "row",
    gap: 6,
    marginTop: 10,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: "#C94C3C",
    backgroundColor: "transparent",
  },
  dotFilled: {
    backgroundColor: "#C94C3C",
  },
  controls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 24,
    marginBottom: 32,
  },
  resetBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  playBtn: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  resumeBtn: {
    backgroundColor: "#4C7AC9", // blue tint to signal "resume"
    shadowColor: "#4C7AC9",
  },
  sessionBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  sessionCount: { fontSize: 16, fontWeight: "800", color: Colors.text },
  sessionLabel: { fontSize: 9, color: Colors.textMuted, fontWeight: "500" },
  infoCard: { marginHorizontal: 16 },
  infoRow: { flexDirection: "row", alignItems: "center" },
  infoBlock: { flex: 1, alignItems: "center", gap: 4 },
  infoDivider: { width: 1, height: 32, backgroundColor: Colors.border },
  infoLabel: { fontSize: 11, color: Colors.textMuted, fontWeight: "500" },
  infoValue: {
    fontSize: 22,
    fontWeight: "800",
    color: Colors.text,
    letterSpacing: -0.5,
  },
  taskCard: {
    marginHorizontal: 16,
    marginTop: 12,
  },
  taskHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  taskTitle: { fontSize: 14, fontWeight: "800", color: Colors.text },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#C94C3C",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  addBtnText: { fontSize: 12, fontWeight: "700", color: "#fff" },
  emptyState: { alignItems: "center", paddingVertical: 20, gap: 8 },
  emptyText: { fontSize: 13, color: "#C4A8A8", fontWeight: "500" },
});