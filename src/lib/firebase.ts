"use client";

import { initializeApp, getApp, getApps, type FirebaseApp, type FirebaseOptions } from "firebase/app";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";

const firebaseConfig: FirebaseOptions = {
	apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
	authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
	projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
	storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
	messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
	appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const isFirebaseConfigured = Object.values(firebaseConfig).every(Boolean);

const app: FirebaseApp | null = isFirebaseConfigured
	? getApps().length
		? getApp()
		: initializeApp(firebaseConfig)
	: null;

const db: Firestore | null = app ? getFirestore(app) : null;
const storage: FirebaseStorage | null = app ? getStorage(app) : null;

export { app, db, storage };
