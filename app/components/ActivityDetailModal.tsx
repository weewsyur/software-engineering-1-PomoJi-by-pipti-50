import {
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { ChevronLeft, X } from "lucide-react";
import { Colors } from "@/constants/colors";
import { Activity } from "@/hooks/useActivities";
import { useState, useEffect } from "react";
import { getFreshDownloadURL, isStoragePath } from "@/utils/imageStorage";

interface ActivityDetailModalProps {
  activity: Activity | null;
  visible: boolean;
  onClose: () => void;
  onDelete: (id: string) => void;
}

const fmtFocusTime = (totalSeconds: number): string => {
  const totalMinutes = Math.floor(totalSeconds / 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
};

const fmtDate = (iso: string): string => {
  const d = new Date(iso);
  return `${d.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })} ${d.toLocaleTimeString(
    [],
    {
      hour: "2-digit",
      minute: "2-digit",
    },
  )}`;
};

export const ActivityDetailModal = ({
  activity,
  visible,
  onClose,
  onDelete,
}: ActivityDetailModalProps) => {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [imageUrls, setImageUrls] = useState<string[]>([]);

  useEffect(() => {
    const loadImageUrls = async () => {
      if (!activity || !activity.images || activity.images.length === 0) {
        setImageUrls([]);
        return;
      }

      const urls: string[] = [];
      for (const uri of activity.images) {
        if (isStoragePath(uri)) {
          try {
            const freshUrl = await getFreshDownloadURL(uri);
            urls.push(freshUrl);
          } catch (error) {
            console.error('Failed to get download URL for:', uri, error);
            urls.push(uri); // Fallback to original
          }
        } else {
          urls.push(uri);
        }
      }
      setImageUrls(urls);
    };

    loadImageUrls();
  }, [activity]);

  const handleDeletePress = () => {
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = () => {
    if (!activity) return;
    setShowDeleteModal(false);
    onDelete(activity.id);
    onClose();
  };

  const handleDeleteCancel = () => {
    setShowDeleteModal(false);
  };

  if (!activity) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <ChevronLeft size={24} color={Colors.text} strokeWidth={2.5} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleDeletePress} style={styles.deleteButton}>
            <Text style={styles.deleteButtonText}>Delete</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onClose}>
            <X size={24} color={Colors.text} strokeWidth={2.5} />
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.title}>{activity.title}</Text>
          <Text style={styles.date}>{fmtDate(activity.createdAt)}</Text>

          <View style={styles.statsRow}>
            <View style={styles.statBlock}>
              <Text style={styles.statValue}>{activity.sessions}</Text>
              <Text style={styles.statLabel}>Sessions</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBlock}>
              <Text style={styles.statValue}>
                {fmtFocusTime(activity.totalTime)}
              </Text>
              <Text style={styles.statLabel}>Focus Time</Text>
            </View>
          </View>

          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>{activity.category}</Text>
          </View>

          {activity.description ? (
            <View style={styles.descriptionSection}>
              <Text style={styles.sectionLabel}>Description</Text>
              <Text style={styles.description}>{activity.description}</Text>
            </View>
          ) : null}

          {imageUrls.length > 0 && (
            <View style={styles.imagesSection}>
              <Text style={styles.sectionLabel}>Images</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.imagesScroll}
              >
                {imageUrls.map((uri, index) => (
                  <Image
                    key={index}
                    source={{ uri }}
                    style={styles.image}
                    resizeMode="cover"
                  />
                ))}
              </ScrollView>
            </View>
          )}
        </ScrollView>
      </View>

      {/* Delete Confirmation Modal */}
      <Modal
        visible={showDeleteModal}
        transparent
        animationType="fade"
        onRequestClose={handleDeleteCancel}
      >
        <View style={deleteModalStyles.overlay}>
          <View style={deleteModalStyles.container}>
            <View style={deleteModalStyles.header}>
              <Text style={deleteModalStyles.title}>Delete Activity</Text>
              <TouchableOpacity onPress={handleDeleteCancel} style={deleteModalStyles.closeBtn}>
                <X size={20} color="#9A7070" strokeWidth={2.5} />
              </TouchableOpacity>
            </View>
            <Text style={deleteModalStyles.message}>
              Are you sure you want to delete "{activity.title}"? This action cannot be undone.
            </Text>
            <View style={deleteModalStyles.buttons}>
              <TouchableOpacity
                style={deleteModalStyles.cancelButton}
                onPress={handleDeleteCancel}
                activeOpacity={0.8}
              >
                <Text style={deleteModalStyles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={deleteModalStyles.deleteButton}
                onPress={handleDeleteConfirm}
                activeOpacity={0.8}
              >
                <Text style={deleteModalStyles.deleteButtonText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </Modal>
  );
};

export default ActivityDetailModal;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  deleteButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#C94C3C",
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: Colors.text,
    marginBottom: 8,
  },
  date: {
    fontSize: 14,
    color: Colors.textMuted,
    marginBottom: 24,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  statBlock: {
    flex: 1,
    alignItems: "center",
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: Colors.border,
  },
  statValue: {
    fontSize: 20,
    fontWeight: "800",
    color: Colors.text,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 4,
  },
  categoryBadge: {
    alignSelf: "flex-start",
    backgroundColor: Colors.primary + "22",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 16,
  },
  categoryText: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.primary,
  },
  descriptionSection: {
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.textMuted,
    marginBottom: 8,
  },
  description: {
    fontSize: 15,
    color: Colors.text,
    lineHeight: 22,
  },
  imagesSection: {
    marginBottom: 16,
  },
  imagesScroll: {
    flexDirection: "row",
  },
  image: {
    width: 200,
    height: 200,
    borderRadius: 12,
    marginRight: 12,
  },
});

const deleteModalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  container: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 24,
    width: "100%",
    maxWidth: 400,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1A0808",
  },
  closeBtn: {
    padding: 4,
  },
  message: {
    fontSize: 14,
    color: "#1A0808",
    lineHeight: 20,
    marginBottom: 24,
  },
  buttons: {
    flexDirection: "row",
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: "#EAD8D8",
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#9A7070",
  },
  deleteButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: "#C94C3C",
    alignItems: "center",
  },
  deleteButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});
