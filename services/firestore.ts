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
    console.log("Creating user document for:", user.uid);
    const userRef = doc(db, "users", user.uid);
    const payload: UserDocument = {
      uid: user.uid,
      email: user.email,
      createdAt: serverTimestamp(),
    };
    await setDoc(userRef, payload, { merge: true });
    console.log("User document created successfully");
    return payload;
  } catch (error) {
    console.error("Error creating user document:", error);
    throw error;
  }
};
