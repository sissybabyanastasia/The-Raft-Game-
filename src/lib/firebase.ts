import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import {
  getAuth,
  signInAnonymously,
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  type User,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId || '(default)');
export const auth = getAuth(app);

export interface AppUser {
  uid: string;
  isAnonymous?: boolean;
  displayName?: string | null;
  email?: string | null;
  photoURL?: string | null;
}

export function getOrCreateGuestUid(): string {
  let uid = localStorage.getItem('raft_guest_uid');
  if (!uid) {
    uid = 'guest_' + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
    localStorage.setItem('raft_guest_uid', uid);
  }
  return uid;
}

export async function ensureAnonymousAuth(): Promise<AppUser> {
  if (auth.currentUser) {
    return auth.currentUser;
  }
  return new Promise((resolve) => {
    let resolved = false;

    const fallbackToGuest = () => {
      if (resolved) return;
      resolved = true;
      const guestUser: AppUser = {
        uid: getOrCreateGuestUid(),
        isAnonymous: true,
        displayName: localStorage.getItem('raft_display_name') || 'Castaway',
        email: null,
      };
      resolve(guestUser);
    };

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        unsubscribe();
        if (!resolved) {
          resolved = true;
          resolve(user);
        }
      } else {
        try {
          const cred = await signInAnonymously(auth);
          unsubscribe();
          if (!resolved) {
            resolved = true;
            resolve(cred.user);
          }
        } catch (err: any) {
          console.warn('Anonymous auth not enabled in Firebase project, using guest identity mode:', err?.message || err);
          unsubscribe();
          fallbackToGuest();
        }
      }
    });

    // Safety timeout: if onAuthStateChanged hangs for more than 2 seconds, resolve with guest user
    setTimeout(() => {
      fallbackToGuest();
    }, 2000);
  });
}

export async function signInWithGoogle(): Promise<User> {
  const provider = new GoogleAuthProvider();
  const res = await signInWithPopup(auth, provider);
  return res.user;
}

export async function logOut(): Promise<void> {
  await signOut(auth);
}

export { app };
