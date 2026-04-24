import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

// Custom auth bypass
export const auth = {
  get currentUser() {
    try {
      const stored = localStorage.getItem('wolftech_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  },
  signOut: async () => {
    localStorage.removeItem('wolftech_user');
  }
};
