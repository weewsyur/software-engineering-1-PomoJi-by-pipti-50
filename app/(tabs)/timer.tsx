import PostActivityModal from "@/app/components/PostActivityModal";
import { Colors, useColors } from "@/constants/colors";
import { SharedStyles } from "@/constants/styles";
import { useActivities } from "@/hooks/useActivities";
import { Task, TaskCategory, useSessions, useTasks } from "@/hooks/usePomodoro";
import { useTimerPersistence } from "@/hooks/useTimerPersistence";
import { useStrictFocusMode } from "@/hooks/useStrictFocusMode";
import { LucideIcon } from "@/app/components/LucideIcon";
import { useTheme } from "@/contexts/ThemeContext";
import { Plus, Square, Play, Pause, Clipboard, AlertTriangle } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocalSearchParams } from "expo-router";
import { getLocalISODateTime } from "@/utils/dateHelpers";
import {
  Alert,
  Animated,
  Easing,
  FlatList,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { TaskModal } from "@/app/components/timer/TaskModal";
import { TaskRow } from "@/app/components/timer/TaskRow";
import { BreakBanner } from "@/app/components/timer/BreakBanner";
import { TaskPicker } from "@/app/components/timer/TaskPicker";
import { scheduleSessionCompletionNotification } from "@/services/notificationService";

// ─── Types ────────────────────────────────────────────────────────────────────

type TimerMode = "focus" | "short" | "long";

// ─── Constants ────────────────────────────────────────────────────────────────

const MODES: { key: TimerMode; label: string; duration: number }[] = [
  { key: "focus", label: "Focus", duration: 25 * 60 },
  { key: "short", label: "Short Break", duration: 5 * 60 },
  { key: "long", label: "Long Break", duration: 15 * 60 },
];

const SESSIONS_BEFORE_LONG_BREAK = 4;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatTime = (s: number) => {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
};

const isTaskCategory = (value: unknown): value is TaskCategory =>
  value === "work" ||
  value === "study" ||
  value === "personal" ||
  value === "health" ||
  value === "other";

const getTaskCategory = (task: Task): TaskCategory =>
  isTaskCategory(task?.category) ? task.category : "other";

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function TimerScreen() {
  const { isDarkMode } = useTheme();
  const colors = useColors(isDarkMode);

  // ── Timer state ──────────────────────────────────────────────────────────
  const [mode, setMode] = useState<TimerMode>("focus");
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [sessions, setSessions] = useState(0);
  const [streakCount, setStreakCount] = useState(0);

  // ── Timer persistence ─────────────────────────────────────────────────────
  const { timerState, isLoaded: timerLoaded, updateTimerState, resetTimerState } = useTimerPersistence();

  // Load persisted timer state
  useEffect(() => {
    if (timerLoaded && timerState.startTime === null) {
      // Only load if timer wasn't running (to avoid conflicts)
      setMode(timerState.mode);
      setTimeLeft(timerState.timeLeft);
      setIsRunning(timerState.isRunning);
      setHasStarted(timerState.hasStarted);
      setSessions(timerState.sessions);
      setStreakCount(timerState.streakCount);
    }
  }, [timerLoaded, timerState]);

  // Save timer state on changes
  useEffect(() => {
    if (timerLoaded) {
      updateTimerState({
        mode,
        timeLeft,
        isRunning,
        hasStarted,
        sessions,
        streakCount,
        startTime: hasStarted && isRunning ? sessionStartTimeRef.current : null,
        pausedAt: pauseStartedAtRef.current,
        pausedAccumulated: pausedAccumulatedMsRef.current,
      });
    }
  }, [mode, timeLeft, isRunning, hasStarted, sessions, streakCount, timerLoaded, updateTimerState]);

  // ── Strict focus mode ─────────────────────────────────────────────────────
  const { state: focusState, startFocusMode, stopFocusMode, onFocusInvalidated } = useStrictFocusMode({
    enabled: true,
    invalidateOnTabSwitch: true,
    invalidateOnMinimize: true,
    invalidateOnVisibilityChange: true,
    warningThreshold: 5,
  });

  // Start focus mode when timer starts
  useEffect(() => {
    if (hasStarted && mode === "focus") {
      startFocusMode();
    } else {
      stopFocusMode();
    }
  }, [hasStarted, mode, startFocusMode, stopFocusMode]);

  // Handle focus violation
  const handleFocusViolation = useCallback(() => {
    if (hasStarted && isRunning && mode === "focus") {
      // Pause timer on focus violation
      setIsRunning(false);
      if (mode === "focus" && sessionStartTimeRef.current && !pauseStartedAtRef.current) {
        pauseStartedAtRef.current = Date.now();
      }
      Alert.alert(
        "Focus Session Interrupted",
        "You left the app during your focus session. The timer has been paused.",
        [{ text: "OK" }]
      );
    }
  }, [hasStarted, isRunning, mode]);

  useEffect(() => {
    onFocusInvalidated(handleFocusViolation);
  }, [onFocusInvalidated, handleFocusViolation]);

  // Memoize timer duration calculations
  const currentModeDuration = useMemo(() => {
    const modeConfig = MODES.find((m) => m.key === mode);
    return modeConfig?.duration || 25 * 60;
  }, [mode]);

  // ── Task & Session state ───────────────────────────────────────────────
  const {
    tasks,
    createTask: createTaskRaw,
    updateTask,
    deleteTask,
    completeTask,
    addTimeToTask,
  } = useTasks();
  const { createSession } = useSessions();
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
  const { taskId } = useLocalSearchParams<{ taskId?: string }>();

  // ── Refs ─────────────────────────────────────────────────────────────────
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const glowRef = useRef(new Animated.Value(0)).current;
  // Keep latest activeTask accessible inside interval closure
  const activeTaskRef = useRef<Task | null>(null);
  useEffect(() => {
    activeTaskRef.current = activeTask;
  }, [activeTask]);

  useEffect(() => {
    if (!taskId) return;
    const next = tasks.find((task) => task.id === taskId) ?? null;
    if (next) {
      setActiveTask(next);
      setShowTasks(true);
    }
  }, [taskId, tasks]);

  const currentMode = MODES.find((m) => m.key === mode)!;

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
                date: getLocalISODateTime(),
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
              setPostActivityVisible(true);

              // Show confirmation Alert with session results
              const taskName =
                activeTaskRef.current?.title ?? "Unassigned Session";
              const durationText = `${Math.floor(durationSeconds / 60)}m ${durationSeconds % 60}s`;

              scheduleSessionCompletionNotification({
                taskId: activeTaskRef.current?.id ?? null,
                taskTitle: taskName,
                durationSeconds,
              }).catch(() => null);

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

  const handleStart = useCallback(() => {
    setCanRecordSession(false);
    if (mode === "focus") {
      sessionStartTimeRef.current = Date.now();
      pauseStartedAtRef.current = null;
      pausedAccumulatedMsRef.current = 0;
    }
    setHasStarted(true);
    setIsRunning(true);
  }, [mode]);

  const handlePause = useCallback(() => {
    if (
      mode === "focus" &&
      sessionStartTimeRef.current &&
      !pauseStartedAtRef.current
    ) {
      pauseStartedAtRef.current = Date.now();
    }
    setIsRunning(false);
  }, [mode]);

  const handleResume = useCallback(() => {
    if (mode === "focus" && pauseStartedAtRef.current) {
      pausedAccumulatedMsRef.current += Date.now() - pauseStartedAtRef.current;
      pauseStartedAtRef.current = null;
    }
    setIsRunning(true);
  }, [mode]);

  const handleStop = useCallback(() => {
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
  }, [mode, activeTask, sessions, currentMode.duration]);

  const handleModeSwitch = useCallback((m: TimerMode) => {
    setMode(m);
    setIsRunning(false);
    setHasStarted(false);
    setCanRecordSession(false);
    setTimeLeft(MODES.find((x) => x.key === m)!.duration);
    sessionStartTimeRef.current = null;
    pauseStartedAtRef.current = null;
    pausedAccumulatedMsRef.current = 0;
  }, []);

  const handleSkipBreak = useCallback(() => {
    setMode("focus");
    setTimeLeft(25 * 60);
    setIsRunning(false);
    setHasStarted(false);
    setCanRecordSession(false);
    pauseStartedAtRef.current = null;
    pausedAccumulatedMsRef.current = 0;
  }, []);

  // ── FR-03: Task Management (FIXED – uses hook methods, not setTasks) ───

  const handleSaveTask = useCallback(async (task: Task) => {
    try {
      const exists = tasks.find((t) => t.id === task.id);
      if (exists) {
        await updateTask(task.id, {
          title: task.title,
          description: task.description,
          dueDate: task.dueDate,
          category: task.category,
          completed: task.completed,
          reminderEnabled: Boolean(task.dueDate?.trim()),
          totalTime: task.totalTime,
        });
      } else {
        // New task: let Firestore generate ID, pass empty string as placeholder
        await createTaskRaw({
          ...task,
          id: "", // Firestore will generate the ID
          reminderEnabled: Boolean(task.dueDate?.trim()),
        });
      }
      setTaskModalVisible(false);
      setEditingTask(null);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to save task. Please try again.";
      Alert.alert("Error", message);
    }
  }, [tasks, updateTask, createTaskRaw]);

  const handleToggleTask = useCallback(async (id: string) => {
    try {
      const task = tasks.find((t) => t.id === id);
      if (task) await completeTask(id, !task.completed);
    } catch {
      Alert.alert("Error", "Failed to update task. Please try again.");
    }
  }, [tasks, completeTask]);

  const handleDeleteTask = useCallback(async (id: string) => {
    try {
      await deleteTask(id);
      // Clear active task if it was deleted
      if (activeTask?.id === id) {
        setActiveTask(null);
      }
    } catch {
      Alert.alert("Error", "Failed to delete task. Please try again.");
    }
  }, [deleteTask, activeTask?.id]);

  const openNewTask = useCallback(() => {
    setEditingTask(null);
    setTaskModalVisible(true);
  }, []);

  const openEditTask = useCallback((task: Task) => {
    setEditingTask(task);
    setTaskModalVisible(true);
  }, []);

  // ── Derived ──────────────────────────────────────────────────────────────
  const SIZE = 240;
  const pendingTasks = useMemo(() => tasks.filter((t) => !t.completed).length, [tasks]);

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <SafeAreaView
      style={StyleSheet.flatten([SharedStyles.screen, styles.safe, { backgroundColor: colors.background }])}
    >
      <ScrollView
        contentContainerStyle={{ paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <StatusBar
          barStyle={isDarkMode ? "light-content" : "dark-content"}
          backgroundColor={colors.background}
        />

        {/* Header */}
        <View style={[styles.header, { backgroundColor: colors.background }]}>
          <Text style={[styles.headerLabel, { color: colors.textMuted }]}>TIMER</Text>
          <View style={styles.headerActions}>
            {focusState.warningActive && (
              <View style={[styles.focusWarning, { backgroundColor: "#f59e0b" }]}>
                <AlertTriangle size={16} color="#fff" />
                <Text style={styles.focusWarningText}>Return to app!</Text>
              </View>
            )}
            <TouchableOpacity
              style={styles.tasksToggle}
              onPress={() => setShowTasks((v) => !v)}
            >
              {pendingTasks > 0 && (
                <View style={[styles.badge, { backgroundColor: colors.primary }]}>
                  <Text style={[styles.badgeText, { color: colors.surface }]}>{pendingTasks}</Text>
                </View>
              )}
              <LucideIcon
                name={showTasks ? "list" : "list-outline"}
                size={20}
                color={showTasks ? colors.primary : colors.textMuted}
              />
            </TouchableOpacity>
          </View>
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
              { backgroundColor: colors.surface, borderColor: colors.border },
            ])}
          >
            <Text style={[styles.activeTaskLabel, { color: colors.textMuted }]}>Active Task</Text>
            <TouchableOpacity
              style={styles.activeTaskButton}
              onPress={() => setTaskPickerVisible(true)}
              disabled={hasStarted}
            >
              <View style={styles.activeTaskTextWrap}>
                <Text style={[styles.activeTaskTitle, { color: colors.text }]} numberOfLines={1}>
                  {activeTask?.title ?? "Unassigned Session"}
                </Text>
                <Text style={[styles.activeTaskHint, { color: colors.textMuted }]}>
                  {hasStarted
                    ? "Locked during this session"
                    : "Tap to choose task"}
                </Text>
              </View>
              <LucideIcon
                name="chevron-down"
                size={18}
                color={colors.textMuted}
              />
            </TouchableOpacity>
          </View>
        )}

        {/* Controls */}
        <View style={styles.controls}>
          {hasStarted ? (
            <TouchableOpacity style={styles.resetBtn} onPress={handleStop}>
              <LucideIcon name="stop" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          ) : (
            <View style={styles.resetBtn} />
          )}

          {!hasStarted ? (
            <TouchableOpacity style={[styles.playBtn, { backgroundColor: colors.primary }]} onPress={handleStart}>
              <LucideIcon name="play" size={28} color={colors.surface} />
            </TouchableOpacity>
          ) : isRunning ? (
            <TouchableOpacity style={[styles.playBtn, { backgroundColor: colors.primary }]} onPress={handlePause}>
              <LucideIcon name="pause" size={28} color={colors.surface} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={StyleSheet.flatten([styles.playBtn, styles.resumeBtn, { backgroundColor: colors.primary }])}
              onPress={handleResume}
            >
              <LucideIcon name="play" size={28} color={colors.surface} />
            </TouchableOpacity>
          )}

          <View style={[styles.sessionBadge, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.sessionCount, { color: colors.text }]}>{sessions}</Text>
            <Text style={[styles.sessionLabel, { color: colors.textMuted }]}>done</Text>
          </View>
        </View>

        {hasStarted && !isRunning && canRecordSession && (
          <TouchableOpacity
            style={[styles.recordSessionBtn, { backgroundColor: colors.primary }]}
            onPress={() => setPostActivityVisible(true)}
          >
            <Text style={[styles.recordSessionBtnText, { color: colors.surface }]}>Record Session</Text>
          </TouchableOpacity>
        )}

        {/* Session info card */}
        <View style={StyleSheet.flatten([SharedStyles.card, styles.infoCard, { backgroundColor: colors.surface, borderColor: colors.border }])}>
          <View style={styles.infoRow}>
            <View style={styles.infoBlock}>
              <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Sessions Today</Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>{sessions}</Text>
            </View>
            <View style={[styles.infoDivider, { backgroundColor: colors.border }]} />
            <View style={styles.infoBlock}>
              <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Focus Time</Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>
                {Math.floor((sessions * 25) / 60)}h {(sessions * 25) % 60}m
              </Text>
            </View>
            <View style={[styles.infoDivider, { backgroundColor: colors.border }]} />
            <View style={styles.infoBlock}>
              <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Tasks Left</Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>{pendingTasks}</Text>
            </View>
          </View>
        </View>

        {/* Task list panel */}
        {showTasks && (
          <View
            style={StyleSheet.flatten([SharedStyles.card, styles.taskCard, { backgroundColor: colors.surface, borderColor: colors.border }])}
          >
            <View style={styles.taskHeader}>
              <Text style={[styles.taskTitle, { color: colors.text }]}>Tasks</Text>
              <TouchableOpacity style={[styles.addBtn, { backgroundColor: colors.primary }]} onPress={openNewTask}>
                <LucideIcon name="add" size={18} color={colors.surface} />
                <Text style={[styles.addBtnText, { color: colors.surface }]}>Add Task</Text>
              </TouchableOpacity>
            </View>

            {tasks.length === 0 ? (
              <View style={styles.emptyState}>
                <LucideIcon name="clipboard-outline" size={32} color={colors.textMuted} />
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>No tasks yet. Add one!</Text>
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
                removeClippedSubviews={true}
                maxToRenderPerBatch={10}
                windowSize={5}
                initialNumToRender={5}
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
        <TaskPicker
          visible={taskPickerVisible}
          tasks={tasks}
          activeTask={activeTask}
          onSelect={(task) => setActiveTask(task)}
          onClose={() => setTaskPickerVisible(false)}
        />

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
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 2,
    color: Colors.textMuted,
    textTransform: "uppercase",
  },
  focusWarning: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  focusWarningText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "600",
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