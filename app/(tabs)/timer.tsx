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
import { useLocalSearchParams, useRouter } from "expo-router";
import { getLocalISODateTime } from "@/utils/dateHelpers";
import {
  AppState,
  Alert,
  Animated,
  Easing,
  FlatList,
  ScrollView,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { TaskModal } from "@/app/components/timer/TaskModal";
import { TaskRow } from "@/app/components/timer/TaskRow";
import { BreakBanner } from "@/app/components/timer/BreakBanner";
import { TaskPicker } from "@/app/components/timer/TaskPicker";
import {
  cancelBackgroundSessionNotification,
  cancelTimerNotifications,
  getNotificationPermissionStatus,
  initializeNotifications,
  requestTimerNotificationPermission,
  scheduleBackgroundSessionNotification,
  scheduleTimerNotifications,
} from "@/services/notificationService";
import { createSessionCompleteNotification } from "@/services/notificationPersistence";
import { db } from "@/services/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { soundService } from "@/services/soundService";
import { shadowStyle } from "@/utils/shadowStyle";
import MoodCheckInModal from "@/components/MoodCheckInModal";
import { useMoodCheckIn } from "@/hooks/useMoodCheckIn";
import { useStartSessionFlow } from "@/hooks/useStartSessionFlow";
import WarningModal from "@/components/WarningModal";
import {
  getBeforeSessionPayload,
  selectFocusPlayAction,
  useSessionFlowStore,
} from "@/store/sessionFlowStore";

// ─── Constants ────────────────────────────────────────────────────────────────

const MODES: { key: TimerMode; label: string }[] = [
  { key: "focus", label: "Focus" },
  { key: "short", label: "Break" },
];

const MIN_DURATION_MINUTES = 1;
const MAX_DURATION_MINUTES = 180;
const INACTIVITY_DELAY_MS = 15_000;
const MOTIVATIONAL_QUOTES = [
  "Small steps every day add up to big results.",
  "Focus on progress, not perfection.",
  "You are capable of more than you know.",
  "One focused moment can change your whole day.",
  "The secret of getting ahead is getting started.",
  "Stay patient and trust your journey.",
  "Your future is created by what you do today.",
  "Make this moment count.",
];

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
  const { requestMoodCheckIn, visible: moodVisible } = mood;
  const router = useRouter();
  const sessionFlow = useStartSessionFlow();
  const focusPlayAction = useSessionFlowStore(selectFocusPlayAction);
  const checksReady = focusPlayAction === "start";

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
  const [quoteVisible, setQuoteVisible] = useState(false);
  const [quote, setQuote] = useState("");
  const [interactionVersion, setInteractionVersion] = useState(0);
  const [notificationsEnabled, setNotificationsEnabled] = useState<
    boolean | null
  >(null);
  const [appIsActive, setAppIsActive] = useState(
    AppState.currentState === "active" || AppState.currentState == null,
  );
  const timerStateRestoredRef = useRef(false);
  const lastQuoteIndexRef = useRef(-1);
  const timerCompletionNotificationRef = useRef(false);
  const notificationWarningShownRef = useRef(false);
  const quoteOpacity = useRef(new Animated.Value(0)).current;
  const quoteFloat = useRef(new Animated.Value(0)).current;
  const timeLeftRef = useRef(timeLeft);
  timeLeftRef.current = timeLeft;

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
    initializeNotifications()
      .then(setNotificationsEnabled)
      .catch((error: unknown) => {
        console.error("Failed to initialize notifications:", error);
        setNotificationsEnabled(false);
      });
  }, []);

  const alertForDisabledNotifications = useCallback(
    (force = false) => {
      if (
        (!force && notificationsEnabled !== false) ||
        notificationWarningShownRef.current
      ) {
        return;
      }
      notificationWarningShownRef.current = true;

      const message =
        "PomoJI can only send session alerts when notifications are allowed. Enable them in your browser's site settings.";
      if (Platform.OS === "web") {
        if (typeof window !== "undefined") window.alert(message);
        return;
      }

      Alert.alert(
        "Notifications are disabled",
        "PomoJI can only alert you about a running or completed session when notifications are allowed. Enable them in your device settings.",
        [
          { text: "Not now", style: "cancel" },
          {
            text: "Open Settings",
            onPress: () => {
              Linking.openSettings().catch((error: unknown) => {
                console.error("Failed to open notification settings:", error);
              });
            },
          },
        ],
      );
    },
    [notificationsEnabled],
  );

  const requestNotificationsForTimer = useCallback(() => {
    if (Platform.OS !== "web") {
      alertForDisabledNotifications();
      return;
    }

    requestTimerNotificationPermission()
      .then((enabled) => {
        setNotificationsEnabled(enabled);
        if (enabled) {
          notificationWarningShownRef.current = false;
        } else {
          alertForDisabledNotifications(true);
        }
      })
      .catch((error: unknown) => {
        console.error("Failed to request browser notifications:", error);
      });
  }, [alertForDisabledNotifications]);

  const resetQuoteInactivity = useCallback(() => {
    if (!isRunning || !appIsActive) return;
    setQuoteVisible(false);
    setInteractionVersion((version) => version + 1);
  }, [appIsActive, isRunning]);

  useEffect(() => {
    if (!isRunning || !appIsActive || quoteVisible) return;

    const timeout = setTimeout(() => {
      let nextIndex = Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length);
      if (
        MOTIVATIONAL_QUOTES.length > 1 &&
        nextIndex === lastQuoteIndexRef.current
      ) {
        nextIndex = (nextIndex + 1) % MOTIVATIONAL_QUOTES.length;
      }
      lastQuoteIndexRef.current = nextIndex;
      setQuote(MOTIVATIONAL_QUOTES[nextIndex]);
      setQuoteVisible(true);
    }, INACTIVITY_DELAY_MS);

    return () => clearTimeout(timeout);
  }, [appIsActive, interactionVersion, isRunning, quoteVisible]);

  useEffect(() => {
    if (!quoteVisible) return;

    quoteOpacity.setValue(0);
    quoteFloat.setValue(0);
    const floating = Animated.loop(
      Animated.sequence([
        Animated.timing(quoteFloat, {
          toValue: 1,
          duration: 1800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(quoteFloat, {
          toValue: 0,
          duration: 1800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    Animated.timing(quoteOpacity, {
      toValue: 1,
      duration: 350,
      useNativeDriver: true,
    }).start();
    floating.start();

    return () => {
      floating.stop();
      quoteOpacity.stopAnimation();
      quoteFloat.stopAnimation();
    };
  }, [quoteFloat, quoteOpacity, quoteVisible]);

  useEffect(() => {
    const handleVisibility = (active: boolean) => {
      setAppIsActive(active);
      if (active) {
        cancelBackgroundSessionNotification().catch((error: unknown) => {
          console.error("Failed to cancel background session notice:", error);
        });
        getNotificationPermissionStatus()
          .then((enabled) => {
            setNotificationsEnabled(enabled);
            if (enabled) {
              notificationWarningShownRef.current = false;
            } else if (isRunning) {
              alertForDisabledNotifications(true);
            }
          })
          .catch((error: unknown) => {
            console.error("Failed to refresh notification permission:", error);
          });
      } else {
        setQuoteVisible(false);
        if (isRunning) {
          scheduleBackgroundSessionNotification(
            activeTaskRef.current?.title ?? "Your focus session",
          ).catch((error: unknown) => {
            console.error("Failed to schedule background session notice:", error);
          });
        }
      }
    };

    const subscription = AppState.addEventListener("change", (nextState) => {
      handleVisibility(nextState === "active");
    });
    const handleDocumentVisibility = () => {
      handleVisibility(document.visibilityState === "visible");
    };
    if (Platform.OS === "web" && typeof document !== "undefined") {
      document.addEventListener("visibilitychange", handleDocumentVisibility);
    }

    return () => {
      subscription.remove();
      if (Platform.OS === "web" && typeof document !== "undefined") {
        document.removeEventListener(
          "visibilitychange",
          handleDocumentVisibility,
        );
      }
    };
  }, [alertForDisabledNotifications, isRunning]);

  useEffect(() => {
    if (!timerLoaded || !isRunning) return;

    scheduleTimerNotifications({
      taskTitle: activeTaskRef.current?.title ?? "Your focus session",
      durationSeconds: timeLeftRef.current,
    })
      .then((scheduled) => {
        timerCompletionNotificationRef.current = scheduled;
      })
      .catch((error: unknown) => {
        console.error("Failed to schedule timer notifications:", error);
      });
  }, [isRunning, notificationsEnabled, timerLoaded]);

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
  const pendingActivityAfterMoodRef = useRef(false);
  const [postActivityDraft, setPostActivityDraft] = useState({
    title: "Focus Session",
    sessions: 0,
    totalTimeSeconds: 0,
  });
  const [canRecordSession, setCanRecordSession] = useState(false);
  const [isRecordingSession, setIsRecordingSession] = useState(false);
  const pendingSessionRef = useRef<{
    mode: TimerMode;
    durationSeconds: number;
    beforePayload: ReturnType<typeof getBeforeSessionPayload>;
  } | null>(null);
  const sessionRecordingRef = useRef(false);
  const { createActivity } = useActivities();
  const { taskId, autostart } = useLocalSearchParams<{
    taskId?: string;
    autostart?: string;
  }>();

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

  const saveCompletedSession = useCallback(
    (completedMode: TimerMode, durationSeconds: number) => {
      void createSession({
        taskTitle: activeTaskRef.current?.title ?? "Unassigned Session",
        taskId: activeTaskRef.current?.id ?? null,
        date: getLocalISODateTime(),
        durationMinutes: Math.max(1, Math.round(durationSeconds / 60)),
        mode: completedMode,
        ...(completedMode === "focus" ? getBeforeSessionPayload() : {}),
      })
        .then((savedSessionId) => {
          if (!savedSessionId) {
            throw new Error("Unable to save the session. Please try again.");
          }
          useSessionFlowStore.getState().resetBeforeCheck();
          requestMoodCheckIn(savedSessionId, completedMode);
        })
        .catch((error: unknown) => {
          console.error("Failed to save completed timer session:", error);
          const message =
            error instanceof Error
              ? error.message
              : "Unable to save the session. Please try again.";
          Alert.alert("Session not recorded", message);
        });
    },
    [createSession, requestMoodCheckIn],
  );

  const handleRecordSession = useCallback(async () => {
    const pendingSession = pendingSessionRef.current;
    if (!pendingSession || sessionRecordingRef.current) return;

    sessionRecordingRef.current = true;
    setIsRecordingSession(true);
    try {
      const savedSessionId = await createSession({
        taskTitle: activeTaskRef.current?.title ?? "Unassigned Session",
        taskId: activeTaskRef.current?.id ?? null,
        date: getLocalISODateTime(),
        durationMinutes: Math.max(1, Math.round(pendingSession.durationSeconds / 60)),
        mode: pendingSession.mode,
        ...pendingSession.beforePayload,
      });

      if (!savedSessionId) {
        throw new Error("Unable to save the session. Please try again.");
      }

      useSessionFlowStore.getState().resetBeforeCheck();
      pendingSessionRef.current = null;
      setCanRecordSession(false);
      const promptOpened = requestMoodCheckIn(savedSessionId, pendingSession.mode);
      if (!promptOpened) {
        setPostActivityVisible(true);
      } else {
        pendingActivityAfterMoodRef.current = true;
      }
    } catch (error: unknown) {
      console.error("Failed to record timer session:", error);
      const message =
        error instanceof Error
          ? error.message
          : "Unable to save the session. Please try again.";
      Alert.alert("Session not recorded", message);
    } finally {
      sessionRecordingRef.current = false;
      setIsRecordingSession(false);
    }
  }, [createSession, requestMoodCheckIn]);

  useEffect(() => {
    if (moodVisible || !pendingActivityAfterMoodRef.current) return;
    pendingActivityAfterMoodRef.current = false;
    setPostActivityVisible(true);
  }, [moodVisible]);

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
            const completionNotificationScheduled =
              timerCompletionNotificationRef.current;
            timerCompletionNotificationRef.current = false;

            if (mode === "focus") {
              soundService.playSessionComplete();
              // ── Record the completed session ──────────────────────────
              const expectedDurationSeconds =
                Math.max(1, activeDurationMinutes ?? currentDurationMinutes) *
                60;
              const durationSeconds = sessionStartTimeRef.current
                ? Math.min(
                    expectedDurationSeconds,
                    Math.max(
                      60,
                      Math.round(
                        (Date.now() -
                          sessionStartTimeRef.current -
                          pausedAccumulatedMsRef.current) /
                          1000,
                      ),
                    ),
                  )
                : expectedDurationSeconds;

              // If there was an active task, add focus time to it
              if (activeTaskRef.current) {
                addTimeToTask(activeTaskRef.current.id, durationSeconds);
              }

              // Updaters can run twice in StrictMode: only snapshot the
              // before-check payload + reset the flag on the first pass.
              if (!pendingSessionRef.current) {
                pendingSessionRef.current = {
                  mode: "focus",
                  durationSeconds,
                  beforePayload: getBeforeSessionPayload(),
                };
                // Session ended: the next session start needs a fresh check.
                // The payload above keeps the check data for "Record Session".
                useSessionFlowStore.getState().resetBeforeCheck();
              }
              sessionRecordingRef.current = false;
              setIsRecordingSession(false);

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
              createSessionCompleteNotification({
                taskId: activeTaskRef.current?.id ?? null,
                taskTitle:
                  activeTaskRef.current?.title ?? "Unassigned Session",
                durationSeconds,
                sessionsCompleted: newSessions,
                systemNotificationAlreadyScheduled:
                  completionNotificationScheduled,
              }).catch(() => null);
            } else {
              soundService.playBreakOver();
              saveCompletedSession(
                mode,
                Math.max(1, activeDurationMinutes ?? currentDurationMinutes) * 60,
              );
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
  }, [
    isRunning,
    mode,
    currentDurationMinutes,
    activeDurationMinutes,
    sessions,
    addTimeToTask,
    saveCompletedSession,
    endBreak,
  ]);

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

  const handleStart = useCallback(
    (overrideMode?: TimerMode) => {
      const startMode = overrideMode ?? mode;
      const startDuration =
        startMode === "focus" ? focusDurationMinutes : breakDurationMinutes;
      requestNotificationsForTimer();
      setCanRecordSession(false);
      pendingSessionRef.current = null;
      setActiveDurationMinutes(startDuration);
      if (startMode === "focus") {
        sessionStartTimeRef.current = Date.now();
        pauseStartedAtRef.current = null;
        pausedAccumulatedMsRef.current = 0;
        soundService.playSessionStart();
      } else {
        soundService.playBreakStart();
      }
      setHasStarted(true);
      setIsRunning(true);
    },
    [
      requestNotificationsForTimer,
      mode,
      focusDurationMinutes,
      breakDurationMinutes,
    ],
  );

  // Auto-start after the before-session check navigates back here. The check
  // screen passes a fresh ?autostart=<nonce> param per submission; each nonce
  // is consumed at most once so later session starts can auto-start again.
  // Only runs when both checks passed (selectReadyToStart).
  const consumedAutostartRef = useRef<string | null>(null);
  useEffect(() => {
    if (!autostart || autostart === consumedAutostartRef.current) return;
    if (!checksReady || hasStarted || isRunning) return;
    consumedAutostartRef.current = autostart;
    router.setParams({ autostart: undefined });
    if (mode !== "focus") {
      handleModeSwitch("focus");
      // handleModeSwitch resets state; start on the next tick with focus mode.
      setTimeout(() => handleStart("focus"), 0);
    } else {
      handleStart("focus");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autostart, checksReady, hasStarted, isRunning, mode, router]);

  const handlePause = useCallback(() => {
    cancelTimerNotifications().catch((error: unknown) => {
      console.error("Failed to cancel paused timer notifications:", error);
    });
    timerCompletionNotificationRef.current = false;
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
    requestNotificationsForTimer();
    if (mode === "focus" && pauseStartedAtRef.current) {
      pausedAccumulatedMsRef.current += Date.now() - pauseStartedAtRef.current;
      pauseStartedAtRef.current = null;
    }
    setIsRunning(true);
  }, [requestNotificationsForTimer, mode]);

  const handleStop = useCallback(() => {
    cancelTimerNotifications().catch((error: unknown) => {
      console.error("Failed to cancel stopped timer notifications:", error);
    });
    timerCompletionNotificationRef.current = false;
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
      pendingSessionRef.current = {
        mode: "focus",
        durationSeconds: elapsedSeconds,
        beforePayload: getBeforeSessionPayload(),
      };
      setCanRecordSession(true);
      // Session cancelled/reset: the next session start needs a fresh check.
      useSessionFlowStore.getState().resetBeforeCheck();
    }
    setTimeLeft(currentDurationMinutes * 60);
    setActiveDurationMinutes(null);
    sessionStartTimeRef.current = null;
    pauseStartedAtRef.current = null;
    pausedAccumulatedMsRef.current = 0;
  }, [mode, activeTask, sessions, currentDurationMinutes]);

  const handleModeSwitch = useCallback((m: TimerMode) => {
    cancelTimerNotifications().catch((error: unknown) => {
      console.error("Failed to cancel switched timer notifications:", error);
    });
    timerCompletionNotificationRef.current = false;
    pendingSessionRef.current = null;
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
    // Switching mode mid-session abandons it: next start needs a fresh check.
    // (Skipped while idle so the pre-start autostart path keeps its check.)
    if (hasStarted || isRunning) {
      useSessionFlowStore.getState().resetBeforeCheck();
    }
  }, [focusDurationMinutes, breakDurationMinutes, hasStarted, isRunning]);

  const handleSkipBreak = useCallback(() => {
    cancelTimerNotifications().catch((error: unknown) => {
      console.error("Failed to cancel skipped timer notifications:", error);
    });
    timerCompletionNotificationRef.current = false;
    pendingSessionRef.current = null;
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

  const dismissQuote = useCallback(() => {
    Animated.timing(quoteOpacity, {
      toValue: 0,
      duration: 220,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (!finished) return;
      setQuoteVisible(false);
      setInteractionVersion((version) => version + 1);
    });
  }, [quoteOpacity]);

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
      onTouchStart={resetQuoteInactivity}
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
                style={[
                  styles.playBtn,
                  { backgroundColor: colors.primary },
                  mode === "focus" && sessionFlow.checking && { opacity: 0.6 },
                ]}
                onPress={() => {
                  if (mode === "focus" && focusPlayAction === "checks") {
                    // Focus sessions require today's DASS-21 + before-check.
                    void sessionFlow.start();
                  } else {
                    // Checks already done for this session start (or Break).
                    handleStart();
                  }
                }}
                disabled={mode === "focus" && sessionFlow.checking}
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
              isRecordingSession && styles.recordSessionBtnDisabled,
            ]}
            onPress={handleRecordSession}
            disabled={isRecordingSession}
            accessibilityRole="button"
            accessibilityState={{ disabled: isRecordingSession, busy: isRecordingSession }}
          >
            <Text
              style={[styles.recordSessionBtnText, { color: colors.surface }]}
            >
              {isRecordingSession ? "Recording…" : "Record Session"}
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

        {/* Offline gate: can't verify today's readiness check */}
        <WarningModal
          visible={sessionFlow.offline}
          title="Connect to continue"
          message={`We need to check today's readiness test or rest status before you can start. Please connect to the internet.${
            sessionFlow.offlineError ? `\n\nDebug: ${sessionFlow.offlineError}` : ""
          }`}
          primaryLabel="OK"
          onPrimary={sessionFlow.dismissOffline}
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
      {quoteVisible && appIsActive && isRunning && (
        <Animated.View
          accessibilityViewIsModal
          style={[
            styles.quoteOverlay,
            {
              opacity: quoteOpacity,
              backgroundColor: "rgba(25, 19, 15, 0.62)",
            },
          ]}
          onTouchStart={(event) => event.stopPropagation()}
        >
          <Animated.View
            style={{
              transform: [
                {
                  translateY: quoteFloat.interpolate({
                    inputRange: [0, 1],
                    outputRange: [6, -6],
                  }),
                },
              ],
            }}
          >
            <Pressable
              style={[
                styles.quoteCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.primary,
                  shadowColor: colors.primary,
                },
              ]}
              onPress={dismissQuote}
              accessibilityRole="button"
              accessibilityLabel={quote}
              accessibilityHint="Dismiss this motivational quote"
            >
              <Text style={[styles.quoteText, { color: colors.text }]}>
                {quote}
              </Text>
              <Text style={[styles.quoteHint, { color: colors.textMuted }]}>
                Tap to continue
              </Text>
            </Pressable>
          </Animated.View>
        </Animated.View>
      )}
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1 },
  quoteOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 20,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  quoteCard: {
    width: "100%",
    maxWidth: 420,
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 24,
    paddingHorizontal: 28,
    paddingVertical: 32,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 26,
    elevation: 16,
  },
  quoteText: {
    fontSize: 22,
    lineHeight: 32,
    fontWeight: "600", fontFamily: "BricolageGrotesque_600SemiBold",
    textAlign: "center",
  },
  quoteHint: {
    marginTop: 18,
    fontWeight: "400", fontFamily: "BricolageGrotesque_400Regular",
    fontSize: 13,
  },
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
    fontWeight: "700", fontFamily: "BricolageGrotesque_700Bold",
    letterSpacing: 2,
    color: Colors.textMuted,
    textTransform: "uppercase",
  },
  settingsCard: { marginHorizontal: 16, marginBottom: 16 },
  settingsTitle: { fontSize: 14, fontWeight: "700", fontFamily: "BricolageGrotesque_700Bold", marginBottom: 12 },
  settingsFields: { flexDirection: "row", gap: 12 },
  settingsField: { flex: 1, gap: 6 },
  settingsLabel: { fontSize: 11, fontWeight: "600", fontFamily: "BricolageGrotesque_600SemiBold" },
  durationInput: {
    borderWidth: 1,
    borderRadius: 8,
    minHeight: 40,
    paddingHorizontal: 10,
    fontSize: 15,
    fontWeight: "600", fontFamily: "BricolageGrotesque_600SemiBold",
  },
  durationError: { color: "#C94C3C", fontWeight: "400", fontFamily: "BricolageGrotesque_400Regular", fontSize: 12, marginTop: 8 },
  saveDurationsButton: {
    alignSelf: "flex-end",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 9,
    marginTop: 12,
  },
  saveDurationsText: { fontSize: 12, fontWeight: "700", fontFamily: "BricolageGrotesque_700Bold" },
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
  badgeText: { fontSize: 9, fontWeight: "800", fontFamily: "BricolageGrotesque_800ExtraBold", color: "#fff" },
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
  modeBtnText: { fontSize: 12, fontWeight: "600", fontFamily: "BricolageGrotesque_600SemiBold", color: Colors.textMuted },
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
    fontWeight: "800", fontFamily: "BricolageGrotesque_800ExtraBold",
    fontVariant: ["tabular-nums"],
    color: Colors.text,
    letterSpacing: -2,
  },
  modeLabel: {
    fontSize: 13,
    color: Colors.textMuted,
    fontWeight: "500", fontFamily: "BricolageGrotesque_500Medium",
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
  recordSessionBtnDisabled: {
    opacity: 0.55,
  },
  recordSessionBtnText: {
    fontSize: 13,
    fontWeight: "700", fontFamily: "BricolageGrotesque_700Bold",
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
  sessionCount: { fontSize: 16, fontWeight: "800", fontFamily: "BricolageGrotesque_800ExtraBold", color: Colors.text },
  sessionLabel: { fontSize: 9, color: Colors.textMuted, fontWeight: "500", fontFamily: "BricolageGrotesque_500Medium" },
  infoCard: { marginHorizontal: 16 },
  infoRow: { flexDirection: "row", alignItems: "center" },
  infoBlock: { flex: 1, alignItems: "center", gap: 4 },
  infoDivider: { width: 1, height: 32, backgroundColor: Colors.border },
  infoLabel: { fontSize: 11, color: Colors.textMuted, fontWeight: "500", fontFamily: "BricolageGrotesque_500Medium" },
  infoValue: {
    fontSize: 22,
    fontWeight: "800", fontFamily: "BricolageGrotesque_800ExtraBold",
    fontVariant: ["tabular-nums"],
    color: Colors.text,
    letterSpacing: -0.5,
  },
  taskCard: { marginHorizontal: 16, marginTop: 12 },
  activeTaskCard: { marginHorizontal: 16, marginBottom: 14, marginTop: -8 },
  activeTaskLabel: {
    fontSize: 10,
    color: Colors.textMuted,
    fontWeight: "700", fontFamily: "BricolageGrotesque_700Bold",
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
  activeTaskTitle: { fontSize: 14, fontWeight: "700", fontFamily: "BricolageGrotesque_700Bold", color: Colors.text },
  activeTaskHint: { fontWeight: "400", fontFamily: "BricolageGrotesque_400Regular", fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  taskHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  taskTitle: { fontSize: 14, fontWeight: "800", fontFamily: "BricolageGrotesque_800ExtraBold", color: Colors.text },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#C94C3C",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  addBtnText: { fontSize: 12, fontWeight: "700", fontFamily: "BricolageGrotesque_700Bold", color: "#fff" },
  emptyState: { alignItems: "center", paddingVertical: 20, gap: 8 },
  emptyText: { fontSize: 13, color: "#C4A8A8", fontWeight: "500", fontFamily: "BricolageGrotesque_500Medium" },
});
