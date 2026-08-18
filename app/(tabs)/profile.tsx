import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  Alert,
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  TextInput,
  Platform,
  StatusBar,
  Modal,
  KeyboardAvoidingView,
  ActivityIndicator,
  FlatList,
  Animated,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Colors, useColors } from "@/constants/colors";
import { SharedStyles } from "@/constants/styles";
import { signOutUser } from "@/store/userStore";
import { LucideIcon } from "@/app/components/LucideIcon";
import { useTheme } from "@/contexts/ThemeContext";
import { useWebPullToRefresh } from "@/hooks/useWebPullToRefresh";
import { WebPullToRefreshIndicator } from "@/app/components/WebPullToRefreshIndicator";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";
import { getDownloadURL, ref, uploadString } from "firebase/storage";
import { updateProfile } from "firebase/auth";
import { auth, db, storage } from "@/services/firebase";
import {
  doc,
  getDoc,
  getDocs,
  collection,
  query,
  where,
  updateDoc,
} from "firebase/firestore";
import { getProfileImageURL } from "@/services/profile";
import { getDisplayStreak } from "@/utils/streakCalculator";

// ─── Types ────────────────────────────────────────────────────────────────────
interface UserProfile {
  name: string; // maps to username from sign-up
  email: string;
  photoUri: string | null;
}
type UserListItem = { id: string; username: string };
type ConnectionModalType = "Following" | "Followers";

