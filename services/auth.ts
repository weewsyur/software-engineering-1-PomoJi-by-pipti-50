import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  UserCredential,
} from "firebase/auth";
import { auth } from "@/services/firebase";
import { createUserDocument } from "@/services/firestore";

const getAuthErrorCode = (error: unknown) => {
  const code = (error as { code?: string } | null)?.code ?? "";
  console.log("Firebase auth error code:", code);
  console.log("Full error:", error);
  return code;
};

const mapCommonAuthError = (error: unknown) => {
  const code = getAuthErrorCode(error);
  if (code === "auth/invalid-api-key") {
    return "App configuration error. Please contact support.";
  }
  if (code === "auth/invalid-credential") {
    return "Invalid credentials. Please check your email and password.";
  }
  if (code === "auth/invalid-email") {
    return "Invalid email address format.";
  }
  if (code === "auth/weak-password") {
    return "Password is too weak. Please use a stronger password.";
  }
  if (code === "auth/too-many-requests") {
    return "Too many attempts. Please try again later.";
  }
  if (code === "auth/network-request-failed") {
    return "Network error. Please check your internet connection.";
  }
  return `Error: ${code || "Unknown error"}. Please try again.`;
};

const mapSignInError = (error: unknown) => {
  const code = getAuthErrorCode(error);
  if (code === "auth/user-not-found") {
    return "Account does not exist. Please register.";
  }
  if (code === "auth/wrong-password") {
    return "Incorrect password. Please try again.";
  }
  if (code === "auth/invalid-credential") {
    return "Invalid email or password.";
  }
  return mapCommonAuthError(error);
};

const mapSignUpError = (error: unknown) => {
  const code = getAuthErrorCode(error);
  if (code === "auth/email-already-in-use") {
    return "Email is already registered. Please sign in.";
  }
  if (code === "auth/weak-password") {
    return "Password must be at least 6 characters.";
  }
  if (code === "auth/invalid-email") {
    return "Invalid email address format.";
  }
  return mapCommonAuthError(error);
};

export const signUp = async (email: string, password: string): Promise<UserCredential> => {
  try {
    const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
    await createUserDocument(credential.user);
    return credential;
  } catch (error) {
    throw new Error(mapSignUpError(error));
  }
};

export const signIn = async (email: string, password: string): Promise<UserCredential> => {
  try {
    return await signInWithEmailAndPassword(auth, email.trim(), password);
  } catch (error) {
    throw new Error(mapSignInError(error));
  }
};

export const signOut = async (): Promise<void> => {
  try {
    await firebaseSignOut(auth);
  } catch (error) {
    throw new Error(mapCommonAuthError(error));
  }
};
