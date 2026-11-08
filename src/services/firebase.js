import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDzRTp4kQuSUi368PauFRISRlHntlqPoMk",
  authDomain: "hbplus-auth-app-9f2e2.firebaseapp.com",
  projectId: "hbplus-auth-app-9f2e2",
  storageBucket: "hbplus-auth-app-9f2e2.firebasestorage.app",
  messagingSenderId: "903663103329",
  appId: "1:903663103329:web:a356da47fed5ad3417e920",
  measurementId: "G-MSKXLX5X38"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);