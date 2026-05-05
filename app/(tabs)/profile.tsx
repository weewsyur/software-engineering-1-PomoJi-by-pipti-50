import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Modal,
  TextInput,
  Image,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Colors } from '@/constants/colors';
import { SharedStyles } from '@/constants/styles';

// ─── Types ────────────────────────────────────────────────────────────────────
interface UserProfile {
  name: string;
  email: string;
  photoUri: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .slice(0, 2)
    .join('');
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
      style={{ position: 'relative' }}
    >
      {profile.photoUri ? (
        <Image
          source={{ uri: profile.photoUri }}
          style={{ width: size, height: size, borderRadius: size / 2 }}
          resizeMode="cover"
        />
      ) : (
        <View
          style={[
            styles.avatarFallback,
            { width: size, height: size, borderRadius: size / 2 },
          ]}
        >
          <Text style={[styles.avatarInitials, { fontSize: size * 0.32 }]}>
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
const STATS = [
  { label: 'Total Hours', value: '87h' },
  { label: 'Sessions', value: '142' },
  { label: 'Streak', value: '3wk' },
];

const SETTINGS = [
  { icon: 'notifications-outline' as const, label: 'Notifications', value: 'On' },
  { icon: 'timer-outline' as const, label: 'Default Duration', value: '25 min' },
  { icon: 'moon-outline' as const, label: 'Dark Mode', value: 'Off' },
  { icon: 'shield-checkmark-outline' as const, label: 'Privacy', value: '' },
  { icon: 'log-out-outline' as const, label: 'Sign Out', value: '', danger: true },
];

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function ProfileScreen() {
  const [profile, setProfile] = useState<UserProfile>({
    name: 'Jeffy Einstein',
    email: 'jeffy@example.com',
    photoUri: null,
  });

  const [modalVisible, setModalVisible] = useState(false);
  const [draftName, setDraftName] = useState(profile.name);
  const [draftPhotoUri, setDraftPhotoUri] = useState<string | null>(profile.photoUri);

  // ── Modal open/close ────────────────────────────────────────────────────────
  const openModal = () => {
    setDraftName(profile.name);
    setDraftPhotoUri(profile.photoUri);
    setModalVisible(true);
  };

  const handleSave = () => {
    if (!draftName.trim()) {
      Alert.alert('Name required', 'Please enter your display name.');
      return;
    }
    // TODO: call your Firebase / MongoDB update here
    setProfile((prev) => ({
      ...prev,
      name: draftName.trim(),
      photoUri: draftPhotoUri,
    }));
    setModalVisible(false);
  };

  // ── Image picking ───────────────────────────────────────────────────────────
  const pickFromLibrary = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow photo library access.');
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
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow camera access.');
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
    Alert.alert('Profile Photo', 'Choose an option', [
      { text: 'Take Photo', onPress: takePhoto },
      { text: 'Choose from Library', onPress: pickFromLibrary },
      ...(draftPhotoUri
        ? [{ text: 'Remove Photo', style: 'destructive' as const, onPress: () => setDraftPhotoUri(null) }]
        : []),
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={[SharedStyles.screen, styles.safe]}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerLabel}>PROFILE</Text>
        <TouchableOpacity style={styles.editChip} onPress={openModal} activeOpacity={0.7}>
          <Ionicons name="pencil" size={12} color={Colors.primary} />
          <Text style={styles.editChipText}>Edit</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile hero */}
        <View style={[SharedStyles.card, styles.profileCard]}>
          <ProfileAvatar profile={profile} size={80} onPress={openModal} />
          <Text style={styles.profileName}>{profile.name}</Text>
          <Text style={styles.profileEmail}>{profile.email}</Text>

          <View style={styles.statsRow}>
            {STATS.map((stat, i) => (
              <React.Fragment key={stat.label}>
                {i > 0 && <View style={styles.statDivider} />}
                <View style={styles.statBlock}>
                  <Text style={styles.statValue}>{stat.value}</Text>
                  <Text style={styles.statLabel}>{stat.label}</Text>
                </View>
              </React.Fragment>
            ))}
          </View>
        </View>

        {/* Settings */}
        <Text style={[SharedStyles.sectionLabel, { marginHorizontal: 4 }]}>
          Settings
        </Text>

        <View style={SharedStyles.card}>
          {SETTINGS.map((item, i) => (
            <TouchableOpacity
              key={item.label}
              style={[styles.settingRow, i < SETTINGS.length - 1 && styles.settingBorder]}
              activeOpacity={0.7}
            >
              <View style={styles.settingLeft}>
                <View style={[styles.iconBox, item.danger && styles.iconBoxDanger]}>
                  <Ionicons
                    name={item.icon}
                    size={16}
                    color={item.danger ? Colors.primary : Colors.textSecondary}
                  />
                </View>
                <Text style={[styles.settingLabel, item.danger && styles.settingLabelDanger]}>
                  {item.label}
                </Text>
              </View>
              <View style={styles.settingRight}>
                {item.value ? <Text style={styles.settingValue}>{item.value}</Text> : null}
                <Ionicons name="chevron-forward" size={14} color={Colors.textMuted} />
              </View>
            </TouchableOpacity>
          ))}
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
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
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
                  profile={{ ...profile, name: draftName || profile.name, photoUri: draftPhotoUri }}
                  size={96}
                  onPress={showPhotoSheet}
                />
                <TouchableOpacity onPress={showPhotoSheet} activeOpacity={0.7}>
                  <Text style={styles.changePhotoText}>Change Profile Photo</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.sectionDivider} />

              {/* Name input */}
              <Text style={styles.fieldLabel}>DISPLAY NAME</Text>
              <View style={styles.inputCard}>
                <View style={styles.inputRow}>
                  <View style={styles.inputIcon}>
                    <Ionicons name="person-outline" size={15} color={Colors.textSecondary} />
                  </View>
                  <TextInput
                    style={styles.textInput}
                    value={draftName}
                    onChangeText={setDraftName}
                    placeholder="Enter your name"
                    placeholderTextColor={Colors.textMuted}
                    autoCorrect={false}
                    returnKeyType="done"
                    maxLength={40}
                  />
                  {draftName.length > 0 && (
                    <TouchableOpacity onPress={() => setDraftName('')} activeOpacity={0.7}>
                      <Ionicons name="close-circle" size={16} color={Colors.textMuted} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {/* Email — read-only */}
              <Text style={[styles.fieldLabel, { marginTop: 16 }]}>EMAIL</Text>
              <View style={styles.inputCard}>
                <View style={styles.inputRow}>
                  <View style={styles.inputIcon}>
                    <Ionicons name="mail-outline" size={15} color={Colors.textSecondary} />
                  </View>
                  <Text style={styles.readOnlyText}>{profile.email}</Text>
                  <View style={styles.lockedBadge}>
                    <Ionicons name="lock-closed" size={10} color={Colors.textMuted} />
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2,
    color: Colors.textMuted,
    textTransform: 'uppercase',
  },
  editChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: Colors.primaryMuted,
  },
  editChipText: {
    fontSize: 12,
    fontWeight: '700',
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
    alignItems: 'center',
    paddingVertical: 24,
    gap: 4,
  },
  avatarFallback: {
    backgroundColor: Colors.avatarBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    fontWeight: '700',
    color: Colors.avatarText,
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.surface,
  },
  profileName: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.text,
    marginTop: 10,
  },
  profileEmail: {
    fontSize: 12,
    color: Colors.textMuted,
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 16,
    width: '100%',
  },
  statBlock: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: Colors.border,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.text,
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 10,
    color: Colors.textMuted,
    fontWeight: '500',
  },

