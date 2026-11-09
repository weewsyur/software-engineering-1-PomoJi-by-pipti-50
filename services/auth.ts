import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
  UserCredential,
} from "firebase/auth";
import { auth } from "@/services/firebase";
import { createUserDocument } from "@/services/firestore";
import { EMPTY_USER_NAME_FIELDS, formatUserName, UserNameFields } from "@/utils/userName";

const getAuthErrorCode = (error: unknown) => {
  const code = (error as { code?: string } | null)?.code ?? "";
  return code;
};

const mapCommonAuthError = (error: unknown) => {
  const code = getAuthErrorCode(error);
  if (code === "auth/invalid-api-key") {
    return "App configuration error. Please contact support.";
  }
  if (code === "auth/invalid-email") {
    return "Please enter a valid email address.";
  }
  if (code === "auth/weak-password") {
    return "Password does not meet the requirements.";
  }
  if (code === "auth/too-many-requests") {
    return "Too many attempts. Please try again later.";
  }
  if (code === "auth/network-request-failed") {
    return "Unable to connect. Please check your internet connection.";
  }
  return "Unable to complete authentication. Please try again.";
};

const mapSignInError = (error: unknown) => {
  const code = getAuthErrorCode(error);
  if (
    code === "auth/user-not-found" ||
    code === "auth/wrong-password" ||
    code === "auth/invalid-credential"
  ) {
    return "Incorrect email or password.";
  }
  return mapCommonAuthError(error);
};

const mapSignUpError = (error: unknown) => {
  const code = getAuthErrorCode(error);
  if (code === "auth/email-already-in-use") {
    return "Email is already registered. Please sign in.";
  }
  if (code === "auth/weak-password") {
    return "Password does not meet the requirements.";
  }
  return mapCommonAuthError(error);
};

export const getSignUpErrorMessage = (error: unknown) => mapSignUpError(error);

export const signUp = async (
  email: string,
  password: string,
  nameFields: UserNameFields = EMPTY_USER_NAME_FIELDS,
): Promise<UserCredential> => {
  try {
    const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
    const displayName = formatUserName(nameFields);
    if (displayName) {
      await updateProfile(credential.user, { displayName });
    }
    await createUserDocument(credential.user, nameFields);
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