// ─── Toggle Switch Component ─────────────────────────────────────────────────────
function ToggleSwitch({
  value,
  onValueChange,
}: {
  value: boolean;
  onValueChange: (value: boolean) => void;
}) {
  return (
    <TouchableOpacity
      onPress={() => onValueChange(!value)}
      activeOpacity={0.7}
      style={[styles.toggle, value ? styles.toggleOn : styles.toggleOff]}
    >
      <View
        style={[
          styles.toggleKnob,
          value ? styles.toggleKnobOn : styles.toggleKnobOff,
        ]}
      />
    </TouchableOpacity>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .slice(0, 2)
    .join("");
}

// ─── Avatar ───────────────────────────────────────────────────────────────────
function ProfileAvatar({
  profile,
  size = 80,
  onPress,
}: {
  profile: UserProfile;
  size?: number;
  onPress?: () => void;
}) {
  const initials = getInitials(profile.name);

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={onPress ? 0.8 : 1}
      style={{ position: "relative" }}
    >
      {profile.photoUri ? (
        <Image
          source={{ uri: profile.photoUri }}
          style={{ width: size, height: size, borderRadius: size / 2 }}
          resizeMode="cover"
        />
      ) : (
        <View
          style={StyleSheet.flatten([
            styles.avatarFallback,
            { width: size, height: size, borderRadius: size / 2 },
          ])}
        >
          <Text
            style={StyleSheet.flatten([
              styles.avatarInitials,
              { fontSize: size * 0.32 },
            ])}
          >
            {initials}
          </Text>
        </View>
      )}
      {onPress && (
        <View style={styles.cameraBadge}>
          <LucideIcon name="camera" size={11} color={Colors.surface} />
        </View>
      )}
    </TouchableOpacity>
  );
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SETTINGS = [
  {
    icon: "notifications-outline" as const,
    label: "Notifications",
    value: "",
    toggle: true,
  },
  {
    icon: "timer-outline" as const,
    label: "Default Duration",
    value: "25 min",
  },
  {
    icon: "moon-outline" as const,
    label: "Dark Mode",
    value: "",
    toggle: true,
  },
  { icon: "shield-checkmark-outline" as const, label: "Privacy", value: "" },
  {
    icon: "log-out-outline" as const,
    label: "Sign Out",
    value: "",
    danger: true,
  },
];

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function ProfileScreen() {
  const router = useRouter();
  const { isDarkMode, toggleDarkMode } = useTheme();
  const colors = useColors(isDarkMode);

  const [profile, setProfile] = useState<UserProfile>({
    name: "",
    email: "",
    photoUri: null,
  });
  const [loadingProfile, setLoadingProfile] = useState(true);

  const [modalVisible, setModalVisible] = useState(false);
  const [signOutModalVisible, setSignOutModalVisible] = useState(false);
  const [draftName, setDraftName] = useState(profile.name);
  const [draftPhotoUri, setDraftPhotoUri] = useState<string | null>(
    profile.photoUri,
  );

  // ── Stats state ─────────────────────────────────────────────────────────────
  const [stats, setStats] = useState([
    { label: "Total Hours", value: "0h" },
    { label: "Sessions", value: "0" },
    { label: "Streak", value: "0d" },
    { label: "Following", value: "0" },
    { label: "Followers", value: "0" },
  ]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [connectionsModalVisible, setConnectionsModalVisible] = useState(false);
  const [connectionsModalType, setConnectionsModalType] =
    useState<ConnectionModalType>("Following");
  const [connectionsList, setConnectionsList] = useState<UserListItem[]>([]);
  const [loadingConnections, setLoadingConnections] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const fileInputRef = useRef<any>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const profileRevealOpacity = useRef(new Animated.Value(0)).current;
  const profileRevealY = useRef(new Animated.Value(8)).current;
  const editButtonScale = useRef(new Animated.Value(1)).current;
  const saveButtonScale = useRef(new Animated.Value(1)).current;

  // ── Fetch profile from Firestore ────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    const fetchProfile = async (userId: string | undefined) => {
      if (!userId) {
        if (!cancelled) setLoadingProfile(false);
        return;
      }

      setLoadingProfile(true);
      try {
        const userRef = doc(db, "users", userId);
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) {
          const fallbackProfile: UserProfile = {
            name: auth.currentUser?.displayName || "",
            email: auth.currentUser?.email || "",
            photoUri: auth.currentUser?.photoURL || null,
          };
          if (!cancelled) {
            setProfile(fallbackProfile);
            setDraftName(fallbackProfile.name);
            setDraftPhotoUri(fallbackProfile.photoUri);
          }
          return;
        }

        const userData = userSnap.data();
        const nextProfile: UserProfile = {
          name:
            (userData.username as string) ||
            auth.currentUser?.displayName ||
            "",
          email: (userData.email as string) || auth.currentUser?.email || "",
          photoUri:
            (await getProfileImageURL(userData.photoUrl as string | null)) ||
            auth.currentUser?.photoURL ||
            null,
        };
        if (!cancelled) {
          setProfile(nextProfile);
          setDraftName(nextProfile.name);
          setDraftPhotoUri(nextProfile.photoUri);
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
      } finally {
        if (!cancelled) setLoadingProfile(false);
      }
    };

    const unsubscribe = auth.onAuthStateChanged((user) => {
      fetchProfile(user?.uid);
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  const animatePressScale = (anim: Animated.Value, pressed: boolean) => {
    Animated.spring(anim, {
      toValue: pressed ? 0.97 : 1,
      friction: 6,
      tension: 140,
      useNativeDriver: true,
    }).start();
  };

  const onRefresh = useCallback(async () => {
    if (refreshing) return;
    const userId = auth.currentUser?.uid;
    if (!userId) return;

    setRefreshing(true);
    try {
      // Refresh profile
      const userRef = doc(db, "users", userId);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const userData = userSnap.data();
        const nextProfile: UserProfile = {
          name:
            (userData.username as string) ||
            auth.currentUser?.displayName ||
            "",
          email: (userData.email as string) || auth.currentUser?.email || "",
          photoUri:
            (await getProfileImageURL(userData.photoUrl as string | null)) ||
            auth.currentUser?.photoURL ||
            null,
        };
        setProfile(nextProfile);
        setDraftName(nextProfile.name);
        setDraftPhotoUri(nextProfile.photoUri);
      }

      // Refresh stats
      const sessionsQuery = query(
        collection(db, "users", userId, "sessions"),
        where("mode", "==", "focus"),
      );
      const sessionsSnapshot = await getDocs(sessionsQuery);

      let totalSeconds = 0;
      sessionsSnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.duration) {
          totalSeconds += data.duration;
        }
      });

      const totalHours = Math.floor(totalSeconds / 3600);
      const sessionCount = sessionsSnapshot.size;

      const streakDoc = await getDoc(doc(db, "streaks", userId));
      let streakDays = 0;
      if (streakDoc.exists()) {
        const streakData = streakDoc.data();
        const lastActiveDate = streakData.lastActiveDate
          ? new Date(streakData.lastActiveDate.toMillis())
          : null;
        streakDays = getDisplayStreak(
          streakData.currentStreak || 0,
          lastActiveDate,
          streakData.timezone || "UTC",
        );
      }

      const [followingSnapshot, followersSnapshot] = await Promise.all([
        getDocs(collection(db, "following", userId, "list")),
        getDocs(collection(db, "followers", userId, "list")),
      ]);

      setStats([
        { label: "Total Hours", value: `${totalHours}h` },
        { label: "Sessions", value: sessionCount.toString() },
        { label: "Streak", value: `${streakDays}d` },
        { label: "Following", value: followingSnapshot.size.toString() },
        { label: "Followers", value: followersSnapshot.size.toString() },
      ]);
    } catch (error) {
      console.error("Error refreshing profile data:", error);
    } finally {
      setRefreshing(false);
    }
  }, [refreshing]);

  const { pullDistance, webScrollProps } = useWebPullToRefresh({
    onRefresh,
    refreshing,
  });

  useEffect(() => {
    if (loadingProfile || loadingStats) return;

    Animated.parallel([
      Animated.timing(profileRevealOpacity, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(profileRevealY, {
        toValue: 0,
        duration: 260,
        useNativeDriver: true,
      }),
    ]).start();
  }, [loadingProfile, loadingStats, profileRevealOpacity, profileRevealY]);

  // ── Fetch stats from Firestore ───────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    const fetchStats = async (userId: string | undefined) => {
      if (!userId) {
        if (!cancelled) setLoadingStats(false);
        return;
      }

      setLoadingStats(true);
      try {
        const sessionsQuery = query(
          collection(db, "users", userId, "sessions"),
          where("mode", "==", "focus"),
        );
        const sessionsSnapshot = await getDocs(sessionsQuery);

        let totalSeconds = 0;
        sessionsSnapshot.forEach((doc) => {
          const data = doc.data();
          if (data.duration) {
            totalSeconds += data.duration;
          }
        });

        const totalHours = Math.floor(totalSeconds / 3600);
        const sessionCount = sessionsSnapshot.size;

        const streakDoc = await getDoc(doc(db, "streaks", userId));
        let streakDays = 0;
        if (streakDoc.exists()) {
          const streakData = streakDoc.data();
          const lastActiveDate = streakData.lastActiveDate
            ? new Date(streakData.lastActiveDate.toMillis())
            : null;
          streakDays = getDisplayStreak(
            streakData.currentStreak || 0,
            lastActiveDate,
            streakData.timezone || "UTC",
          );
        }

        const [followingSnapshot, followersSnapshot] = await Promise.all([
          getDocs(collection(db, "following", userId, "list")),
          getDocs(collection(db, "followers", userId, "list")),
        ]);

        if (!cancelled) {
          setStats([
            { label: "Total Hours", value: `${totalHours}h` },
            { label: "Sessions", value: sessionCount.toString() },
            { label: "Streak", value: `${streakDays}d` },
            { label: "Following", value: followingSnapshot.size.toString() },
            { label: "Followers", value: followersSnapshot.size.toString() },
          ]);
        }
      } catch (error) {
        console.error("Error fetching stats:", error);
      } finally {
        if (!cancelled) setLoadingStats(false);
      }
    };

    const unsubscribe = auth.onAuthStateChanged((user) => {
      fetchStats(user?.uid);
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  // ── Sign out handler ────────────────────────────────────────────────────────
  const handleSignOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await signOutUser();
      setSignOutModalVisible(false);
      router.replace("/(auth)/welcome");
    } catch {
      Alert.alert("Error", "Failed to sign out. Please try again.");
      setSigningOut(false);
    }
  };

  // ── Settings item press handler ────────────────────────────────────────────
  const handleSettingPress = (label: string) => {
    if (label === "Sign Out") {
      setSignOutModalVisible(true);
    }
    // Add other settings handlers here
  };

  const handleToggleChange = (label: string, value: boolean) => {
    if (label === "Notifications") {
      setNotificationsEnabled(value);
      // TODO: Implement actual notification permission handling
    } else if (label === "Dark Mode") {
      if (value !== isDarkMode) {
        toggleDarkMode();
      }
    }
  };

  // ── Modal open/close ────────────────────────────────────────────────────────
  const openModal = () => {
    setDraftName(profile.name);
    setDraftPhotoUri(profile.photoUri);
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!draftName.trim()) {
      Alert.alert("Name required", "Please enter your display name.");
      return;
    }

    if (isSavingProfile) {
      return;
    }

    setIsSavingProfile(true);
    setSaveError(null);

    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error("User not authenticated");
      }

      const userId = currentUser.uid;
      const userRef = doc(db, "users", userId);
      let nextPhotoUri = profile.photoUri;
      const updates: { username: string; photoUrl?: string | null } = {
        username: draftName.trim(),
      };

      if (draftPhotoUri !== profile.photoUri) {
        if (draftPhotoUri) {
          const avatarRef = ref(storage, `profileImages/${userId}`);

          // Handle web differently - data URL is already base64
          let base64: string;
          let contentType: string;

          if (Platform.OS === "web" && draftPhotoUri.startsWith("data:")) {
            const matches = draftPhotoUri.match(
              /^data:(image\/[a-zA-Z+]+);base64,(.+)$/,
            );
            if (!matches) {
              throw new Error("Invalid image format.");
            }
            contentType = matches[1];
            base64 = matches[2];
          } else {
            const fileInfo = await FileSystem.getInfoAsync(draftPhotoUri);
            if (!fileInfo.exists) {
              throw new Error("Photo file not found.");
            }
            if (fileInfo.size && fileInfo.size > 5 * 1024 * 1024) {
              throw new Error("Photo must be under 5MB.");
            }

            const ext = draftPhotoUri.split(".").pop()?.toLowerCase() ?? "jpg";
            const mimeMap: Record<string, string> = {
              jpg: "image/jpeg",
              jpeg: "image/jpeg",
              png: "image/png",
              webp: "image/webp",
            };
            contentType = mimeMap[ext] ?? "image/jpeg";
            if (!Object.values(mimeMap).includes(contentType)) {
              throw new Error("Please upload a JPG, PNG, or WEBP image.");
            }

            base64 = await FileSystem.readAsStringAsync(draftPhotoUri, {
              encoding: "base64",
            });
          }

          await uploadString(avatarRef, base64, "base64", { contentType });
          nextPhotoUri = await getDownloadURL(avatarRef);
          updates.photoUrl = nextPhotoUri;
        } else {
          nextPhotoUri = null;
          updates.photoUrl = null;
        }
      }

      await updateDoc(userRef, updates);
      await updateProfile(currentUser, {
        displayName: draftName.trim(),
        photoURL: nextPhotoUri ?? null,
      });

      const refreshedPhotoUri = nextPhotoUri
        ? await getProfileImageURL(nextPhotoUri)
        : null;

      setProfile((prev) => ({
        ...prev,
        name: draftName.trim(),
        email: currentUser.email || prev.email,
        photoUri: refreshedPhotoUri,
      }));
      setDraftName(draftName.trim());
      setDraftPhotoUri(refreshedPhotoUri);
      setModalVisible(false);
      Alert.alert("Saved", "Your profile has been updated.");
    } catch (error) {
      const firebaseError = error as { code?: string; message?: string };
      console.error("Error updating profile:", error);
      setSaveError(firebaseError.message || "Failed to update profile.");
      Alert.alert(
        "Error",
        firebaseError.message || "Failed to update profile. Please try again.",
      );
    } finally {
      setIsSavingProfile(false);
    }
  };

  // ── Image picking ───────────────────────────────────────────────────────────
  const pickFromLibrary = async () => {
    // On web, no permission request needed
    if (Platform.OS !== "web") {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission needed", "Please allow photo library access.");
        return;
      }
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: Platform.OS !== "web", // Editing not supported on web
      aspect: [1, 1],
      quality: 0.85,
    });
    if (!result.canceled && result.assets[0]) {
      setDraftPhotoUri(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    if (Platform.OS === "web") {
      Alert.alert(
        "Not supported",
        "Camera is not available on web. Please choose from library.",
      );
      return;
    }
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Please allow camera access.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (!result.canceled && result.assets[0]) {
      setDraftPhotoUri(result.assets[0].uri);
    }
  };

  const showPhotoSheet = () => {
    // On web, trigger the file input directly
    if (Platform.OS === "web") {
      fileInputRef.current?.click();
      return;
    }

    const options: {
      text: string;
      onPress: () => void | Promise<void>;
      style?: "destructive" | "cancel";
    }[] = [
      { text: "Choose from Library", onPress: pickFromLibrary },
      { text: "Take Photo", onPress: takePhoto },
    ];

    if (draftPhotoUri) {
      options.push({
        text: "Remove Photo",
        style: "destructive",
        onPress: () => setDraftPhotoUri(null),
      });
    }

    options.push({ text: "Cancel", style: "cancel", onPress: () => {} });

    Alert.alert("Profile Photo", "Choose an option", options);
  };

  const handleWebFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setDraftPhotoUri(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const openConnectionsModal = async (type: ConnectionModalType) => {
    const userId = auth.currentUser?.uid;
    if (!userId) {
      console.warn(
        "ProfileScreen: auth.currentUser is null; skipping connections fetch.",
      );
      return;
    }
    setConnectionsModalType(type);
    setConnectionsModalVisible(true);
    setLoadingConnections(true);
    try {
      const sourceCollection =
        type === "Following"
          ? collection(db, "following", userId, "list")
          : collection(db, "followers", userId, "list");
      const snapshot = await getDocs(sourceCollection);
      const users = snapshot.docs.map((itemDoc) => ({
        id: itemDoc.id,
        username: (itemDoc.data().username as string) || "User",
      }));
      setConnectionsList(users);
    } finally {
      setLoadingConnections(false);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView
      style={StyleSheet.flatten([
        SharedStyles.screen,
        styles.safe,
        { backgroundColor: colors.background },
      ])}
    >
      <StatusBar
        barStyle={isDarkMode ? "light-content" : "dark-content"}
        backgroundColor={colors.background}
      />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.background }]}>
        <Text style={[styles.headerLabel, { color: colors.textMuted }]}>
          PROFILE
        </Text>
        <Animated.View style={{ transform: [{ scale: editButtonScale }] }}>
          <TouchableOpacity
            style={[styles.editChip, { backgroundColor: colors.primaryMuted }]}
            onPress={openModal}
            activeOpacity={0.7}
            onPressIn={() => animatePressScale(editButtonScale, true)}
            onPressOut={() => animatePressScale(editButtonScale, false)}
            accessibilityRole="button"
            accessibilityHint="Open the profile editor"
          >
            <LucideIcon name="pencil" size={12} color={colors.primary} />
            <Text style={[styles.editChipText, { color: colors.primary }]}>
              Edit
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        {...webScrollProps}
        refreshControl={
          Platform.OS !== "web" ? (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
              enabled={true}
              progressViewOffset={-10}
            />
          ) : undefined
        }
      >
        <WebPullToRefreshIndicator
          refreshing={refreshing}
          pullDistance={pullDistance}
          color={colors.primary}
        />

        {/* Profile hero */}
        <Animated.View
          style={StyleSheet.flatten([
            SharedStyles.card,
            styles.profileCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              opacity: profileRevealOpacity,
              transform: [{ translateY: profileRevealY }],
            },
          ])}
        >
          <ProfileAvatar profile={profile} size={80} onPress={openModal} />
          {/* Username displayed as the profile name */}
          <Text style={[styles.profileName, { color: colors.text }]}>
            {profile.name}
          </Text>
          {/* Email from sign-up */}
          <Text style={[styles.profileEmail, { color: colors.textMuted }]}>
            {profile.email}
          </Text>
          {loadingProfile ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : null}

          <View style={[styles.statsRow, { borderTopColor: colors.border }]}>
            {stats.map((stat: { label: string; value: string }, i: number) => (
              <React.Fragment key={stat.label}>
                {i > 0 && (
                  <View
                    style={[
                      styles.statDivider,
                      { backgroundColor: colors.border },
                    ]}
                  />
                )}
                {stat.label === "Following" || stat.label === "Followers" ? (
                  <TouchableOpacity
                    style={styles.statBlock}
                    onPress={() =>
                      openConnectionsModal(stat.label as ConnectionModalType)
                    }
                  >
                    <Text style={[styles.statValue, { color: colors.text }]}>
                      {loadingStats ? "..." : stat.value}
                    </Text>
                    <Text
                      style={[styles.statLabel, { color: colors.textMuted }]}
                    >
                      {stat.label}
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.statBlock}>
                    <Text style={[styles.statValue, { color: colors.text }]}>
                      {loadingStats ? "..." : stat.value}
                    </Text>
                    <Text
                      style={[styles.statLabel, { color: colors.textMuted }]}
                    >
                      {stat.label}
                    </Text>
                  </View>
                )}
              </React.Fragment>
            ))}
          </View>
        </Animated.View>

        {/* Settings */}
        <Text
          style={StyleSheet.flatten([
            SharedStyles.sectionLabel,
            { marginHorizontal: 4, color: colors.textMuted },
          ])}
        >
          Settings
        </Text>

        <View
          style={[
            SharedStyles.card,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          {SETTINGS.map((item, i) => {
            const settingStyle = StyleSheet.flatten([
              styles.settingRow,
              i < SETTINGS.length - 1 && styles.settingBorder,
            ]);
            const isToggle = item.toggle;
            const toggleValue =
              item.label === "Notifications"
                ? notificationsEnabled
                : isDarkMode;

            return (
              <TouchableOpacity
                key={item.label}
                style={settingStyle}
                activeOpacity={0.7}
                onPress={() =>
                  isToggle
                    ? handleToggleChange(item.label, !toggleValue)
                    : handleSettingPress(item.label)
                }
              >
                <View style={styles.settingLeft}>
                  <View
                    style={StyleSheet.flatten([
                      styles.iconBox,
                      item.danger && styles.iconBoxDanger,
                      { backgroundColor: colors.background },
                    ])}
                  >
                    <LucideIcon
                      name={item.icon}
                      size={16}
                      color={
                        item.danger ? colors.primary : colors.textSecondary
                      }
                    />
                  </View>
                  <Text
                    style={StyleSheet.flatten([
                      styles.settingLabel,
                      item.danger && styles.settingLabelDanger,
                      { color: colors.text },
                    ])}
                  >
                    {item.label}
                  </Text>
                </View>
                <View style={styles.settingRight}>
                  {isToggle ? (
                    <ToggleSwitch
                      value={toggleValue}
                      onValueChange={(value) =>
                        handleToggleChange(item.label, value)
                      }
                    />
                  ) : item.value ? (
                    <Text
                      style={[styles.settingValue, { color: colors.textMuted }]}
                    >
                      {item.value}
                    </Text>
                  ) : (
                    <LucideIcon
                      name="chevron-forward"
                      size={14}
                      color={colors.textMuted}
                    />
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={[styles.version, { color: colors.textMuted }]}>
          PomoJI v1.0.0
        </Text>
      </ScrollView>

      {/* ── Edit Profile Modal ──────────────────────────────────────────────── */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        statusBarTranslucent
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={{ flex: 1, backgroundColor: colors.background }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <SafeAreaView
            style={[styles.modalSafe, { backgroundColor: colors.background }]}
          >
            {/* Modal nav */}
            <View
              style={[
                styles.modalNav,
                {
                  backgroundColor: colors.surface,
                  borderBottomColor: colors.border,
                },
              ]}
            >
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                activeOpacity={0.7}
                style={styles.modalNavBtn}
              >
                <Text
                  style={[styles.cancelText, { color: colors.textSecondary }]}
                >
                  Cancel
                </Text>
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Edit Profile
              </Text>
              <TouchableOpacity
                onPress={handleSave}
                activeOpacity={0.7}
                disabled={isSavingProfile}
                style={styles.modalNavBtn}
              >
                {isSavingProfile ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Text style={[styles.navSaveText, { color: colors.primary }]}>
                    Save
                  </Text>
                )}
              </TouchableOpacity>
            </View>
            <ScrollView
              contentContainerStyle={styles.modalContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              style={{ backgroundColor: colors.background }}
            >
              {/* Avatar picker */}
              <View style={styles.avatarSection}>
                <ProfileAvatar
                  profile={{
                    ...profile,
                    name: draftName || profile.name,
                    photoUri: draftPhotoUri,
                  }}
                  size={96}
                  onPress={showPhotoSheet}
                />
                <TouchableOpacity onPress={showPhotoSheet} activeOpacity={0.7}>
                  <Text
                    style={[styles.changePhotoText, { color: colors.primary }]}
                  >
                    Change Profile Photo
                  </Text>
                </TouchableOpacity>
                {draftPhotoUri && Platform.OS === "web" && (
                  <TouchableOpacity
                    onPress={() => setDraftPhotoUri(null)}
                    activeOpacity={0.7}
                    style={{ marginTop: 8 }}
                  >
                    <Text
                      style={[
                        styles.changePhotoText,
                        { color: colors.primary },
                      ]}
                    >
                      Remove Photo
                    </Text>
                  </TouchableOpacity>
                )}
                {Platform.OS === "web" && (
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleWebFileChange}
                    style={{ display: "none" }}
                  />
                )}
              </View>

              <View
                style={[
                  styles.sectionDivider,
                  { backgroundColor: colors.border },
                ]}
              />

              {/* Username / Display Name input */}
              <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>
                USERNAME
              </Text>
              <View style={styles.inputCard}>
                <View style={styles.inputRow}>
                  <View style={styles.inputIcon}>
                    <LucideIcon
                      name="at-outline"
                      size={15}
                      color={colors.textSecondary}
                    />
                  </View>
                  <TextInput
                    style={[styles.textInput, { color: colors.text }]}
                    value={draftName}
                    onChangeText={setDraftName}
                    placeholder="Enter your username"
                    placeholderTextColor={colors.textMuted}
                    autoCorrect={false}
                    autoCapitalize="none"
                    returnKeyType="done"
                    maxLength={40}
                  />
                  {draftName.length > 0 && (
                    <TouchableOpacity
                      onPress={() => setDraftName("")}
                      activeOpacity={0.7}
                    >
                      <LucideIcon
                        name="close-circle"
                        size={16}
                        color={colors.textMuted}
                      />
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {/* Email — read-only */}
              <Text
                style={StyleSheet.flatten([
                  styles.fieldLabel,
                  { marginTop: 16, color: colors.textMuted },
                ])}
              >
                EMAIL
              </Text>
              <View style={styles.inputCard}>
                <View style={styles.inputRow}>
                  <View style={styles.inputIcon}>
                    <LucideIcon
                      name="mail-outline"
                      size={15}
                      color={colors.textSecondary}
                    />
                  </View>
                  <Text
                    style={[styles.readOnlyText, { color: colors.textMuted }]}
                  >
                    {profile.email}
                  </Text>
                  <View
                    style={[
                      styles.lockedBadge,
                      { backgroundColor: colors.background },
                    ]}
                  >
                    <LucideIcon
                      name="lock-closed"
                      size={10}
                      color={colors.textMuted}
                    />
                  </View>
                </View>
              </View>
              <Text style={[styles.fieldHint, { color: colors.textMuted }]}>
                Email changes are managed through your account settings.
              </Text>

              {/* CTA */}
              <Animated.View
                style={{ transform: [{ scale: saveButtonScale }] }}
              >
                <TouchableOpacity
                  style={[
                    styles.saveBtn,
                    { backgroundColor: colors.primary },
                    isSavingProfile && styles.saveBtnDisabled,
                  ]}
                  onPress={handleSave}
                  activeOpacity={0.85}
                  disabled={isSavingProfile}
                  onPressIn={() => animatePressScale(saveButtonScale, true)}
                  onPressOut={() => animatePressScale(saveButtonScale, false)}
                  accessibilityRole="button"
                  accessibilityHint="Save profile changes"
                >
                  {isSavingProfile ? (
                    <ActivityIndicator size="small" color={colors.surface} />
                  ) : (
                    <Text
                      style={[styles.saveBtnText, { color: colors.surface }]}
                    >
                      Save Changes
                    </Text>
                  )}
                </TouchableOpacity>
              </Animated.View>
            </ScrollView>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        visible={signOutModalVisible}
        animationType="fade"
        transparent
        statusBarTranslucent
        onRequestClose={() => setSignOutModalVisible(false)}
      >
        <View
          style={[
            styles.centeredModalOverlay,
            { backgroundColor: "rgba(0,0,0,0.5)" },
          ]}
        >
          <View
            style={[
              styles.signOutModalCard,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <View style={styles.reminderHeader}>
              <Text style={[styles.reminderTitle, { color: colors.text }]}>
                Sign Out
              </Text>
              <TouchableOpacity onPress={() => setSignOutModalVisible(false)}>
                <LucideIcon name="close" size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
            <Text style={[styles.reminderEmpty, { color: colors.textMuted }]}>
              Are you sure you want to sign out?
            </Text>
            <View style={styles.signOutModalActions}>
              <TouchableOpacity
                style={[
                  styles.signOutCancelBtn,
                  {
                    borderColor: colors.border,
                    backgroundColor: colors.background,
                  },
                ]}
                onPress={() => setSignOutModalVisible(false)}
              >
                <Text
                  style={[styles.signOutActionText, { color: colors.text }]}
                >
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.signOutConfirmBtn,
                  { backgroundColor: colors.primary },
                ]}
                onPress={handleSignOut}
                disabled={signingOut}
              >
                {signingOut ? (
                  <ActivityIndicator size="small" color={colors.surface} />
                ) : (
                  <Text
                    style={[
                      styles.signOutActionText,
                      { color: colors.surface },
                    ]}
                  >
                    Sign Out
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={connectionsModalVisible}
        animationType="fade"
        transparent
        statusBarTranslucent
        onRequestClose={() => setConnectionsModalVisible(false)}
      >
        <View
          style={[styles.modalOverlay, { backgroundColor: "rgba(0,0,0,0.5)" }]}
        >
          <View
            style={[
              styles.reminderSheet,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <View style={styles.reminderHeader}>
              <Text style={[styles.reminderTitle, { color: colors.text }]}>
                {connectionsModalType}
              </Text>
              <TouchableOpacity
                onPress={() => setConnectionsModalVisible(false)}
              >
                <LucideIcon name="close" size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
            {loadingConnections ? (
              <Text style={[styles.reminderEmpty, { color: colors.textMuted }]}>
                Loading...
              </Text>
            ) : (
              <FlatList
                data={connectionsList}
                keyExtractor={(item) => item.id}
                ListEmptyComponent={
                  <Text
                    style={[styles.reminderEmpty, { color: colors.textMuted }]}
                  >
                    No users yet.
                  </Text>
                }
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.reminderRow}
                    onPress={() => {
                      setConnectionsModalVisible(false);
                      router.push({
                        pathname: "/profile/[uid]" as never,
                        params: { uid: item.id },
                      });
                    }}
                  >
                    <View
                      style={[
                        styles.avatarCircle,
                        { backgroundColor: colors.primary },
                      ]}
                    >
                      <Text
                        style={[styles.avatarText, { color: colors.surface }]}
                      >
                        {getInitials(item.username)}
                      </Text>
                    </View>
                    <Text
                      style={[styles.reminderRowTitle, { color: colors.text }]}
                    >
                      {item.username}
                    </Text>
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, minHeight: "100%" },

  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 2,
    color: Colors.textMuted,
    textTransform: "uppercase",
  },
  editChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: Colors.primaryMuted,
  },
  editChipText: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.primary,
  },

  content: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 100,
    gap: 12,
  },

  // Profile card
  profileCard: {
    alignItems: "center",
    paddingVertical: 24,
    gap: 4,
  },
  avatarFallback: {
    backgroundColor: Colors.avatarBg,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitials: {
    fontWeight: "700",
    color: Colors.avatarText,
  },
  cameraBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: Colors.surface,
  },
  profileName: {
    fontSize: 20,
    fontWeight: "800",
    color: Colors.text,
    marginTop: 10,
  },
  profileEmail: {
    fontSize: 12,
    color: Colors.textMuted,
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 16,
    width: "100%",
  },
  statBlock: {
    flex: 1,
    alignItems: "center",
    gap: 3,
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: Colors.border,
  },
  statValue: {
    fontSize: 18,
    fontWeight: "800",
    color: Colors.text,
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 10,
    color: Colors.textMuted,
    fontWeight: "500",
    textAlign: "center",
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "flex-start",
    paddingTop: 84,
    paddingHorizontal: 16,
  },
  centeredModalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  signOutModalCard: {
    width: "100%",
    maxWidth: 320,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
  },
  signOutModalActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
  },
  signOutCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
  },
  signOutConfirmBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  signOutActionText: {
    fontSize: 13,
    fontWeight: "700",
  },
  reminderSheet: {
    backgroundColor: Colors.background,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 12,
    maxHeight: "70%",
  },
  reminderHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  reminderTitle: { fontSize: 14, fontWeight: "800", color: Colors.text },
  reminderEmpty: {
    fontSize: 12,
    color: Colors.textMuted,
    paddingVertical: 10,
    textAlign: "center",
  },
  reminderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  reminderRowTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.text,
    flex: 1,
  },
  avatarCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.primary,
  },
  avatarText: {
    color: Colors.surface,
    fontSize: 11,
    fontWeight: "800",
  },

  // Settings
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 13,
  },
  settingBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  settingLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: Colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  iconBoxDanger: { backgroundColor: Colors.primaryMuted },
  settingLabel: { fontSize: 14, fontWeight: "500", color: Colors.text },
  settingLabelDanger: { color: Colors.primary },
  settingRight: { flexDirection: "row", alignItems: "center", gap: 6 },
  settingValue: { fontSize: 13, color: Colors.textMuted, fontWeight: "500" },

  version: {
    textAlign: "center",
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 4,
  },

  // ── Modal ─────────────────────────────────────────────────────────────────
  modalSafe: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  modalNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalNavBtn: { minWidth: 60 },
  modalTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.text,
  },
  cancelText: {
    fontSize: 15,
    color: Colors.textSecondary,
    fontWeight: "500",
  },
  navSaveText: {
    fontSize: 15,
    color: Colors.primary,
    fontWeight: "700",
    textAlign: "right",
  },

  modalContent: {
    paddingHorizontal: 16,
    paddingTop: 28,
    paddingBottom: 60,
  },

  avatarSection: {
    alignItems: "center",
    gap: 12,
    marginBottom: 8,
  },
  changePhotoText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.primary,
  },

  sectionDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 20,
  },

  fieldLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.5,
    color: Colors.textMuted,
    textTransform: "uppercase",
    marginBottom: 8,
    marginLeft: 4,
  },
  inputCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    paddingHorizontal: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    minHeight: 50,
  },
  inputIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: Colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: "500",
    color: Colors.text,
    paddingVertical: 0,
  },
  readOnlyText: {
    flex: 1,
    fontSize: 15,
    fontWeight: "500",
    color: Colors.textMuted,
  },
  lockedBadge: {
    width: 22,
    height: 22,
    borderRadius: 6,
    backgroundColor: Colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  fieldHint: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 6,
    marginLeft: 4,
    lineHeight: 16,
  },

  saveBtn: {
    marginTop: 32,
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 6,
  },
  saveBtnDisabled: {
    opacity: 0.65,
  },
  saveBtnText: {
    fontSize: 15,
    fontWeight: "800",
    color: Colors.surface,
    letterSpacing: 0.3,
  },

  // Toggle switch
  toggle: {
    width: 44,
    height: 24,
    borderRadius: 12,
    padding: 2,
  },
  toggleOn: {
    backgroundColor: Colors.primary,
  },
  toggleOff: {
    backgroundColor: Colors.border,
  },
  toggleKnob: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.surface,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleKnobOn: {
    alignSelf: "flex-end",
  },
  toggleKnobOff: {
    alignSelf: "flex-start",
  },
});
