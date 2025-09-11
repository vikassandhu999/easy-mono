import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getStorage, type FirebaseStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyBs0bDJoJE5sn3bSFfwJqIu09yBfeDKPjU",
  authDomain: "waitlisting-b8db9.firebaseapp.com",
  projectId: "waitlisting-b8db9",
  storageBucket: "waitlisting-b8db9.firebasestorage.app",
  messagingSenderId: "989523701063",
  appId: "1:989523701063:web:55f3c492911ec0ef133062",
  measurementId: "G-KJQPV02GQK"
};

let app: FirebaseApp | undefined;
let storage: FirebaseStorage | undefined;

export const getFirebaseApp = (): FirebaseApp => {
  if (!app) {
    app = getApps().length ? getApps()[0]! : initializeApp(firebaseConfig);
  }
  return app;
};

export const getFirebaseStorage = (): FirebaseStorage => {
  if (!storage) {
    storage = getStorage(getFirebaseApp());
  }
  return storage;
};

// Firestore helpers (lazy-loaded to avoid SSR issues when not used on the client)
export const getFirebaseFirestore = async () => {
  const { getFirestore } = await import('firebase/firestore');
  return getFirestore(getFirebaseApp());
};

export const addToWaitlist = async (
  email: string,
  extra?: Record<string, unknown>
): Promise<{ status: 'exists' | 'created'; id?: string }> => {
  const db = await getFirebaseFirestore();
  const {
    collection,
    addDoc,
    serverTimestamp,
    query,
    where,
    limit,
    getDocs,
  } = await import('firebase/firestore');

  const emailLower = email.trim().toLowerCase();
  const col = collection(db, 'waitlist');
  const q = query(col, where('email_lower', '==', emailLower), limit(1));
  const snap = await getDocs(q);
  if (!snap.empty) {
    return { status: 'exists', id: snap.docs[0].id };
  }

  const docRef = await addDoc(col, {
    email,
    email_lower: emailLower,
    createdAt: serverTimestamp(),
    ...extra,
  });
  return { status: 'created', id: docRef.id };
};

