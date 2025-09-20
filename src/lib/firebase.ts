// Importa as funções necessárias dos SDKs que você precisa
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Sua configuração do app web do Firebase
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREbase_app_id,
};

// Inicializa o Firebase
// Evita a reinicialização no ambiente de desenvolvimento (hot-reloading)
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Obtém uma instância do Firestore
const db = getFirestore(app);

export { app, db };
