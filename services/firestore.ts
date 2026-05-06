import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { User } from "firebase/auth";
import { db } from "@/services/firebase";

export interface UserDocument {
  uid: string;
  email: string | null;
  createdAt: ReturnType<typeof serverTimestamp>;
}

export const createUserDocument = async (user: User) => {
  try {
    const userRef = doc(db, "users", user.uid);
    const payload: UserDocument = {
      uid: user.uid,
      email: user.email,
      createdAt: serverTimestamp(),
    };
    await setDoc(userRef, payload, { merge: true });
    return payload;
  } catch (error) {
    throw error;
  }
};
