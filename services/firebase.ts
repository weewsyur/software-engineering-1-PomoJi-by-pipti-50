import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyAvJ3HwJe_TkNYYjfjAREhRve8oLa7v1Zs",
  authDomain: "software-engineering1-pomoji.firebaseapp.com",
  projectId: "software-engineering1-pomoji",
  storageBucket: "software-engineering1-pomoji.appspot.com",
  messagingSenderId: "544871394102",
  appId: "1:544871394102:web:603e8becd54276639ca197",
};

export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// Use standard getAuth for web and React Native compatibility
// Firebase handles persistence automatically
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
