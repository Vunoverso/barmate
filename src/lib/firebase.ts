"use client";

import { initializeApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// As variáveis de ambiente do Firebase são injetadas durante o processo de build no Firebase App Hosting.
// Para desenvolvimento local, você precisará criar um arquivo .env.local e preenchê-las.
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let app;
if (!getApps().length) {
  // Se estivermos no lado do servidor (build) e a config já estiver no JSON do sistema, use-a.
  // Isso é um fallback caso as `NEXT_PUBLIC_` vars não estejam definidas.
  if (typeof window === 'undefined' && process.env.FIREBASE_WEBAPP_CONFIG) {
     try {
       const serverConfig = JSON.parse(process.env.FIREBASE_WEBAPP_CONFIG);
       app = initializeApp(serverConfig);
     } catch(e) {
       console.error("Failed to parse FIREBASE_WEBAPP_CONFIG", e);
       app = initializeApp(firebaseConfig);
     }
  } else {
    app = initializeApp(firebaseConfig);
  }
} else {
  app = getApps()[0];
}

const db = getFirestore(app);

export { db };