  // Settings
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 13,
  },
  settingBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  settingLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBoxDanger: { backgroundColor: Colors.primaryMuted },
  settingLabel: { fontSize: 14, fontWeight: '500', color: Colors.text },
  settingLabelDanger: { color: Colors.primary },
  settingRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  settingValue: { fontSize: 13, color: Colors.textMuted, fontWeight: '500' },

  version: {
    textAlign: 'center',
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalNavBtn: { minWidth: 60 },
  modalTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
  },
  cancelText: {
    fontSize: 15,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  navSaveText: {
    fontSize: 15,
    color: Colors.primary,
    fontWeight: '700',
    textAlign: 'right',
  },

  modalContent: {
    paddingHorizontal: 16,
    paddingTop: 28,
    paddingBottom: 60,
  },

  avatarSection: {
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  changePhotoText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },

  sectionDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 20,
  },

  fieldLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.5,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    marginBottom: 8,
    marginLeft: 4,
  },
  inputCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    paddingHorizontal: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 50,
  },
  inputIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: Colors.text,
    paddingVertical: 0,
  },
  readOnlyText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: Colors.textMuted,
  },
  lockedBadge: {
    width: 22,
    height: 22,
    borderRadius: 6,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
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
    alignItems: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 6,
  },
  saveBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.surface,
    letterSpacing: 0.3,
  },
});