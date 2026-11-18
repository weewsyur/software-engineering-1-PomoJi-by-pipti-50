import PostActivityModal from "@/app/components/PostActivityModal";
import { Colors, useColors } from "@/constants/colors";
import { SharedStyles } from "@/constants/styles";
import { useActivities } from "@/hooks/useActivities";
import { Task, TaskCategory, useSessions, useTasks } from "@/hooks/usePomodoro";
import { useTimerPersistence, type TimerMode } from "@/hooks/useTimerPersistence";
import { LucideIcon } from "@/components/LucideIcon";
import { useTheme } from "@/contexts/ThemeContext";
import { Settings2 } from "lucide-react-native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocalSearchParams } from "expo-router";
import { getLocalISODateTime } from "@/utils/dateHelpers";
import {
  Alert,
  Animated,
  Easing,
  FlatList,
  ScrollView,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { TaskModal } from "@/app/components/timer/TaskModal";
import { TaskRow } from "@/app/components/timer/TaskRow";
import { BreakBanner } from "@/app/components/timer/BreakBanner";
import { TaskPicker } from "@/app/components/timer/TaskPicker";
import { initializeNotifications } from "@/services/notificationService";
import { createSessionCompleteNotification } from "@/services/notificationPersistence";
import { db } from "@/services/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { soundService } from "@/services/soundService";
import { shadowStyle } from "@/utils/shadowStyle";
import { MoodCheckInModal, useMoodCheckIn } from "@/wellness";

// ─── Constants ────────────────────────────────────────────────────────────────

const MODES: { key: TimerMode; label: string }[] = [
  { key: "focus", label: "Focus" },
  { key: "short", label: "Break" },
];

const MIN_DURATION_MINUTES = 1;
const MAX_DURATION_MINUTES = 180;

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
  const { user } = useAuth();
  const mood = useMoodCheckIn({ firestore: db, userId: user?.uid });

  // ── Timer state ──────────────────────────────────────────────────────────
  const [mode, setMode] = useState<TimerMode>("focus");
  const [timeLeft, setTimeLeft] = useState(30 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [activeDurationMinutes, setActiveDurationMinutes] = useState<
    number | null
  >(null);
  const [sessions, setSessions] = useState(0);
  const [totalFocusSeconds, setTotalFocusSeconds] = useState(0);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [focusDurationDraft, setFocusDurationDraft] = useState("30");
  const [breakDurationDraft, setBreakDurationDraft] = useState("5");
  const [durationError, setDurationError] = useState<string | null>(null);
  const timerStateRestoredRef = useRef(false);

  // ── Timer persistence ─────────────────────────────────────────────────────
  const {
    timerState,
    isLoaded: timerLoaded,
    updateTimerState,
  } = useTimerPersistence();
  const { focusDurationMinutes, breakDurationMinutes } = timerState;

  // Load persisted timer state on mount
  useEffect(() => {
    if (!timerLoaded || timerStateRestoredRef.current) return;
    if (hasStarted) {
      timerStateRestoredRef.current = true;
      return;
    }

    timerStateRestoredRef.current = true;
    setMode(timerState.mode);
    setTimeLeft(timerState.timeLeft);
    setIsRunning(timerState.isRunning);
    setHasStarted(timerState.hasStarted);
    setActiveDurationMinutes(timerState.activeDurationMinutes);
    setSessions(timerState.sessions);
    setTotalFocusSeconds(timerState.totalFocusSeconds);
    sessionStartTimeRef.current = timerState.startTime;
    pauseStartedAtRef.current = timerState.pausedAt;
    pausedAccumulatedMsRef.current = timerState.pausedAccumulated;
  }, [
    timerLoaded,
    timerState.mode,
    timerState.timeLeft,
    timerState.isRunning,
    timerState.hasStarted,
    timerState.activeDurationMinutes,
    timerState.sessions,
    timerState.totalFocusSeconds,
    timerState.startTime,
    timerState.pausedAt,
    timerState.pausedAccumulated,
    hasStarted,
  ]);

  useEffect(() => {
    if (!timerLoaded) return;
    setFocusDurationDraft(String(focusDurationMinutes));
    setBreakDurationDraft(String(breakDurationMinutes));
  }, [timerLoaded, focusDurationMinutes, breakDurationMinutes]);

  useEffect(() => {
    initializeNotifications().catch(() => null);
  }, []);

  // Save timer state on changes
  useEffect(() => {
    if (timerLoaded) {
      updateTimerState({
        mode,
        timeLeft,
        isRunning,
        hasStarted,
        sessions,
        activeDurationMinutes,
        totalFocusSeconds,
        startTime:
          hasStarted && mode === "focus" ? sessionStartTimeRef.current : null,
        pausedAt: pauseStartedAtRef.current,
        pausedAccumulated: pausedAccumulatedMsRef.current,
      });
    }
  }, [
    mode,
    timeLeft,
    isRunning,
    hasStarted,
    activeDurationMinutes,
    sessions,
    totalFocusSeconds,
    timerLoaded,
    updateTimerState,
  ]);

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
  const { createActivity } = useActivities();
  const { taskId } = useLocalSearchParams<{ taskId?: string }>();

  // Track when focus session started so we can record real elapsed time
  const sessionStartTimeRef = useRef<number | null>(null);
  const pauseStartedAtRef = useRef<number | null>(null);
  const pausedAccumulatedMsRef = useRef(0);

  // ── Refs ─────────────────────────────────────────────────────────────────
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastTickAtRef = useRef<number | null>(null);
  const glowRef = useRef(new Animated.Value(0)).current;
  const timerButtonScale = useRef(new Animated.Value(1)).current;
  const stopButtonScale = useRef(new Animated.Value(1)).current;
  const taskButtonScale = useRef(new Animated.Value(1)).current;
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
  const currentDurationMinutes =
    mode === "focus" ? focusDurationMinutes : breakDurationMinutes;
  const displayDurationMinutes =
    hasStarted && activeDurationMinutes !== null
      ? activeDurationMinutes
      : currentDurationMinutes;

  const animatePressScale = useCallback(
    (anim: Animated.Value, pressed: boolean) => {
      Animated.spring(anim, {
        toValue: pressed ? 0.97 : 1,
        friction: 6,
        tension: 140,
        useNativeDriver: true,
      }).start();
    },
    [],
  );

  const endBreak = useCallback(() => {
    setMode("focus");
    setTimeLeft(focusDurationMinutes * 60);
    setIsRunning(false);
    setHasStarted(false);
    setActiveDurationMinutes(null);
  }, [focusDurationMinutes]);

  // ── Countdown tick ───────────────────────────────────────────────────────
  useEffect(() => {
    if (isRunning) {
      lastTickAtRef.current = Date.now();
      intervalRef.current = setInterval(() => {
        const now = Date.now();
        const elapsedSeconds = Math.max(
          1,
          Math.floor((now - (lastTickAtRef.current ?? now)) / 1000),
        );
        lastTickAtRef.current = now;
        setTimeLeft((prev) => {
          if (prev <= elapsedSeconds) {
            clearInterval(intervalRef.current!);
            setIsRunning(false);
            lastTickAtRef.current = null;

            if (mode === "focus") {
              soundService.playSessionComplete();
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
                  : currentDurationMinutes;
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
                : currentDurationMinutes * 60;

              void createSession({
                taskTitle: activeTaskRef.current?.title ?? "Unassigned Session",
                taskId: activeTaskRef.current?.id ?? null,
                date: getLocalISODateTime(),
                durationMinutes,
                mode: "focus",
              })
                .then((savedSessionId) => {
                  if (savedSessionId) {
                    mood.requestMoodCheckIn(savedSessionId, "focus");
                  }
                })
                .catch((error: unknown) => {
                  console.error("Failed to save completed focus session:", error);
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
              setTotalFocusSeconds((prev) => prev + durationSeconds);
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

              createSessionCompleteNotification({
                taskId: activeTaskRef.current?.id ?? null,
                taskTitle: taskName,
                durationSeconds,
                sessionsCompleted: newSessions,
              }).catch(() => null);

              Alert.alert(
                "🎉 Session Complete!",
                `Task: ${taskName}\nDuration: ${durationText}\nSessions completed: ${newSessions}`,
                [
                  {
                    text: "OK",
                    style: "cancel",
                  },
                ],
              );
            } else {
              soundService.playBreakOver();
              endBreak();
            }
            return 0;
          }
          return prev - elapsedSeconds;
        });
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
      lastTickAtRef.current = null;
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
  }, [isRunning, glowRef]);

  // ── FR-04: Timer Controls ───────────────────────────────────────────────

  const handleStart = useCallback(() => {
    setCanRecordSession(false);
    setActiveDurationMinutes(currentDurationMinutes);
    if (mode === "focus") {
      sessionStartTimeRef.current = Date.now();
      pauseStartedAtRef.current = null;
      pausedAccumulatedMsRef.current = 0;
      soundService.playSessionStart();
    } else {
      soundService.playBreakStart();
    }
    setHasStarted(true);
    setIsRunning(true);
  }, [mode, currentDurationMinutes]);

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
    setHasStarted(false);
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
    setTimeLeft(currentDurationMinutes * 60);
    setActiveDurationMinutes(null);
    sessionStartTimeRef.current = null;
    pauseStartedAtRef.current = null;
    pausedAccumulatedMsRef.current = 0;
  }, [mode, activeTask, sessions, currentDurationMinutes]);

  const handleModeSwitch = useCallback((m: TimerMode) => {
    setMode(m);
    setIsRunning(false);
    setHasStarted(false);
    setActiveDurationMinutes(null);
    setCanRecordSession(false);
    setTimeLeft(
      (m === "focus" ? focusDurationMinutes : breakDurationMinutes) * 60,
    );
    sessionStartTimeRef.current = null;
    pauseStartedAtRef.current = null;
    pausedAccumulatedMsRef.current = 0;
  }, [focusDurationMinutes, breakDurationMinutes]);

  const handleSkipBreak = useCallback(() => {
    setMode("focus");
    setTimeLeft(focusDurationMinutes * 60);
    setIsRunning(false);
    setHasStarted(false);
    setActiveDurationMinutes(null);
    setCanRecordSession(false);
    pauseStartedAtRef.current = null;
    pausedAccumulatedMsRef.current = 0;
    sessionStartTimeRef.current = null;
  }, [focusDurationMinutes]);

  const handleSaveDurations = useCallback(() => {
    const focusDuration = /^\d+$/.test(focusDurationDraft)
      ? Number(focusDurationDraft)
      : Number.NaN;
    const breakDuration = /^\d+$/.test(breakDurationDraft)
      ? Number(breakDurationDraft)
      : Number.NaN;

    if (
      !Number.isInteger(focusDuration) ||
      focusDuration < MIN_DURATION_MINUTES ||
      focusDuration > MAX_DURATION_MINUTES ||
      !Number.isInteger(breakDuration) ||
      breakDuration < MIN_DURATION_MINUTES ||
      breakDuration > MAX_DURATION_MINUTES
    ) {
      setDurationError("Enter whole minutes from 1 to 180.");
      return;
    }

    setDurationError(null);
    updateTimerState({
      focusDurationMinutes: focusDuration,
      breakDurationMinutes: breakDuration,
    });

    if (!hasStarted) {
      setTimeLeft((mode === "focus" ? focusDuration : breakDuration) * 60);
    }
    setSettingsVisible(false);
  }, [
    focusDurationDraft,
    breakDurationDraft,
    updateTimerState,
    hasStarted,
    mode,
  ]);

  // ── FR-03: Task Management (FIXED – uses hook methods, not setTasks) ───

  const handleSaveTask = useCallback(
    async (task: Task) => {
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
    },
    [tasks, updateTask, createTaskRaw],
  );

  const handleToggleTask = useCallback(
    async (id: string) => {
      try {
        const task = tasks.find((t) => t.id === id);
        if (task) await completeTask(id, !task.completed);
      } catch {
        Alert.alert("Error", "Failed to update task. Please try again.");
      }
    },
    [tasks, completeTask],
  );

  const handleDeleteTask = useCallback(
    async (id: string) => {
      try {
        await deleteTask(id);
        // Clear active task if it was deleted
        if (activeTask?.id === id) {
          setActiveTask(null);
        }
      } catch {
        Alert.alert("Error", "Failed to delete task. Please try again.");
      }
    },
    [deleteTask, activeTask?.id],
  );

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
  const pendingTasks = useMemo(
    () => tasks.filter((t) => !t.completed).length,
    [tasks],
  );

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <SafeAreaView
      style={StyleSheet.flatten([
        SharedStyles.screen,
        styles.safe,
        { backgroundColor: colors.background },
      ])}
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
          <Text style={[styles.headerLabel, { color: colors.textMuted }]}>
            TIMER
          </Text>
          <View style={styles.headerActions}>
            <Animated.View style={{ transform: [{ scale: taskButtonScale }] }}>
              <TouchableOpacity
                style={styles.tasksToggle}
                onPress={() => setShowTasks((v) => !v)}
                onPressIn={() => animatePressScale(taskButtonScale, true)}
                onPressOut={() => animatePressScale(taskButtonScale, false)}
                accessibilityRole="button"
                accessibilityHint="Toggle the task list panel"
              >
                {pendingTasks > 0 && (
                  <View
                    style={[styles.badge, { backgroundColor: colors.primary }]}
                  >
                    <Text style={[styles.badgeText, { color: colors.surface }]}>
                      {pendingTasks}
                    </Text>
                  </View>
                )}
                <LucideIcon
                  name={showTasks ? "list" : "list-outline"}
                  size={20}
                  color={showTasks ? colors.primary : colors.textMuted}
                />
              </TouchableOpacity>
            </Animated.View>
            <TouchableOpacity
              style={styles.settingsToggle}
              onPress={() => {
                if (!settingsVisible) {
                  setFocusDurationDraft(String(focusDurationMinutes));
                  setBreakDurationDraft(String(breakDurationMinutes));
                  setDurationError(null);
                }
                setSettingsVisible((visible) => !visible);
              }}
              disabled={!timerLoaded}
              accessibilityRole="button"
              accessibilityLabel="Timer settings"
              accessibilityHint="Edit focus and break durations"
            >
              <Settings2
                size={20}
                color={settingsVisible ? colors.primary : colors.textMuted}
              />
            </TouchableOpacity>
          </View>
        </View>

        {settingsVisible && (
          <View
            style={[
              SharedStyles.card,
              styles.settingsCard,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.settingsTitle, { color: colors.text }]}>
              Timer durations
            </Text>
            <View style={styles.settingsFields}>
              <View style={styles.settingsField}>
                <Text style={[styles.settingsLabel, { color: colors.textMuted }]}>
                  Focus · minutes
                </Text>
                <TextInput
                  accessibilityLabel="Focus duration in minutes"
                  style={[
                    styles.durationInput,
                    {
                      color: colors.text,
                      borderColor: colors.border,
                      backgroundColor: colors.background,
                    },
                  ]}
                  value={focusDurationDraft}
                  onChangeText={setFocusDurationDraft}
                  keyboardType="number-pad"
                  maxLength={3}
                  selectTextOnFocus
                />
              </View>
              <View style={styles.settingsField}>
                <Text style={[styles.settingsLabel, { color: colors.textMuted }]}>
                  Break · minutes
                </Text>
                <TextInput
                  accessibilityLabel="Break duration in minutes"
                  style={[
                    styles.durationInput,
                    {
                      color: colors.text,
                      borderColor: colors.border,
                      backgroundColor: colors.background,
                    },
                  ]}
                  value={breakDurationDraft}
                  onChangeText={setBreakDurationDraft}
                  keyboardType="number-pad"
                  maxLength={3}
                  selectTextOnFocus
                />
              </View>
            </View>
            {durationError && (
              <Text style={styles.durationError}>{durationError}</Text>
            )}
            <TouchableOpacity
              style={[styles.saveDurationsButton, { backgroundColor: colors.primary }]}
              onPress={handleSaveDurations}
              accessibilityRole="button"
            >
              <Text style={[styles.saveDurationsText, { color: colors.surface }]}>
                Save durations
              </Text>
            </TouchableOpacity>
          </View>
        )}

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
                ...Platform.select({
                  web: {},
                  default: {
                    shadowOpacity: glowRef.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.2, 0.6],
                    }),
                    shadowRadius: glowRef.interpolate({
                      inputRange: [0, 1],
                      outputRange: [4, 24],
                    }),
                  },
                }),
              },
            ])}
          >
            <Text style={styles.timeText}>{formatTime(timeLeft)}</Text>
            <Text style={styles.modeLabel}>
              {currentMode.label} · {displayDurationMinutes} min
            </Text>
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
            <Text style={[styles.activeTaskLabel, { color: colors.textMuted }]}>
              Active Task
            </Text>
            <Animated.View style={{ transform: [{ scale: taskButtonScale }] }}>
              <TouchableOpacity
                style={styles.activeTaskButton}
                onPress={() => setTaskPickerVisible(true)}
                disabled={hasStarted}
                onPressIn={() => animatePressScale(taskButtonScale, true)}
                onPressOut={() => animatePressScale(taskButtonScale, false)}
                accessibilityRole="button"
                accessibilityHint="Choose the active task for the timer"
              >
                <View style={styles.activeTaskTextWrap}>
                  <Text
                    style={[styles.activeTaskTitle, { color: colors.text }]}
                    numberOfLines={1}
                  >
                    {activeTask?.title ?? "Unassigned Session"}
                  </Text>
                  <Text
                    style={[styles.activeTaskHint, { color: colors.textMuted }]}
                  >
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
            </Animated.View>
          </View>
        )}

        {/* Controls */}
        <View style={styles.controls}>
          {hasStarted ? (
            <Animated.View style={{ transform: [{ scale: stopButtonScale }] }}>
              <TouchableOpacity
                style={styles.resetBtn}
                onPress={handleStop}
                onPressIn={() => animatePressScale(stopButtonScale, true)}
                onPressOut={() => animatePressScale(stopButtonScale, false)}
                accessibilityRole="button"
                accessibilityHint="Stop the current timer session"
              >
                <LucideIcon name="stop" size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </Animated.View>
          ) : (
            <View style={styles.resetBtn} />
          )}

          {!hasStarted ? (
            <Animated.View style={{ transform: [{ scale: timerButtonScale }] }}>
              <TouchableOpacity
                style={[styles.playBtn, { backgroundColor: colors.primary }]}
                onPress={handleStart}
                onPressIn={() => animatePressScale(timerButtonScale, true)}
                onPressOut={() => animatePressScale(timerButtonScale, false)}
                accessibilityRole="button"
                accessibilityHint="Start the selected timer mode"
              >
                <LucideIcon name="play" size={28} color={colors.surface} />
              </TouchableOpacity>
            </Animated.View>
          ) : isRunning ? (
            <Animated.View style={{ transform: [{ scale: timerButtonScale }] }}>
              <TouchableOpacity
                style={[styles.playBtn, { backgroundColor: colors.primary }]}
                onPress={handlePause}
                onPressIn={() => animatePressScale(timerButtonScale, true)}
                onPressOut={() => animatePressScale(timerButtonScale, false)}
                accessibilityRole="button"
                accessibilityHint="Pause the current timer session"
              >
                <LucideIcon name="pause" size={28} color={colors.surface} />
              </TouchableOpacity>
            </Animated.View>
          ) : (
            <Animated.View style={{ transform: [{ scale: timerButtonScale }] }}>
              <TouchableOpacity
                style={StyleSheet.flatten([
                  styles.playBtn,
                  styles.resumeBtn,
                  { backgroundColor: colors.primary },
                ])}
                onPress={handleResume}
                onPressIn={() => animatePressScale(timerButtonScale, true)}
                onPressOut={() => animatePressScale(timerButtonScale, false)}
                accessibilityRole="button"
                accessibilityHint="Resume the paused timer session"
              >
                <LucideIcon name="play" size={28} color={colors.surface} />
              </TouchableOpacity>
            </Animated.View>
          )}

          <View
            style={[
              styles.sessionBadge,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.sessionCount, { color: colors.text }]}>
              {sessions}
            </Text>
            <Text style={[styles.sessionLabel, { color: colors.textMuted }]}>
              done
            </Text>
          </View>
        </View>

        {!isRunning && canRecordSession && (
          <TouchableOpacity
            style={[
              styles.recordSessionBtn,
              { backgroundColor: colors.primary },
            ]}
            onPress={() => setPostActivityVisible(true)}
          >
            <Text
              style={[styles.recordSessionBtnText, { color: colors.surface }]}
            >
              Record Session
            </Text>
          </TouchableOpacity>
        )}

        {/* Session info card */}
        <View
          style={StyleSheet.flatten([
            SharedStyles.card,
            styles.infoCard,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ])}
        >
          <View style={styles.infoRow}>
            <View style={styles.infoBlock}>
              <Text style={[styles.infoLabel, { color: colors.textMuted }]}>
                Sessions Today
              </Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>
                {sessions}
              </Text>
            </View>
            <View
              style={[styles.infoDivider, { backgroundColor: colors.border }]}
            />
            <View style={styles.infoBlock}>
              <Text style={[styles.infoLabel, { color: colors.textMuted }]}>
                Focus Time
              </Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>
                {Math.floor(totalFocusSeconds / 3600)}h{" "}
                {Math.floor((totalFocusSeconds % 3600) / 60)}m
              </Text>
            </View>
            <View
              style={[styles.infoDivider, { backgroundColor: colors.border }]}
            />
            <View style={styles.infoBlock}>
              <Text style={[styles.infoLabel, { color: colors.textMuted }]}>
                Tasks Left
              </Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>
                {pendingTasks}
              </Text>
            </View>
          </View>
        </View>

        {/* Task list panel */}
        {showTasks && (
          <View
            style={StyleSheet.flatten([
              SharedStyles.card,
              styles.taskCard,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ])}
          >
            <View style={styles.taskHeader}>
              <Text style={[styles.taskTitle, { color: colors.text }]}>
                Tasks
              </Text>
              <TouchableOpacity
                style={[styles.addBtn, { backgroundColor: colors.primary }]}
                onPress={openNewTask}
              >
                <LucideIcon name="add" size={18} color={colors.surface} />
                <Text style={[styles.addBtnText, { color: colors.surface }]}>
                  Add Task
                </Text>
              </TouchableOpacity>
            </View>

            {tasks.length === 0 ? (
              <View style={styles.emptyState}>
                <LucideIcon
                  name="clipboard-outline"
                  size={32}
                  color={colors.textMuted}
                />
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                  No tasks yet. Add one!
                </Text>
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

        {/* Mood check-in modal */}
        <MoodCheckInModal
          visible={mood.visible}
          saving={mood.saving}
          errorMessage={mood.error}
          onSelect={mood.submit}
          onSkip={mood.skip}
        />

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
  settingsToggle: { padding: 4 },
  headerLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 2,
    color: Colors.textMuted,
    textTransform: "uppercase",
  },
  settingsCard: { marginHorizontal: 16, marginBottom: 16 },
  settingsTitle: { fontSize: 14, fontWeight: "700", marginBottom: 12 },
  settingsFields: { flexDirection: "row", gap: 12 },
  settingsField: { flex: 1, gap: 6 },
  settingsLabel: { fontSize: 11, fontWeight: "600" },
  durationInput: {
    borderWidth: 1,
    borderRadius: 8,
    minHeight: 40,
    paddingHorizontal: 10,
    fontSize: 15,
    fontWeight: "600",
  },
  durationError: { color: "#C94C3C", fontSize: 12, marginTop: 8 },
  saveDurationsButton: {
    alignSelf: "flex-end",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 9,
    marginTop: 12,
  },
  saveDurationsText: { fontSize: 12, fontWeight: "700" },
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
    ...shadowStyle("#FFA500", 2, 2, 8, 0.5, 8),
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
    ...shadowStyle(Colors.primary, 0, 4, 12, 0.35, 8),
  },
  resumeBtn: {
    backgroundColor: "#4C7AC9",
    ...shadowStyle("#4C7AC9", 0, 4, 12, 0.35, 8),
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
