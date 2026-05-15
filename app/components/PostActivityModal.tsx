import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Image,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { X, Images } from "lucide-react";
import { Colors } from "@/constants/colors";

interface PostActivityModalProps {
  visible: boolean;
  defaultTitle: string;
  sessions: number;
  totalTimeSeconds: number;
  onSkip: () => void;
  onSave: (payload: {
    title: string;
    description: string;
    images: string[];
  }) => void;
}

const fmtDuration = (seconds: number) => {
  const totalMinutes = Math.max(0, Math.round(seconds / 60));
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h === 0) return `${m} min`;
  return `${h} hr ${m} min`;
};

export default function PostActivityModal({
  visible,
  defaultTitle,
  sessions,
  totalTimeSeconds,
  onSkip,
  onSave,
}: PostActivityModalProps) {
  const [title, setTitle] = useState(defaultTitle);
  const [description, setDescription] = useState("");
  const [images, setImages] = useState<string[]>([]);

  const totalTimeLabel = useMemo(
    () => fmtDuration(totalTimeSeconds),
    [totalTimeSeconds],
  );

  React.useEffect(() => {
    if (!visible) return;
    setTitle(defaultTitle);
    setDescription("");
    setImages([]);
  }, [defaultTitle, visible]);

  const pickImages = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permission.status !== "granted") return;
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsMultipleSelection: true,
      mediaTypes: ["images"],
      quality: 0.8,
      selectionLimit: 5,
    });
    if (result.canceled) return;
    setImages(result.assets.map((asset) => asset.uri));
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onSkip}
    >
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>Save Activity</Text>
            <TouchableOpacity onPress={onSkip}>
              <X size={20} color={Colors.textMuted} strokeWidth={2.5} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.label}>Title</Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              style={styles.input}
              placeholder="Focus Session"
            />
            <Text style={styles.label}>Description</Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
              style={StyleSheet.flatten([styles.input, styles.textArea])}
              placeholder="What did you accomplish?"
            />

            <View style={styles.statsRow}>
              <View>
                <Text style={styles.statLabel}>Sessions Completed</Text>
                <Text style={styles.statValue}>{sessions}</Text>
              </View>
              <View style={styles.statDivider} />
              <View>
                <Text style={styles.statLabel}>Total Time</Text>
                <Text style={styles.statValue}>{totalTimeLabel}</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.imageButton} onPress={pickImages}>
              <Images size={18} color={Colors.primary} strokeWidth={2.5} />
              <Text style={styles.imageButtonText}>Add Images</Text>
            </TouchableOpacity>

            {images.length > 0 && (
              <View style={styles.imageRow}>
                {images.map((uri) => (
                  <Image key={uri} source={{ uri }} style={styles.preview} />
                ))}
              </View>
            )}
          </ScrollView>

          <View style={styles.actions}>
            <TouchableOpacity style={styles.skipBtn} onPress={onSkip}>
              <Text style={styles.skipText}>Skip</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.saveBtn}
              onPress={() =>
                onSave({
                  title: title.trim() || "Focus Session",
                  description: description.trim(),
                  images,
                })
              }
            >
              <Text style={styles.saveText}>Save Activity</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 18,
    maxHeight: "85%",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  title: { fontSize: 17, fontWeight: "800", color: Colors.text },
  label: {
    fontSize: 11,
    color: Colors.textMuted,
    fontWeight: "700",
    marginTop: 10,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: Colors.text,
  },
  textArea: { minHeight: 88, textAlignVertical: "top" },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 14,
    marginBottom: 6,
  },
  statLabel: { fontSize: 11, color: Colors.textMuted, fontWeight: "500" },
  statValue: {
    fontSize: 19,
    color: Colors.text,
    fontWeight: "800",
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: Colors.border,
    marginHorizontal: 14,
  },
  imageButton: {
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
    marginTop: 12,
    alignSelf: "flex-start",
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: Colors.primary + "12",
  },
  imageButtonText: { fontSize: 12, color: Colors.primary, fontWeight: "700" },
  imageRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
  preview: {
    width: 64,
    height: 64,
    borderRadius: 8,
    backgroundColor: Colors.border,
  },
  actions: { flexDirection: "row", gap: 10, marginTop: 14 },
  skipBtn: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center",
  },
  skipText: { fontSize: 14, color: Colors.textMuted, fontWeight: "700" },
  saveBtn: {
    flex: 2,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center",
  },
  saveText: { fontSize: 14, color: Colors.surface, fontWeight: "700" },
});
