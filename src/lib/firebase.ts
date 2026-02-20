
"use client";
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDa8OLI63V9-1fHHdcoq8QJfn34FruLdsk",
  authDomain: "barmate-lp3fo.firebaseapp.com",
  projectId: "barmate-lp3fo",
  storageBucket: "barmate-lp3fo.firebasestorage.app",
  messagingSenderId: "162755937673",
  appId: "1:162755937673:web:9fdcc382da93aaea3fcd58"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);

export { app, db };
