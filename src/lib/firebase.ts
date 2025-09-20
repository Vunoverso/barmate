
// This file is no longer the primary data source but kept for reference or potential future use.
// All data logic is being migrated to Supabase.

// Importa as funções necessárias dos SDKs que você precisa
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Sua configuração do app web do Firebase
// As chaves são carregadas a partir de variáveis de ambiente
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Inicializa o Firebase
// Evita a reinicialização no ambiente de desenvolvimento (hot-reloading)
let app;
if (!getApps().length) {
    if (!firebaseConfig.projectId) {
        console.error("Configuração do Firebase incompleta. Verifique suas variáveis de ambiente.");
        app = null;
    } else {
        app = initializeApp(firebaseConfig);
    }
} else {
    app = getApp();
}

// Obtém uma instância do Firestore
const db = app ? getFirestore(app) : null as any;

export { app, db };
