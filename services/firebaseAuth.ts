import { FirebaseApp } from "firebase/app";
import { getAuth } from "firebase/auth";

export function initializePlatformAuth(app: FirebaseApp) {
  return getAuth(app);
}
