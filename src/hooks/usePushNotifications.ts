import { useEffect, useState, useCallback } from 'react';
import { messagingService } from '../services/messaging';
import { useAuth } from '../contexts/AuthContext';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

export interface NotificationPreferences {
  enabled: boolean;
  sound: boolean;
  email: boolean;
  push: boolean;
  types: {
    picnicInvites: boolean;
    friendRequests: boolean;
    messages: boolean;
    updates: boolean;
  };
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
  enabled: true,
  sound: true,
  email: true,
  push: true,
  types: {
    picnicInvites: true,
    friendRequests: true,
    messages: true,
    updates: true,
  },
};

export const usePushNotifications = () => {
  const { currentUser } = useAuth();
  const [token, setToken] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState<boolean>(false);
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof window !== 'undefined' ? Notification.permission : 'denied'
  );
  const [preferences, setPreferences] = useState<NotificationPreferences>(DEFAULT_PREFERENCES);

  // Check browser support and initialize messaging
  useEffect(() => {
    const checkSupport = async () => {
      const supported = await messagingService.isSupported();
      setIsSupported(supported);
      
      if (supported) {
        await messagingService.initMessaging();
      }
    };

    checkSupport();
  }, []);

  // Request notification permission
  const requestPermission = useCallback(async () => {
    if (!isSupported) return false;
    
    const granted = await messagingService.requestPermission();
    setPermission(granted ? 'granted' : 'denied');
    
    if (granted) {
      const token = await messagingService.getToken();
      setToken(token);
    }
    
    return granted;
  }, [isSupported]);

  // Get FCM token
  const getToken = useCallback(async () => {
    if (!isSupported) return null;
    
    const token = await messagingService.getToken();
    setToken(token);
    return token;
  }, [isSupported]);

  // Delete FCM token
  const deleteToken = useCallback(async () => {
    if (!token) return;
    
    await messagingService.deleteToken(token);
    setToken(null);
  }, [token]);

  // Load user preferences
  useEffect(() => {
    if (!currentUser) return;

    const userRef = doc(db, 'users', currentUser.uid);
    const unsubscribe = onSnapshot(userRef, (doc) => {
      const data = doc.data();
      if (data?.notificationPreferences) {
        setPreferences({
          ...DEFAULT_PREFERENCES,
          ...data.notificationPreferences,
        });
      }
    });

    return () => unsubscribe();
  }, [currentUser]);

  // Save preferences to Firestore
  const updatePreferences = useCallback(
    async (updates: Partial<NotificationPreferences>) => {
      if (!currentUser) return;

      const newPreferences = {
        ...preferences,
        ...updates,
        types: {
          ...preferences.types,
          ...updates.types,
        },
      };

      setPreferences(newPreferences);

      try {
        const userRef = doc(db, 'users', currentUser.uid);
        await setDoc(
          userRef,
          {
            notificationPreferences: newPreferences,
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );
      } catch (error) {
        console.error('Error updating notification preferences:', error);
      }
    },
    [currentUser, preferences]
  );

  // Handle foreground messages
  const onMessage = useCallback(
    (callback: (payload: any) => void) => {
      if (!isSupported) return () => {};
      return messagingService.onForegroundMessage(callback);
    },
    [isSupported]
  );

  return {
    isSupported,
    permission,
    token,
    preferences,
    requestPermission,
    getToken,
    deleteToken,
    updatePreferences,
    onMessage,
  };
};
