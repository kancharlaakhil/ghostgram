// firebaseConfig.js
import { firebase } from '@react-native-firebase/app';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import storage from '@react-native-firebase/storage';

// Optional: You can initialize with config, but not needed if using google-services.json/Info.plist
// firebase.initializeApp({...}); // usually handled automatically

export { auth, firestore as db, storage };
