import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  User,
  updateProfile,
  UserCredential,
} from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { auth } from "@/services/firebase";
import { createUserDocument } from "@/services/firestore";
import {
  isPasswordValid,
  isValidEmailAddress,
} from "@/utils/authValidation";
import {
  EMPTY_USER_NAME_FIELDS,
  formatUserName,
  UserNameFields,
} from "@/utils/userName";

const getAuthErrorCode = (error: unknown) => {
  const code = (error as { code?: string } | null)?.code ?? "";
  return code;
};

const mapCommonAuthError = (
  error: unknown,
  fallbackMessage = "Unable to complete authentication. Please try again.",
) => {
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
  return fallbackMessage;
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
  if (code === "auth/operation-not-allowed") {
    return "Registration is currently unavailable. Please try again later.";
  }
  if (code === "auth/weak-password") {
    return "Password does not meet the requirements.";
  }
  return mapCommonAuthError(
    error,
    "Unable to complete registration. Please try again.",
  );
};

export const getSignUpErrorMessage = (error: unknown) => mapSignUpError(error);

const mapProfileCreationError = (error: unknown) => {
  const code = getAuthErrorCode(error);
  if (code === "unavailable" || code === "deadline-exceeded") {
    return "Unable to save your profile. Please check your internet connection and try again.";
  }
  if (code === "permission-denied") {
    return "Unable to save your profile. Please try again later.";
  }
  return "Unable to save your profile. Please try again.";
};

type PendingRegistration = {
  email: string;
  credential: UserCredential;
  nameFields: UserNameFields;
  profileComplete: boolean;
};

let pendingRegistration: PendingRegistration | null = null;
const pendingRegistrationStorageKey = (uid: string) =>
  `pomoji:pending-registration:${uid}`;

export const recoverPendingUserProfile = async (user: User): Promise<boolean> => {
  const key = pendingRegistrationStorageKey(user.uid);
  try {
    const storedRegistration = await AsyncStorage.getItem(key);
    if (!storedRegistration) return false;

    const parsed: unknown = JSON.parse(storedRegistration);
    if (!parsed || typeof parsed !== "object" || !("nameFields" in parsed)) {
      throw new Error("Stored registration profile is invalid.");
    }

    const nameFields = (parsed as { nameFields: Partial<UserNameFields> })
      .nameFields;
    if (
      typeof nameFields.firstName !== "string" ||
      !nameFields.firstName.trim() ||
      typeof nameFields.lastName !== "string" ||
      !nameFields.lastName.trim()
    ) {
      throw new Error("Stored registration is missing required name fields.");
    }

    const recoveredNameFields: UserNameFields = {
      firstName: nameFields.firstName.trim(),
      lastName: nameFields.lastName.trim(),
      middleName:
        typeof nameFields.middleName === "string"
          ? nameFields.middleName.trim() || null
          : null,
      suffix:
        typeof nameFields.suffix === "string"
          ? nameFields.suffix.trim() || null
          : null,
    };
    await createUserDocument(user, recoveredNameFields);
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error("Unable to clear recovered registration data:", error);
    }
    console.info("Recovered incomplete registration profile for UID:", user.uid);
    return true;
  } catch (error) {
    console.error("Unable to recover incomplete registration profile:", error);
    return false;
  }
};

export const signUp = async (
  email: string,
  password: string,
  nameFields: UserNameFields = EMPTY_USER_NAME_FIELDS,
): Promise<UserCredential> => {
  const normalizedEmail = email.trim().toLowerCase();
  const firstName = nameFields.firstName?.trim();
  const lastName = nameFields.lastName?.trim();
  if (!firstName || !lastName) {
    throw new Error("Please enter your first and last name.");
  }
  if (!isValidEmailAddress(normalizedEmail)) {
    throw new Error("Please enter a valid email address.");
  }
  if (!isPasswordValid(password)) {
    throw new Error("Password does not meet the requirements.");
  }

  const normalizedNameFields: UserNameFields = {
    ...nameFields,
    firstName,
    lastName,
    middleName: nameFields.middleName?.trim() || null,
    suffix: nameFields.suffix?.trim() || null,
  };
  const pending = pendingRegistration;
  if (pending && auth.currentUser?.uid === pending.credential.user.uid) {
    if (pending.email !== normalizedEmail) {
      throw new Error(
        "Please retry registration with the email address you originally entered.",
      );
    }

    if (!pending.profileComplete) {
      try {
        const displayName = formatUserName(pending.nameFields);
        await updateProfile(pending.credential.user, { displayName });
        await createUserDocument(pending.credential.user, pending.nameFields);
        pending.profileComplete = true;
        try {
          await AsyncStorage.removeItem(
            pendingRegistrationStorageKey(pending.credential.user.uid),
          );
        } catch (storageError) {
          console.error("Unable to clear completed registration data:", storageError);
        }
      } catch (error) {
        console.error("Failed to complete pending user profile:", error);
        throw new Error(mapProfileCreationError(error));
      }
    }

    try {
      await firebaseSignOut(auth);
    } catch {
      throw new Error(
        "Your account and profile were created, but we couldn't finish signing you out. Please retry registration to finish setup.",
      );
    }

    pendingRegistration = null;
    return pending.credential;
  }
  if (pending) pendingRegistration = null;

  let credential: UserCredential;
  try {
    credential = await createUserWithEmailAndPassword(auth, normalizedEmail, password);
  } catch (error) {
    throw new Error(mapSignUpError(error));
  }

  const displayName = formatUserName(normalizedNameFields);
  try {
    await updateProfile(credential.user, { displayName });
    await createUserDocument(credential.user, normalizedNameFields);
  } catch (error) {
    console.error("Failed to create Firestore profile after account creation:", error);
    pendingRegistration = {
      email: normalizedEmail,
      credential,
      nameFields: normalizedNameFields,
      profileComplete: false,
    };
    try {
      await AsyncStorage.setItem(
        pendingRegistrationStorageKey(credential.user.uid),
        JSON.stringify({ nameFields: normalizedNameFields }),
      );
    } catch (storageError) {
      console.error("Unable to persist incomplete registration profile:", storageError);
    }
    throw new Error(
      `${mapProfileCreationError(error)} Your account already exists; retry registration with the same email to finish setup.`,
    );
  }

  try {
    await firebaseSignOut(auth);
  } catch {
    pendingRegistration = {
      email: normalizedEmail,
      credential,
      nameFields,
      profileComplete: true,
    };
    throw new Error(
      "Your account and profile were created, but we couldn't finish signing you out. Please retry registration to finish setup.",
    );
  }

  return credential;
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
