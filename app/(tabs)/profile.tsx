import React, { useEffect, useState } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/colors';
import { SharedStyles } from '@/constants/styles';
import { signOut } from '@/services/auth';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { getDownloadURL, ref, uploadString } from "firebase/storage";
import { updateProfile } from "firebase/auth";
import { auth, db, storage } from '@/services/firebase';
import { doc, getDoc, getDocs, collection, query, where, updateDoc } from 'firebase/firestore';

// ─── Types ────────────────────────────────────────────────────────────────────
interface UserProfile {
  name: string; // maps to username from sign-up
  email: string;
  photoUri: string | null;
}
type UserListItem = { id: string; username: string };
type ConnectionModalType = "Following" | "Followers";

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
          <Text style={StyleSheet.flatten([styles.avatarInitials, { fontSize: size * 0.32 }])}>
            {initials}
          </Text>
        </View>
      )}
      {onPress && (
        <View style={styles.cameraBadge}>
          <Ionicons name="camera" size={11} color={Colors.surface} />
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
    value: "On",
  },
  {
    icon: "timer-outline" as const,
    label: "Default Duration",
    value: "25 min",
  },
  { icon: "moon-outline" as const, label: "Dark Mode", value: "Off" },
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

  const [profile, setProfile] = useState<UserProfile>({
    name: "Your Name",
    email: "your@email.com",
    photoUri: null,
  });
  const [loadingProfile, setLoadingProfile] = useState(true);

  const [modalVisible, setModalVisible] = useState(false);
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
  const [connectionsModalType, setConnectionsModalType] = useState<ConnectionModalType>("Following");
  const [connectionsList, setConnectionsList] = useState<UserListItem[]>([]);
  const [loadingConnections, setLoadingConnections] = useState(false);

  // ── Fetch profile from Firestore ────────────────────────────────────────────
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const userId = auth.currentUser?.uid;
        if (!userId) {
          console.warn("ProfileScreen: auth.currentUser is null; skipping profile fetch.");
          return;
        }
        const userRef = doc(db, "users", userId);
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) return;
        const userData = userSnap.data();
        const nextProfile: UserProfile = {
          name: (userData.username as string) || "Your Name",
          email: (userData.email as string) || auth.currentUser?.email || "your@email.com",
          photoUri: (userData.photoUrl as string) || null,
        };
        setProfile(nextProfile);
        setDraftName(nextProfile.name);
        setDraftPhotoUri(nextProfile.photoUri);
      } catch (error) {
        console.error("Error fetching profile:", error);
      } finally {
        setLoadingProfile(false);
      }
    };

    fetchProfile();
  }, []);

  // ── Fetch stats from Firestore ───────────────────────────────────────────────
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const userId = auth.currentUser?.uid;
        if (!userId) {
          console.warn("ProfileScreen: auth.currentUser is null; skipping stats fetch.");
          setLoadingStats(false);
          return;
        }

        // Query sessions for this user
        const sessionsQuery = query(
          collection(db, "users", userId, "sessions"),
          where("mode", "==", "focus")
        );
        const sessionsSnapshot = await getDocs(sessionsQuery);

        // Compute total hours and session count
        let totalSeconds = 0;
        sessionsSnapshot.forEach((doc) => {
          const data = doc.data();
          if (data.duration) {
            totalSeconds += data.duration;
          }
        });

        const totalHours = Math.floor(totalSeconds / 3600);
        const sessionCount = sessionsSnapshot.size;

        // Fetch user document for streak data
        const userDoc = await getDoc(doc(db, "users", userId));
        let streakDays = 0;
        if (userDoc.exists()) {
          const userData = userDoc.data();
          streakDays = userData.streakDays || 0;
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
        console.error("Error fetching stats:", error);
      } finally {
        setLoadingStats(false);
      }
    };

    fetchStats();
  }, []);

  // ── Sign out handler ────────────────────────────────────────────────────────
  const handleSignOut = async () => {
    if (Platform.OS === "web") {
      const confirmed = typeof window !== "undefined"
        ? window.confirm("Are you sure you want to sign out?")
        : true;
      if (!confirmed) return;
      try {
        await signOut();
        router.replace("/welcome");
      } catch (error) {
        Alert.alert("Error", "Failed to sign out. Please try again.");
      }
      return;
    }

    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          try {
            await signOut();
            // Navigate to welcome screen
            router.replace("/welcome");
          } catch {
            Alert.alert("Error", "Failed to sign out. Please try again.");
          }
        },
      },
    ]);
  };

  // ── Settings item press handler ────────────────────────────────────────────
  const handleSettingPress = (label: string) => {
    if (label === "Sign Out") {
      handleSignOut();
    }
    // Add other settings handlers here
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
          const fileInfo = await FileSystem.getInfoAsync(draftPhotoUri);
          if (!fileInfo.exists) {
            Alert.alert("Error", "Photo file not found.");
            return;
          }
          if (fileInfo.size && fileInfo.size > 5 * 1024 * 1024) {
            Alert.alert("Photo too large", "Please upload an image under 5MB.");
            return;
          }

          const ext = draftPhotoUri.split(".").pop()?.toLowerCase() ?? "jpg";
          const mimeMap: Record<string, string> = {
            jpg: "image/jpeg",
            jpeg: "image/jpeg",
            png: "image/png",
            webp: "image/webp",
          };
          const contentType = mimeMap[ext] ?? "image/jpeg";
          if (!Object.values(mimeMap).includes(contentType)) {
            Alert.alert("Invalid photo type", "Please upload a JPG, PNG, or WEBP.");
            return;
          }

          try {
            const base64 = await FileSystem.readAsStringAsync(draftPhotoUri, {
              encoding: "base64",
            });
            await uploadString(avatarRef, base64, "base64", { contentType });
            nextPhotoUri = await getDownloadURL(avatarRef);
            updates.photoUrl = nextPhotoUri;
          } catch (storageError) {
            const firebaseStorageError = storageError as {
              code?: string;
              message?: string;
              serverResponse?: string;
            };
            console.error("Storage upload failed:", firebaseStorageError);
            console.error("Storage error code:", firebaseStorageError.code ?? "unknown");
            console.error("Storage error message:", firebaseStorageError.message ?? "Unknown Storage error");
            console.error("Storage server response:", firebaseStorageError.serverResponse ?? "No server response");
            if (firebaseStorageError.code === "storage/unknown") {
              console.error(
                "Check Firebase Storage rules for authenticated writes to profileImages/{uid}, and verify bucket CORS policy for your app origin."
              );
            }
            throw storageError;
          }
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

      setProfile((prev) => ({
        ...prev,
        name: draftName.trim(),
        photoUri: nextPhotoUri,
      }));
      setModalVisible(false);
    } catch (error) {
      const firebaseError = error as { code?: string; message?: string };
      console.log("FULL ERROR:", error);
      console.log("ERROR CODE:", firebaseError.code ?? "unknown");
      console.log("ERROR MESSAGE:", firebaseError.message ?? "Unknown error");
      console.error("Error updating profile:", error);
      Alert.alert("Error", "Failed to update profile. Please try again.");
    }
  };

  // ── Image picking ───────────────────────────────────────────────────────────
  const pickFromLibrary = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Please allow photo library access.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (!result.canceled && result.assets[0]) {
      setDraftPhotoUri(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
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
    Alert.alert("Profile Photo", "Choose an option", [
      { text: "Take Photo", onPress: takePhoto },
      { text: "Choose from Library", onPress: pickFromLibrary },
      ...(draftPhotoUri
        ? [
          {
            text: "Remove Photo",
            style: "destructive" as const,
            onPress: () => setDraftPhotoUri(null),
          },
        ]
        : []),
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const openConnectionsModal = async (type: ConnectionModalType) => {
    const userId = auth.currentUser?.uid;
    if (!userId) {
      console.warn("ProfileScreen: auth.currentUser is null; skipping connections fetch.");
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
      style={StyleSheet.flatten([SharedStyles.screen, styles.safe])}
    >
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerLabel}>PROFILE</Text>
        <TouchableOpacity
          style={styles.editChip}
          onPress={openModal}
          activeOpacity={0.7}
        >
          <Ionicons name="pencil" size={12} color={Colors.primary} />
          <Text style={styles.editChipText}>Edit</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile hero */}
        <View style={StyleSheet.flatten([SharedStyles.card, styles.profileCard])}>
          <ProfileAvatar profile={profile} size={80} onPress={openModal} />
          {/* Username displayed as the profile name */}
          <Text style={styles.profileName}>{profile.name}</Text>
          {/* Email from sign-up */}
          <Text style={styles.profileEmail}>{profile.email}</Text>
          {loadingProfile ? (
            <ActivityIndicator size="small" color={Colors.primary} />
          ) : null}

          <View style={styles.statsRow}>
            {stats.map((stat: { label: string; value: string }, i: number) => (
              <React.Fragment key={stat.label}>
                {i > 0 && <View style={styles.statDivider} />}
                {stat.label === "Following" || stat.label === "Followers" ? (
                  <TouchableOpacity
                    style={styles.statBlock}
                    onPress={() => openConnectionsModal(stat.label as ConnectionModalType)}
                  >
                    <Text style={styles.statValue}>{loadingStats ? "..." : stat.value}</Text>
                    <Text style={styles.statLabel}>{stat.label}</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.statBlock}>
                    <Text style={styles.statValue}>{loadingStats ? "..." : stat.value}</Text>
                    <Text style={styles.statLabel}>{stat.label}</Text>
                  </View>
                )}
              </React.Fragment>
            ))}
          </View>
        </View>

        {/* Settings */}
        <Text
          style={StyleSheet.flatten([
            SharedStyles.sectionLabel,
            { marginHorizontal: 4 },
          ])}
        >
          Settings
        </Text>

        <View style={SharedStyles.card}>
          {SETTINGS.map((item, i) => {
            const settingStyle = StyleSheet.flatten([
              styles.settingRow,
              i < SETTINGS.length - 1 && styles.settingBorder,
            ]);
            return (
              <TouchableOpacity
                key={item.label}
                style={settingStyle}
                activeOpacity={0.7}
                onPress={() => handleSettingPress(item.label)}
              >
                <View style={styles.settingLeft}>
                  <View
                    style={StyleSheet.flatten([
                      styles.iconBox,
                      item.danger && styles.iconBoxDanger,
                    ])}
                  >
                    <Ionicons
                      name={item.icon}
                      size={16}
                      color={
                        item.danger ? Colors.primary : Colors.textSecondary
                      }
                    />
                  </View>
                  <Text
                    style={StyleSheet.flatten([
                      styles.settingLabel,
                      item.danger && styles.settingLabelDanger,
                    ])}
                  >
                    {item.label}
                  </Text>
                </View>
                <View style={styles.settingRight}>
                  {item.value ? (
                    <Text style={styles.settingValue}>{item.value}</Text>
                  ) : null}
                  <Ionicons
                    name="chevron-forward"
                    size={14}
                    color={Colors.textMuted}
                  />
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.version}>PomoJI v1.0.0</Text>
      </ScrollView>

      {/* ── Edit Profile Modal ──────────────────────────────────────────────── */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <SafeAreaView style={styles.modalSafe}>
            {/* Modal nav */}
            <View style={styles.modalNav}>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                activeOpacity={0.7}
                style={styles.modalNavBtn}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Edit Profile</Text>
              <TouchableOpacity
                onPress={handleSave}
                activeOpacity={0.7}
                style={styles.modalNavBtn}
              >
                <Text style={styles.navSaveText}>Save</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              contentContainerStyle={styles.modalContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
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
                  <Text style={styles.changePhotoText}>
                    Change Profile Photo
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.sectionDivider} />

              {/* Username / Display Name input */}
              <Text style={styles.fieldLabel}>USERNAME</Text>
              <View style={styles.inputCard}>
                <View style={styles.inputRow}>
                  <View style={styles.inputIcon}>
                    <Ionicons
                      name="at-outline"
                      size={15}
                      color={Colors.textSecondary}
                    />
                  </View>
                  <TextInput
                    style={styles.textInput}
                    value={draftName}
                    onChangeText={setDraftName}
                    placeholder="Enter your username"
                    placeholderTextColor={Colors.textMuted}
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
                      <Ionicons
                        name="close-circle"
                        size={16}
                        color={Colors.textMuted}
                      />
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {/* Email — read-only */}
              <Text
                style={StyleSheet.flatten([
                  styles.fieldLabel,
                  { marginTop: 16 },
                ])}
              >
                EMAIL
              </Text>
              <View style={styles.inputCard}>
                <View style={styles.inputRow}>
                  <View style={styles.inputIcon}>
                    <Ionicons
                      name="mail-outline"
                      size={15}
                      color={Colors.textSecondary}
                    />
                  </View>
                  <Text style={styles.readOnlyText}>{profile.email}</Text>
                  <View style={styles.lockedBadge}>
                    <Ionicons
                      name="lock-closed"
                      size={10}
                      color={Colors.textMuted}
                    />
                  </View>
                </View>
              </View>
              <Text style={styles.fieldHint}>
                Email changes are managed through your account settings.
              </Text>

              {/* CTA */}
              <TouchableOpacity
                style={styles.saveBtn}
                onPress={handleSave}
                activeOpacity={0.85}
              >
                <Text style={styles.saveBtnText}>Save Changes</Text>
              </TouchableOpacity>
            </ScrollView>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        visible={connectionsModalVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setConnectionsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.reminderSheet}>
            <View style={styles.reminderHeader}>
              <Text style={styles.reminderTitle}>{connectionsModalType}</Text>
              <TouchableOpacity onPress={() => setConnectionsModalVisible(false)}>
                <Ionicons name="close" size={20} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>
            {loadingConnections ? (
              <Text style={styles.reminderEmpty}>Loading...</Text>
            ) : (
              <FlatList
                data={connectionsList}
                keyExtractor={(item) => item.id}
                ListEmptyComponent={<Text style={styles.reminderEmpty}>No users yet.</Text>}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.reminderRow}
                    onPress={() => {
                      setConnectionsModalVisible(false);
                      router.push({ pathname: "/profile/[uid]" as never, params: { uid: item.id } });
                    }}
                  >
                    <View style={styles.avatarCircle}>
                      <Text style={styles.avatarText}>{getInitials(item.username)}</Text>
                    </View>
                    <Text style={styles.reminderRowTitle}>{item.username}</Text>
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
  safe: { flex: 1 },

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
  reminderSheet: {
    backgroundColor: Colors.background,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 12,
    maxHeight: "70%",
  },
  reminderHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  reminderTitle: { fontSize: 14, fontWeight: "800", color: Colors.text },
  reminderEmpty: { fontSize: 12, color: Colors.textMuted, paddingVertical: 10, textAlign: "center" },
  reminderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  reminderRowTitle: { fontSize: 13, fontWeight: "700", color: Colors.text, flex: 1 },
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
  saveBtnText: {
    fontSize: 15,
    fontWeight: "800",
    color: Colors.surface,
    letterSpacing: 0.3,
  },
});
