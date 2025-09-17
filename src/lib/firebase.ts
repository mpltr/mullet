import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyApogsECUaNtSsAddiiRcYZ7MNhRZXYK4E",
  authDomain: "mullet-3f113.firebaseapp.com",
  projectId: "mullet-3f113",
  storageBucket: "mullet-3f113.firebasestorage.app",
  messagingSenderId: "139867870900",
  appId: "1:139867870900:web:6544de9e968bc8ce4de9e1"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
export default app;