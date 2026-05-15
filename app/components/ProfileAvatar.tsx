import React, { memo } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image } from "react-native";
import { Camera } from "lucide-react";
import { Colors } from "@/constants/colors";
import { UserProfile } from "@/services/profile";

interface ProfileAvatarProps {
  profile: UserProfile;
  size?: number;
  onPress?: () => void;
}

const getInitials = (name: string): string => {
  return name
    .trim()
    .split(/\s+/)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .slice(0, 2)
    .join("");
};

export const ProfileAvatar: React.FC<ProfileAvatarProps> = memo(({
  profile,
  size = 80,
  onPress,
}) => {
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
          <Camera size={11} color={Colors.surface} strokeWidth={2.5} />
        </View>
      )}
    </TouchableOpacity>
  );
}, (prevProps, nextProps) => {
  return prevProps.profile.name === nextProps.profile.name &&
    prevProps.profile.photoUri === nextProps.profile.photoUri &&
    prevProps.size === nextProps.size &&
    prevProps.onPress === nextProps.onPress;
});

ProfileAvatar.displayName = 'ProfileAvatar';

export default ProfileAvatar;

const styles = StyleSheet.create({
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
});
