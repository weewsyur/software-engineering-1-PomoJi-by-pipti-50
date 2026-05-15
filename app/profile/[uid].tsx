import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, StatusBar, TouchableOpacity, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { LucideIcon } from "@/app/components/LucideIcon";
import { Colors } from "@/constants/colors";
import { SharedStyles } from "@/constants/styles";
import { auth, db } from "@/services/firebase";
import { getUserStore } from "@/store/userStore";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";

type FollowStatus = "follow" | "followBack" | "following";

export default function UserProfileScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ uid?: string }>();
  const uid = params.uid ?? "";
  const currentUid = auth.currentUser?.uid ?? getUserStore().userId ?? "";
  const currentUsername = getUserStore().username || "User";

  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState(false);
  const [followStatus, setFollowStatus] = useState<FollowStatus>("follow");
  const [username, setUsername] = useState("User");
  const [email, setEmail] = useState("");
  const [followingCount, setFollowingCount] = useState(0);
  const [followersCount, setFollowersCount] = useState(0);

  const initials = useMemo(() => {
    const source = username.trim() || "U";
    return source.slice(0, 2).toUpperCase();
  }, [username]);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!uid) {
        setLoading(false);
        return;
      }
      try {
        const [userSnap, followingSnap, followersSnap] = await Promise.all([
          getDoc(doc(db, "users", uid)),
          getDocs(collection(db, "following", uid, "list")),
          getDocs(collection(db, "followers", uid, "list")),
        ]);
        if (userSnap.exists()) {
          const userData = userSnap.data();
          setUsername((userData.username as string) || "User");
          setEmail((userData.email as string) || "");
        }
        setFollowingCount(followingSnap.size);
        setFollowersCount(followersSnap.size);

        if (currentUid && currentUid !== uid) {
          const [currentToTargetSnap, targetToCurrentSnap] = await Promise.all([
            getDoc(doc(db, "following", currentUid, "list", uid)),
            getDoc(doc(db, "following", uid, "list", currentUid)),
          ]);
          if (currentToTargetSnap.exists()) {
            setFollowing(true);
            setFollowStatus("following");
          } else if (targetToCurrentSnap.exists()) {
            setFollowStatus("followBack");
          } else {
            setFollowStatus("follow");
          }
        }
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [uid, currentUid]);

  const handleFollow = async () => {
    if (!uid || !currentUid || currentUid === uid || following) return;
    setFollowing(true);
    try {
      const batch = writeBatch(db);
      batch.set(doc(db, "following", currentUid, "list", uid), {
        username,
        createdAt: serverTimestamp(),
      });
      batch.set(doc(db, "followers", uid, "list", currentUid), {
        username: currentUsername,
        createdAt: serverTimestamp(),
      });
      const notificationRef = doc(collection(db, "notifications", uid, "items"));
      batch.set(notificationRef, {
        type: "follow",
        fromUid: currentUid,
        fromUsername: currentUsername,
        read: false,
        createdAt: serverTimestamp(),
      });
      await batch.commit();
      setFollowStatus("following");
      setFollowersCount((prev) => prev + 1);
    } finally {
      setFollowing(false);
    }
  };

  const followButtonLabel =
    following
      ? "Following..."
      : followStatus === "following"
        ? "Following"
        : followStatus === "followBack"
          ? "Follow Back"
          : "Follow";

  return (
    <SafeAreaView style={StyleSheet.flatten([SharedStyles.screen, styles.safe])}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <LucideIcon name="chevron-back" size={20} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerLabel}>PROFILE</Text>
        <View style={styles.backBtn} />
      </View>

      <View style={StyleSheet.flatten([SharedStyles.card, styles.card])}>
        {loading ? (
          <ActivityIndicator size="small" color={Colors.primary} />
        ) : (
          <>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
            <Text style={styles.name}>{username}</Text>
            <Text style={styles.email}>{email || "No email available"}</Text>
            <View style={styles.countsRow}>
              <View style={styles.countBlock}>
                <Text style={styles.countValue}>{followingCount}</Text>
                <Text style={styles.countLabel}>Following</Text>
              </View>
              <View style={styles.countDivider} />
              <View style={styles.countBlock}>
                <Text style={styles.countValue}>{followersCount}</Text>
                <Text style={styles.countLabel}>Followers</Text>
              </View>
            </View>
            {currentUid !== uid ? (
              <TouchableOpacity
                style={StyleSheet.flatten([
                  styles.followBtn,
                  (followStatus === "following" || following) && styles.followBtnDisabled,
                ])}
                disabled={followStatus === "following" || following}
                onPress={handleFollow}
              >
                <Text style={styles.followBtnText}>{followButtonLabel}</Text>
              </TouchableOpacity>
            ) : null}
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 6,
  },
  backBtn: {
    width: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  headerLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 2,
    color: Colors.textMuted,
    textTransform: "uppercase",
  },
  card: {
    marginTop: 8,
    marginHorizontal: 16,
    paddingVertical: 24,
    alignItems: "center",
  },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.avatarBg,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: "800",
    color: Colors.avatarText,
  },
  name: {
    marginTop: 10,
    fontSize: 20,
    fontWeight: "800",
    color: Colors.text,
  },
  email: {
    marginTop: 4,
    fontSize: 12,
    color: Colors.textMuted,
  },
  countsRow: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 14,
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
  },
  countBlock: {
    flex: 1,
    alignItems: "center",
    gap: 2,
  },
  countValue: {
    fontSize: 18,
    fontWeight: "800",
    color: Colors.text,
  },
  countLabel: {
    fontSize: 10,
    fontWeight: "500",
    color: Colors.textMuted,
  },
  countDivider: {
    width: 1,
    height: 30,
    backgroundColor: Colors.border,
  },
  followBtn: {
    marginTop: 18,
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  followBtnDisabled: {
    backgroundColor: Colors.textMuted,
    opacity: 0.7,
  },
  followBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.surface,
  },
});
