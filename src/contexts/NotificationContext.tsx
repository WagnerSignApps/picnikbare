import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { useAuth } from './AuthSimple';
import { getUnreadNotifications, markNotificationAsRead, Notification } from '../firebase/notifications';
import { playSound } from '../utils/sound';
import { onSnapshot, query, where, collection } from 'firebase/firestore';
import { db } from '../firebase/config';

type NotificationContextType = {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (notificationId: string) => Promise<void>;
  refreshNotifications: () => Promise<void>;
};

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const previousCountRef = useRef(0);

  const loadNotifications = async () => {
    if (!currentUser?.uid) return;

    try {
      const unread = await getUnreadNotifications(currentUser.uid);
      
      // Check if we have new notifications
      if (unread.length > previousCountRef.current) {
        // Only play sound if we have new notifications
        if (previousCountRef.current > 0) { // Don't play on initial load
          playSound('notification');
        }
      }
      
      previousCountRef.current = unread.length;
      setNotifications(unread);
      setUnreadCount(unread.length);
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  };

  // Set up real-time listener for notifications
  useEffect(() => {
    if (!currentUser?.uid) return;

    const q = query(
      collection(db, 'notifications'),
      where('recipientId', '==', currentUser.uid),
      where('isRead', '==', false)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const updatedNotifications = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Notification[];
      
      setNotifications(updatedNotifications);
      setUnreadCount(updatedNotifications.length);
    });

    return () => unsubscribe();
  }, [currentUser?.uid]);

  const markAsRead = async (notificationId: string) => {
    try {
      await markNotificationAsRead(notificationId);
      setNotifications(prev => 
        prev.filter(n => n.id !== notificationId)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  return (
    <NotificationContext.Provider 
      value={{ 
        notifications, 
        unreadCount, 
        markAsRead, 
        refreshNotifications: loadNotifications 
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
