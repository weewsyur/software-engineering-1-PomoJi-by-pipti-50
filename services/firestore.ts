import {
  doc,
  runTransaction,
  serverTimestamp,
  setDoc,
  writeBatch,
} from "firebase/firestore";
import { User } from "firebase/auth";
import { auth, db } from "@/services/firebase";
import {
  EMPTY_USER_NAME_FIELDS,
  formatUserName,
  getPublicUsername,
  readUserNameFields,
  UserNameFields,
} from "@/utils/userName";

export type UserDocument = UserNameFields & {
  uid: string;
  email: string | null;
  username: string;
  createdAt: ReturnType<typeof serverTimestamp>;
  photoUrl?: string | null;
};

export type PublicProfileDocument = {
  uid: string;
  username: string;
  photoUrl?: string | null;
};

export const createUserDocument = async (
  user: User,
  nameFields: UserNameFields = EMPTY_USER_NAME_FIELDS,
) => {
  const userRef = doc(db, "users", user.uid);
  const publicProfileRef = doc(db, "publicProfiles", user.uid);
  const payload: UserDocument = {
    uid: user.uid,
    email: user.email,
    username: getPublicUsername(
      formatUserName(nameFields, user.displayName),
      user.email,
    ),
    ...nameFields,
    createdAt: serverTimestamp(),
  };
  const batch = writeBatch(db);
  batch.set(userRef, payload, { merge: true });
  batch.set(
    publicProfileRef,
    {
      uid: user.uid,
      username: payload.username,
      photoUrl: payload.photoUrl ?? null,
    },
    { merge: true },
  );
  await batch.commit();
  return payload;
};

export const syncPublicProfile = async (
  userId: string,
  profile: Omit<PublicProfileDocument, "uid">,
): Promise<void> => {
  await setDoc(
    doc(db, "publicProfiles", userId),
    {
      uid: userId,
      ...profile,
      username: getPublicUsername(profile.username, auth.currentUser?.email),
    },
    { merge: true },
  );
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
