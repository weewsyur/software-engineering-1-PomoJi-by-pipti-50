import { useState } from "react";
import { deleteDoc, doc } from "firebase/firestore";
import { db } from "@/services/firebase";

export function useDeleteActivity() {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const deleteActivity = async (id: string): Promise<void> => {
    setDeleting(true);
    setError(null);
    try {
      await deleteDoc(doc(db, "activities", id));
    } catch (err) {
      const error = err as Error;
      setError(error);
      throw error;
    } finally {
      setDeleting(false);
    }
  };

  return { deleteActivity, deleting, error };
}
