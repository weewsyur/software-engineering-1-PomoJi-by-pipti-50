import PostActivityModal from "@/app/components/PostActivityModal";
import { Colors } from "@/constants/colors";
import { SharedStyles } from "@/constants/styles";
import { useActivities } from "@/hooks/useActivities";
import { Task, TaskCategory, useSessions, useTasks } from "@/hooks/usePomodoro";
import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Easing,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// ─── Types ────────────────────────────────────────────────────────────────────

type TimerMode = "focus" | "short" | "long";

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

const CATEGORIES: TaskCategory[] = [
  "work",
  "study",
  "personal",
  "health",
  "other",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatTime = (s: number) => {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
};

const uid = () => Math.random().toString(36).slice(2, 10);
const isTaskCategory = (value: unknown): value is TaskCategory =>
  value === "work" ||
  value === "study" ||
  value === "personal" ||
  value === "health" ||
  value === "other";
const getTaskTitle = (task: Task) => {
  if (typeof task?.title === "string") return task.title;
  const nestedTitle =
    task?.title && typeof task.title === "object"
      ? (task.title as unknown as { title?: unknown }).title
      : null;
  return typeof nestedTitle === "string" ? nestedTitle : "Untitled Task";
};
const getTaskCategory = (task: Task): TaskCategory =>
  isTaskCategory(task?.category) ? task.category : "other";
const getTaskDueDate = (task: Task) =>
  typeof task?.dueDate === "string" ? task.dueDate : "";

// ─── Sub-components ───────────────────────────────────────────────────────────

const CategoryPill = ({ cat }: { cat: TaskCategory }) => (
  <View
    style={StyleSheet.flatten([
      pillStyles.pill,
      { backgroundColor: CATEGORY_COLORS[cat] + "22" },
    ])}
  >
    <View
      style={StyleSheet.flatten([
        pillStyles.dot,
        { backgroundColor: CATEGORY_COLORS[cat] },
      ])}
    />
    <Text
      style={StyleSheet.flatten([
        pillStyles.label,
        { color: CATEGORY_COLORS[cat] },
      ])}
    >
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

// ─── Task Row ─────────────────────────────────────────────────────────────────

interface TaskRowProps {
  task: Task;
  onToggle: (id: string) => void;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
}

const TaskRow = ({ task, onToggle, onEdit, onDelete }: TaskRowProps) => (
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
        {mode === "long"
          ? "Long Break – great work on 4 sessions!"
          : "Short Break – recharge!"}
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
  const [hasStarted, setHasStarted] = useState(false);
  const [sessions, setSessions] = useState(0);
  const [streakCount, setStreakCount] = useState(0);

  // ── Task & Session state ───────────────────────────────────────────────
  const {
    tasks,
    createTask: createTaskRaw,
    updateTask,
    deleteTask,
    addTimeToTask,
  } = useTasks();
  const { createSession: createSessionRaw } = useSessions();
  const createTask = createTaskRaw as unknown as (task: Task) => void;
  const createSession = createSessionRaw as unknown as (params: {
    taskId: string | null;
    taskTitle: string;
    durationMinutes: number;
    date: string;
    mode: "focus";
  }) => void;
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [taskPickerVisible, setTaskPickerVisible] = useState(false);
  const [taskModalVisible, setTaskModalVisible] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [showTasks, setShowTasks] = useState(false);
  const [postActivityVisible, setPostActivityVisible] = useState(false);
  const [postActivityDraft, setPostActivityDraft] = useState({
    title: "Focus Session",
    sessions: 0,
    totalTimeSeconds: 0,
  });
  const [canRecordSession, setCanRecordSession] = useState(false);
  // Track when focus session started so we can record real elapsed time
  const sessionStartTimeRef = useRef<number | null>(null);
  const pauseStartedAtRef = useRef<number | null>(null);
  const pausedAccumulatedMsRef = useRef(0);
  const { createActivity } = useActivities();

  // ── Refs ─────────────────────────────────────────────────────────────────
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const glowRef = useRef(new Animated.Value(0)).current;
  // Keep latest activeTask accessible inside interval closure
  const activeTaskRef = useRef<Task | null>(null);
  useEffect(() => {
    activeTaskRef.current = activeTask;
  }, [activeTask]);

  const currentMode = MODES.find((m) => m.key === mode)!;
  const progress = timeLeft / currentMode.duration;

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
              // ── Record the completed session ──────────────────────────
              const durationMinutes = sessionStartTimeRef.current
                ? Math.round(
                    Math.max(
                      60000,
                      Date.now() -
                        sessionStartTimeRef.current -
                        pausedAccumulatedMsRef.current,
                    ) / 60000,
                  )
                : 25;
              const durationSeconds = sessionStartTimeRef.current
                ? Math.max(
                    60,
                    Math.round(
                      (Date.now() -
                        sessionStartTimeRef.current -
                        pausedAccumulatedMsRef.current) /
                        1000,
                    ),
                  )
                : 25 * 60;

              createSession({
                taskTitle: activeTaskRef.current?.title ?? "Unassigned Session",
                taskId: activeTaskRef.current?.id ?? null,
                date: new Date().toISOString(),
                durationMinutes,
                mode: "focus",
              });

              // If there was an active task, add focus time to it
              if (activeTaskRef.current) {
                addTimeToTask(activeTaskRef.current.id, durationSeconds);
              }

              sessionStartTimeRef.current = null;
              pauseStartedAtRef.current = null;
              pausedAccumulatedMsRef.current = 0;

              const newSessions = sessions + 1;
              setSessions(newSessions);
              setStreakCount((prev) =>
                prev + 1 >= SESSIONS_BEFORE_LONG_BREAK ? 0 : prev + 1,
              );
              setPostActivityDraft({
                title: activeTaskRef.current?.title ?? "Focus Session",
                sessions: newSessions,
                totalTimeSeconds: durationSeconds,
              });
              setCanRecordSession(true);

              // Show confirmation Alert with session results
              const taskName =
                activeTaskRef.current?.title ?? "Unassigned Session";
              const durationText = `${Math.floor(durationSeconds / 60)}m ${durationSeconds % 60}s`;

              Alert.alert(
                "Session Complete!",
                `Task: ${taskName}\nDuration: ${durationText}\nSessions completed: ${newSessions}`,
                [
                  {
                    text: "OK",
                    style: "cancel",
                  },
                ],
              );
            } else {
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
        ]),
      ).start();
    } else {
      glowRef.setValue(0);
    }
  }, [isRunning]);

  // ── FR-04: Timer Controls ───────────────────────────────────────────────

  const handleStart = () => {
    setCanRecordSession(false);
    if (mode === "focus") {
      sessionStartTimeRef.current = Date.now();
      pauseStartedAtRef.current = null;
      pausedAccumulatedMsRef.current = 0;
    }
    setHasStarted(true);
    setIsRunning(true);
  };

  const handlePause = () => {
    if (
      mode === "focus" &&
      sessionStartTimeRef.current &&
      !pauseStartedAtRef.current
    ) {
      pauseStartedAtRef.current = Date.now();
    }
    setIsRunning(false);
  };

  const handleResume = () => {
    if (mode === "focus" && pauseStartedAtRef.current) {
      pausedAccumulatedMsRef.current += Date.now() - pauseStartedAtRef.current;
      pauseStartedAtRef.current = null;
    }
    setIsRunning(true);
  };

  const handleStop = () => {
    setIsRunning(false);
    if (mode === "focus" && sessionStartTimeRef.current) {
      const elapsedSeconds = Math.max(
        60,
        Math.round(
          (Date.now() -
            sessionStartTimeRef.current -
            pausedAccumulatedMsRef.current) /
            1000,
        ),
      );
      setPostActivityDraft({
        title: activeTask?.title ?? "Focus Session",
        sessions,
        totalTimeSeconds: elapsedSeconds,
      });
      setCanRecordSession(true);
    }
    setTimeLeft(currentMode.duration);
    sessionStartTimeRef.current = null;
    pauseStartedAtRef.current = null;
    pausedAccumulatedMsRef.current = 0;
  };

  const handleModeSwitch = (m: TimerMode) => {
    setMode(m);
    setIsRunning(false);
    setHasStarted(false);
    setCanRecordSession(false);
    setTimeLeft(MODES.find((x) => x.key === m)!.duration);
    sessionStartTimeRef.current = null;
    pauseStartedAtRef.current = null;
    pausedAccumulatedMsRef.current = 0;
  };

  const handleSkipBreak = () => {
    setMode("focus");
    setTimeLeft(25 * 60);
    setIsRunning(false);
    setHasStarted(false);
    setCanRecordSession(false);
    pauseStartedAtRef.current = null;
    pausedAccumulatedMsRef.current = 0;
  };

  // ── FR-03: Task Management (FIXED – uses hook methods, not setTasks) ───

  const handleSaveTask = (task: Task) => {
    const exists = tasks.find((t) => t.id === task.id);
    if (exists) {
      updateTask(task.id, task);
    } else {
      createTask(task);
    }
    setTaskModalVisible(false);
    setEditingTask(null);
  };

  const handleToggleTask = (id: string) => {
    const task = tasks.find((t) => t.id === id);
    if (task) updateTask(id, { completed: !task.completed });
  };

  const handleDeleteTask = (id: string) => {
    deleteTask(id);
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
  const pendingTasks = tasks.filter((t) => !t.completed).length;

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <SafeAreaView
      style={StyleSheet.flatten([SharedStyles.screen, styles.safe])}
    >
      <ScrollView
        contentContainerStyle={{ paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <StatusBar
          barStyle="dark-content"
          backgroundColor={Colors.background}
        />

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerLabel}>TIMER</Text>
          <TouchableOpacity
            style={styles.tasksToggle}
            onPress={() => setShowTasks((v) => !v)}
          >
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

        <BreakBanner mode={mode} onSkip={handleSkipBreak} />

        {/* Mode selector */}
        <View style={styles.modeRow}>
          {MODES.map((m) => (
            <TouchableOpacity
              key={m.key}
              style={StyleSheet.flatten([
                styles.modeBtn,
                ...(mode === m.key ? [styles.modeBtnActive] : []),
              ])}
              onPress={() => handleModeSwitch(m.key)}
            >
              <Text
                style={StyleSheet.flatten([
                  styles.modeBtnText,
                  ...(mode === m.key ? [styles.modeBtnTextActive] : []),
                ])}
              >
                {m.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Timer circle */}
        <View style={styles.timerContainer}>
          <Animated.View
            style={StyleSheet.flatten([
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
            ])}
          >
            <Text style={styles.timeText}>{formatTime(timeLeft)}</Text>
            <Text style={styles.modeLabel}>{currentMode.label}</Text>
            <View style={styles.streakDots}>
              {Array.from({ length: SESSIONS_BEFORE_LONG_BREAK }).map(
                (_, i) => (
                  <View
                    key={i}
                    style={StyleSheet.flatten([
                      styles.dot,
                      i < streakCount && styles.dotFilled,
                    ])}
                  />
                ),
              )}
            </View>
          </Animated.View>
        </View>

        {/* Active task selector */}
        {mode === "focus" && (
          <View
            style={StyleSheet.flatten([
              SharedStyles.card,
              styles.activeTaskCard,
            ])}
          >
            <Text style={styles.activeTaskLabel}>Active Task</Text>
            <TouchableOpacity
              style={styles.activeTaskButton}
              onPress={() => setTaskPickerVisible(true)}
              disabled={hasStarted}
            >
              <View style={styles.activeTaskTextWrap}>
                <Text style={styles.activeTaskTitle} numberOfLines={1}>
                  {activeTask?.title ?? "Unassigned Session"}
                </Text>
                <Text style={styles.activeTaskHint}>
                  {hasStarted
                    ? "Locked during this session"
                    : "Tap to choose task"}
                </Text>
              </View>
              <Ionicons
                name="chevron-down"
                size={18}
                color={Colors.textMuted}
              />
            </TouchableOpacity>
          </View>
        )}

        {/* Controls */}
        <View style={styles.controls}>
          {hasStarted ? (
            <TouchableOpacity style={styles.resetBtn} onPress={handleStop}>
              <Ionicons name="stop" size={20} color={Colors.textMuted} />
            </TouchableOpacity>
          ) : (
            <View style={styles.resetBtn} />
          )}

          {!hasStarted ? (
            <TouchableOpacity style={styles.playBtn} onPress={handleStart}>
              <Ionicons name="play" size={28} color={Colors.surface} />
            </TouchableOpacity>
          ) : isRunning ? (
            <TouchableOpacity style={styles.playBtn} onPress={handlePause}>
              <Ionicons name="pause" size={28} color={Colors.surface} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={StyleSheet.flatten([styles.playBtn, styles.resumeBtn])}
              onPress={handleResume}
            >
              <Ionicons name="play" size={28} color={Colors.surface} />
            </TouchableOpacity>
          )}

          <View style={styles.sessionBadge}>
            <Text style={styles.sessionCount}>{sessions}</Text>
            <Text style={styles.sessionLabel}>done</Text>
          </View>
        </View>

        {hasStarted && !isRunning && canRecordSession && (
          <TouchableOpacity
            style={styles.recordSessionBtn}
            onPress={() => setPostActivityVisible(true)}
          >
            <Text style={styles.recordSessionBtnText}>Record Session</Text>
          </TouchableOpacity>
        )}

        {/* Session info card */}
        <View style={StyleSheet.flatten([SharedStyles.card, styles.infoCard])}>
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

        {/* Task list panel */}
        {showTasks && (
          <View
            style={StyleSheet.flatten([SharedStyles.card, styles.taskCard])}
          >
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

        {/* Task modal */}
        <TaskModal
          visible={taskModalVisible}
          initial={editingTask}
          onSave={handleSaveTask}
          onClose={() => {
            setTaskModalVisible(false);
            setEditingTask(null);
          }}
        />

        {/* Session task picker */}
        <Modal
          visible={taskPickerVisible}
          animationType="fade"
          transparent
          onRequestClose={() => setTaskPickerVisible(false)}
        >
          <View style={pickerStyles.overlay}>
            <View style={pickerStyles.sheet}>
              <View style={pickerStyles.header}>
                <Text style={pickerStyles.title}>Choose Focus Task</Text>
                <TouchableOpacity onPress={() => setTaskPickerVisible(false)}>
                  <Ionicons name="close" size={20} color={Colors.textMuted} />
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={StyleSheet.flatten([
                  pickerStyles.item,
                  !activeTask && pickerStyles.itemActive,
                ])}
                onPress={() => {
                  setActiveTask(null);
                  setTaskPickerVisible(false);
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
                        setActiveTask(task);
                        setTaskPickerVisible(false);
                      }}
                    >
                      <Text style={pickerStyles.itemTitle}>
                        {getTaskTitle(task)}
                      </Text>
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

        <PostActivityModal
          visible={postActivityVisible}
          defaultTitle={postActivityDraft.title}
          sessions={postActivityDraft.sessions}
          totalTimeSeconds={postActivityDraft.totalTimeSeconds}
          onSkip={() => setPostActivityVisible(false)}
          onSave={async ({ title, description, images }) => {
            try {
              await createActivity({
                title,
                description,
                sessions: postActivityDraft.sessions,
                totalTime: postActivityDraft.totalTimeSeconds,
                category: getTaskCategory(activeTask ?? ({} as Task)),
                images,
              });
              setPostActivityVisible(false);
              setCanRecordSession(false);
            } catch (e) {
              const err = e as { message?: string };
              Alert.alert(
                "Failed to save",
                err.message ?? "Unable to save activity.",
              );
            }
          }}
        />
      </ScrollView>
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
  tasksToggle: { position: "relative", padding: 4 },
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
  timerContainer: { alignItems: "center", marginBottom: 36 },
  timerCircle: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 120,
    borderWidth: 10,
    borderColor: Colors.primary,
    shadowColor: "#FFA500",
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
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
  streakDots: { flexDirection: "row", gap: 6, marginTop: 10 },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: "#C94C3C",
    backgroundColor: "transparent",
  },
  dotFilled: { backgroundColor: "#C94C3C" },
  controls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 24,
    marginBottom: 32,
  },
  recordSessionBtn: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  recordSessionBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.surface,
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
  resumeBtn: { backgroundColor: "#4C7AC9", shadowColor: "#4C7AC9" },
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
  taskCard: { marginHorizontal: 16, marginTop: 12 },
  activeTaskCard: { marginHorizontal: 16, marginBottom: 14, marginTop: -8 },
  activeTaskLabel: {
    fontSize: 10,
    color: Colors.textMuted,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 10,
  },
  activeTaskButton: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  activeTaskTextWrap: { flex: 1, marginRight: 8 },
  activeTaskTitle: { fontSize: 14, fontWeight: "700", color: Colors.text },
  activeTaskHint: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
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
