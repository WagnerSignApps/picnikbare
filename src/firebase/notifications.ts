import { collection, doc, setDoc, getDocs, query, where, updateDoc } from 'firebase/firestore';
import { db } from './config';

export type NotificationType = 'picnic_invite' | 'friend_request' | 'picnic_update' | 'message';

export interface Notification {
  id: string;
  type: NotificationType;
  senderId: string;
  recipientId: string;
  picnicId?: string;
  message: string;
  isRead: boolean;
  createdAt: Date;
  updatedAt: Date;
  data?: Record<string, any>; // For any additional data
}

const notificationsCollection = collection(db, 'notifications');

export const sendNotification = async (notification: Omit<Notification, 'id' | 'createdAt' | 'updatedAt' | 'isRead'>) => {
  try {
    const notificationRef = doc(notificationsCollection);
    const newNotification: Notification = {
      id: notificationRef.id,
      ...notification,
      isRead: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    await setDoc(notificationRef, newNotification);
    return newNotification;
  } catch (error) {
    console.error('Error sending notification:', error);
    throw error;
  }
};

export const getUnreadNotifications = async (userId: string) => {
  try {
    const q = query(
      notificationsCollection,
      where('recipientId', '==', userId),
      where('isRead', '==', false)
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Notification[];
  } catch (error) {
    console.error('Error getting notifications:', error);
    throw error;
  }
};

export const markNotificationAsRead = async (notificationId: string) => {
  try {
    const notificationRef = doc(notificationsCollection, notificationId);
    await updateDoc(notificationRef, {
      isRead: true,
      updatedAt: new Date()
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    throw error;
  }
};

export const sendPicnicInvite = async ({
  picnicId,
  senderId,
  recipientId,
  message = 'You\'ve been invited to join a picnic!'
}: {
  picnicId: string;
  senderId: string;
  recipientId: string;
  message?: string;
}) => {
  return sendNotification({
    type: 'picnic_invite',
    senderId,
    recipientId,
    picnicId,
    message,
  });
};

export const respondToPicnicInvite = async ({
  picnicId,
  notificationId,
  accept,
}: {
  picnicId: string;
  notificationId: string;
  accept: boolean;
}) => {
  const functions = getFunctions();
  const respondToInvite = httpsCallable(functions, 'respondToPicnicInvite');
  return respondToInvite({ picnicId, notificationId, accept });
};
