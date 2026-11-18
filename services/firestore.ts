import {
  getDoc,
  doc,
  runTransaction,
  serverTimestamp,
  setDoc,
  writeBatch,
} from "firebase/firestore";
import { updateProfile, User } from "firebase/auth";
import { auth, db } from "@/services/firebase";
import {
  EMPTY_USER_NAME_FIELDS,
  formatUserName,
  generateUsername,
  getPublicUsername,
  readUserNameFields,
  UserNameFields,
} from "@/utils/userName";

export type UserDocument = Omit<UserNameFields, "middleName" | "suffix"> &
  Partial<Pick<UserNameFields, "middleName" | "suffix">> & {
  uid: string;
  email: string | null;
  fullName: string;
  displayName: string;
  username: string;
  createdAt: ReturnType<typeof serverTimestamp>;
  updatedAt: ReturnType<typeof serverTimestamp>;
  photoURL: string | null;
  photoUrl?: string | null;
};

export type PublicProfileDocument = {
  uid: string;
  displayName: string;
  username: string;
  photoUrl?: string | null;
};

export const createUserDocument = async (
  user: User,
  nameFields: UserNameFields = EMPTY_USER_NAME_FIELDS,
) => {
  const firstName = nameFields.firstName?.trim();
  const lastName = nameFields.lastName?.trim();
  if (!firstName || !lastName || !user.email) {
    throw new Error("First name, last name, and email are required.");
  }

  const normalizedNameFields = {
    ...nameFields,
    firstName,
    lastName,
    middleName: nameFields.middleName?.trim() || null,
    suffix: nameFields.suffix?.trim() || null,
  };
  const userRef = doc(db, "users", user.uid);
  const publicProfileRef = doc(db, "publicProfiles", user.uid);
  const fullName = formatUserName(normalizedNameFields);
  const username = generateUsername(normalizedNameFields);
  const payload: UserDocument = {
    uid: user.uid,
    email: user.email,
    fullName,
    displayName: fullName,
    username,
    firstName,
    lastName,
    ...(normalizedNameFields.middleName
      ? { middleName: normalizedNameFields.middleName }
      : {}),
    ...(normalizedNameFields.suffix
      ? { suffix: normalizedNameFields.suffix }
      : {}),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    photoURL: user.photoURL || null,
  };
  const batch = writeBatch(db);
  batch.set(userRef, payload, { merge: true });
  batch.set(
    publicProfileRef,
    {
      uid: user.uid,
      displayName: fullName,
      username,
      photoUrl: payload.photoURL,
    },
    { merge: true },
  );
  await batch.commit();

  const createdSnapshot = await getDoc(userRef);
  const createdData = createdSnapshot.data();
  if (
    !createdSnapshot.exists() ||
    !createdData ||
    createdData.uid !== user.uid ||
    createdData.firstName !== firstName ||
    createdData.lastName !== lastName ||
    createdData.fullName !== fullName ||
    createdData.username !== username ||
    createdData.email !== user.email
  ) {
    throw new Error("The user profile could not be verified after creation.");
  }

  return payload;
};

export const syncPublicProfile = async (
  userId: string,
  profile: Omit<PublicProfileDocument, "uid" | "displayName"> & {
    displayName?: string;
  },
): Promise<void> => {
  const displayName = profile.displayName ?? profile.username;
  await setDoc(
    doc(db, "publicProfiles", userId),
    {
      uid: userId,
      displayName,
      ...profile,
      username: getPublicUsername(profile.username, auth.currentUser?.email),
    },
    { merge: true },
  );
};

const usableProfileName = (
  value: unknown,
  email: string | null,
): string | null => {
  if (typeof value !== "string") return null;
  const name = value.trim();
  if (
    !name ||
    name.toLowerCase() === "user" ||
    name.includes("@") ||
    name.toLowerCase() === email?.trim().toLowerCase()
  ) {
    return null;
  }
  return name;
};

export const synchronizeUserDisplayName = async (
  user: User,
): Promise<string> => {
  const userRef = doc(db, "users", user.uid);
  const userSnapshot = await getDoc(userRef);
  if (!userSnapshot.exists()) {
    return usableProfileName(user.displayName, user.email) ?? "";
  }

  const data = userSnapshot.data();
  const nameFields = readUserNameFields(data);
  const displayName =
    formatUserName(nameFields) ||
    usableProfileName(data.fullName, user.email) ||
    usableProfileName(data.displayName, user.email) ||
    usableProfileName(user.displayName, user.email) ||
    usableProfileName(data.username, user.email) ||
    "";
  if (!displayName) return "";

  const username =
    usableProfileName(data.username, user.email) ||
    generateUsername(nameFields) ||
    displayName.replace(/\s+/g, "").toLowerCase();
  const updates: Record<string, unknown> = {};
  if (data.fullName !== displayName) updates.fullName = displayName;
  if (data.displayName !== displayName) updates.displayName = displayName;
  if (data.username !== username) updates.username = username;
  if (Object.keys(updates).length > 0) {
    updates.updatedAt = serverTimestamp();
    await setDoc(userRef, updates, { merge: true });
  }
  if (user.displayName !== displayName) {
    await updateProfile(user, { displayName });
  }

  return displayName;
};

export const migrateUserNameFields = async (
  userId: string,
): Promise<UserNameFields | null> => {
  const userRef = doc(db, "users", userId);

  return runTransaction(db, async (transaction) => {
    const userSnapshot = await transaction.get(userRef);
    if (!userSnapshot.exists()) return null;

    const data = userSnapshot.data();
    const updates: Partial<UserNameFields> = {};
    for (const field of Object.keys(EMPTY_USER_NAME_FIELDS) as Array<
      keyof UserNameFields
    >) {
      if (!(field in data)) updates[field] = null;
    }

    if (Object.keys(updates).length > 0) {
      transaction.update(userRef, updates);
    }

    return readUserNameFields({ ...data, ...updates });
  });
};
