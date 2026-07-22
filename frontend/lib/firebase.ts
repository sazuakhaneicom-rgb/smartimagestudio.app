import { initializeApp, getApps } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyADnwlODzs2xwgZyxWtPWms7bZRVjTzDuc",
  authDomain: "smart-image-73059.firebaseapp.com",
  projectId: "smart-image-73059",
  storageBucket: "smart-image-73059.firebasestorage.app",
  messagingSenderId: "870412454255",
  appId: "1:870412454255:web:b8161fb4a2ee19ba0fc09a",
  measurementId: "G-0JTRCSFT32"
};

export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const initAnalytics = async () => {
  if (typeof window !== "undefined" && await isSupported()) {
    return getAnalytics(app);
  }
  return null;
};
