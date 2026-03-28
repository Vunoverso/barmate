
"use client";
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

// As configurações agora são lidas de variáveis de ambiente para segurança
// No desenvolvimento local, use o arquivo .env
// Na Vercel, configure estas chaves no painel do projeto
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyDa8OLI63V9-1fHHdcoq8QJfn34FruLdsk",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "barmate-lp3fo.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "barmate-lp3fo",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "barmate-lp3fo.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "162755937673",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:162755937673:web:9fdcc382da93aaea3fcd58"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

export { app, db, auth, storage };
