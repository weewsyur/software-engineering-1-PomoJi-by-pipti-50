import { useEffect, useState } from "react";
import { auth, db } from "@/services/firebase";
import { collection, onSnapshot, orderBy, query, doc, getDoc, updateDoc } from "firebase/firestore";

export interface Notification {
  id: string;
  type: "follow";
  fromUid: string;
  fromUsername: string;
  read: boolean;
  createdAt: any;
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const currentUid = auth.currentUser?.uid;
    if (!currentUid) {
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    setLoading(true);

    const notificationsRef = collection(db, "notifications", currentUid, "items");
    const notificationsQuery = query(notificationsRef, orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(
      notificationsQuery,
      async (snapshot) => {
        const notificationDocs = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Notification[];

        setNotifications(notificationDocs);
        setUnreadCount(notificationDocs.filter((n) => !n.read).length);
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching notifications:", error);
        setNotifications([]);
        setUnreadCount(0);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [auth.currentUser?.uid]);

  const markAsRead = async (notificationId: string) => {
    const currentUid = auth.currentUser?.uid;
    if (!currentUid) return;

    try {
      const notificationRef = doc(db, "notifications", currentUid, "items", notificationId);
      await updateDoc(notificationRef, { read: true });
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const markAllAsRead = async () => {
    const currentUid = auth.currentUser?.uid;
    if (!currentUid) return;

    try {
      const unreadNotifications = notifications.filter((n) => !n.read);
      await Promise.all(
        unreadNotifications.map((n) =>
          updateDoc(doc(db, "notifications", currentUid, "items", n.id), { read: true })
        )
      );
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
    }
  };

  return { notifications, unreadCount, loading, markAsRead, markAllAsRead };
}
