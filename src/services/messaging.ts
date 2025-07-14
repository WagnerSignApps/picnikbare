import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, isSupported, Messaging } from 'firebase/messaging';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { firebaseConfig } from '../firebase/config';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// VAPID key from Firebase Console > Project Settings > Cloud Messaging
const VAPID_KEY = 'YOUR_VAPID_KEY';

let messaging: Messaging | null = null;

// Check if browser supports service workers and notifications
const isSupportedBrowser = async (): Promise<boolean> => {
  return await isSupported();
};

// Initialize messaging
const initMessaging = async (): Promise<Messaging | null> => {
  if (!(await isSupportedBrowser())) {
    console.warn('This browser does not support Firebase Cloud Messaging');
    return null;
  }

  if (messaging) return messaging;

  try {
    messaging = getMessaging(app);
    return messaging;
  } catch (error) {
    console.error('Failed to initialize Firebase Messaging:', error);
    return null;
  }
};

// Request notification permission
const requestPermission = async (): Promise<boolean> => {
  try {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return false;
  }
};

// Get FCM token
const getFcmToken = async (): Promise<string | null> => {
  const messaging = await initMessaging();
  if (!messaging) return null;

  try {
    const currentToken = await getToken(messaging, { vapidKey: VAPID_KEY });
    if (currentToken) {
      await saveTokenToFirestore(currentToken);
      return currentToken;
    } else {
      // Need to request permission to show notifications
      const permissionGranted = await requestPermission();
      if (permissionGranted) {
        return getFcmToken(); // Retry getting token after permission is granted
      }
      return null;
    }
  } catch (error) {
    console.error('Error getting FCM token:', error);
    return null;
  }
};

// Save FCM token to Firestore
const saveTokenToFirestore = async (token: string): Promise<void> => {
  const user = auth.currentUser;
  if (!user) return;

  try {
    const userRef = doc(db, 'users', user.uid);
    const userDoc = await getDoc(userRef);
    
    const fcmTokens = userDoc.data()?.fcmTokens || [];
    
    // Only update if token doesn't exist
    if (!fcmTokens.includes(token)) {
      await setDoc(
        userRef,
        {
          fcmTokens: [...fcmTokens, token],
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    }
  } catch (error) {
    console.error('Error saving FCM token to Firestore:', error);
  }
};

// Delete FCM token from Firestore
const deleteToken = async (token: string): Promise<void> => {
  const user = auth.currentUser;
  if (!user) return;

  try {
    const userRef = doc(db, 'users', user.uid);
    const userDoc = await getDoc(userRef);
    
    const fcmTokens = userDoc.data()?.fcmTokens || [];
    const updatedTokens = fcmTokens.filter((t: string) => t !== token);
    
    await setDoc(
      userRef,
      {
        fcmTokens: updatedTokens,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (error) {
    console.error('Error deleting FCM token from Firestore:', error);
  }
};

// Listen for foreground messages
const onForegroundMessage = (callback: (payload: any) => void): (() => void) => {
  if (!messaging) {
    console.warn('Messaging not initialized');
    return () => {};
  }

  const unsubscribe = onMessage(messaging, (payload) => {
    console.log('Foreground message received:', payload);
    callback(payload);
  });

  return unsubscribe;
};

export const messagingService = {
  isSupported: isSupportedBrowser,
  requestPermission,
  getToken: getFcmToken,
  deleteToken,
  onForegroundMessage,
  initMessaging,
};
