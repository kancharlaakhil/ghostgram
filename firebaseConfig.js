import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  initializeAuth,
  getReactNativePersistence,
  getAuth,
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: 'AIzaSyBmFGGs4FgFS0xH_-iQrYT9B2paQnAUAbk',
  authDomain: 'ghostgram-42be7.firebaseapp.com',
  projectId: 'ghostgram-42be7',
  storageBucket: 'ghostgram-42be7.appspot.com',
  messagingSenderId: '918642141603',
  appId: '1:918642141603:web:43160cafa32ba3fa049216',
};

let app;
let auth;

if (!getApps().length) {
  app = initializeApp(firebaseConfig);
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} else {
  app = getApp();
  auth = getAuth(app);
}

const db = getFirestore(app);
const storage = getStorage(app);

export { app, auth, db, storage };
