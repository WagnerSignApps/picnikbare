import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  arrayUnion, 
  arrayRemove, 
  query, 
  where, 
  getDocs,
  serverTimestamp,
  writeBatch,
  Timestamp
} from 'firebase/firestore'; 
import { db } from './config';

type UserData = {
  name: string;
  email: string;
  photoURL?: string;
  friends?: string[];
  friendProfiles?: Record<string, FriendProfile>;
};

type FriendProfile = {
  name: string;
  email: string;
  photoURL?: string;
};

export type FriendRequestStatus = 'pending' | 'accepted' | 'rejected';

export interface FriendRequest {
  id: string;
  fromUserId: string;
  toUserId: string;
  status: FriendRequestStatus;
  createdAt: Date;
  updatedAt: Date;
  fromUser?: {
    id: string;
    name: string;
    email: string;
    photoURL?: string;
  };
}

const friendRequestsCollection = collection(db, 'friendRequests');
const usersCollection = collection(db, 'users');

/**
 * Send a friend request from one user to another
 */
export const sendFriendRequest = async (fromUserId: string, toUserEmail: string): Promise<{ success: boolean; message: string }> => {
  try {
    // Check if users exist
    const usersQuery = query(usersCollection, where('email', '==', toUserEmail));
    const querySnapshot = await getDocs(usersQuery);
    
    if (querySnapshot.empty) {
      return { success: false, message: 'No user found with that email address.' };
    }
    
    const toUserDoc = querySnapshot.docs[0];
    const toUserId = toUserDoc.id;
    
    if (fromUserId === toUserId) {
      return { success: false, message: 'You cannot send a friend request to yourself.' };
    }
    
    // Check if users are already friends
    const fromUserRef = doc(usersCollection, fromUserId);
    const fromUserDoc = await getDoc(fromUserRef);
    
    if (fromUserDoc.exists()) {
      const fromUserData = fromUserDoc.data();
      if (fromUserData.friends?.includes(toUserId)) {
        return { success: false, message: 'You are already friends with this user.' };
      }
    }
    
    // Check for existing pending requests
    const existingRequestQuery = query(
      friendRequestsCollection,
      where('fromUserId', '==', fromUserId),
      where('toUserId', '==', toUserId),
      where('status', '==', 'pending')
    );
    
    const existingRequestSnapshot = await getDocs(existingRequestQuery);
    
    if (!existingRequestSnapshot.empty) {
      return { success: false, message: 'Friend request already sent.' };
    }
    
    // Check for reverse pending request
    const reverseRequestQuery = query(
      friendRequestsCollection,
      where('fromUserId', '==', toUserId),
      where('toUserId', '==', fromUserId),
      where('status', '==', 'pending'
    ));
    
    const reverseRequestSnapshot = await getDocs(reverseRequestQuery);
    
    if (!reverseRequestSnapshot.empty) {
      // If there's a reverse request, automatically accept it
      const reverseRequest = reverseRequestSnapshot.docs[0];
      await respondToFriendRequest(reverseRequest.id, 'accepted');
      return { success: true, message: 'Friend request accepted!' };
    }
    
    // Create new friend request
    const requestRef = doc(friendRequestsCollection);
    const newRequest = {
      fromUserId,
      toUserId,
      status: 'pending' as const,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    
    await setDoc(requestRef, newRequest);
    
    return { 
      success: true, 
      message: 'Friend request sent successfully!',
    };
  } catch (error) {
    console.error('Error sending friend request:', error);
    return { 
      success: false, 
      message: 'Failed to send friend request. Please try again.' 
    };
  }
};

/**
 * Respond to a friend request (accept or reject)
 */
export const respondToFriendRequest = async (
  requestId: string, 
  response: 'accepted' | 'rejected'
): Promise<{ success: boolean; message: string }> => {
  try {
    const requestRef = doc(friendRequestsCollection, requestId);
    const requestDoc = await getDoc(requestRef);
    
    if (!requestDoc.exists()) {
      return { success: false, message: 'Friend request not found.' };
    }
    
    const requestData = requestDoc.data() as Omit<FriendRequest, 'id'>;
    
    if (requestData.status !== 'pending') {
      return { success: false, message: 'This request has already been processed.' };
    }
    
    // Update the request status
    await updateDoc(requestRef, {
      status: response,
      updatedAt: serverTimestamp(),
    });
    
    if (response === 'accepted') {
      // Add each user to the other's friends list
      const batch = writeBatch(db);
      
      // Add toUser to fromUser's friends list
      const fromUserRef = doc(usersCollection, requestData.fromUserId);
      batch.update(fromUserRef, {
        friends: arrayUnion(requestData.toUserId),
        [`friendProfiles.${requestData.toUserId}`]: {
          name: requestData.fromUser?.name || 'Unknown',
          email: requestData.fromUser?.email || '',
          photoURL: requestData.fromUser?.photoURL || '',
        },
      });
      
      // Add fromUser to toUser's friends list
      const toUserRef = doc(usersCollection, requestData.toUserId);
      const toUserDoc = await getDoc(toUserRef);
      const toUserData = toUserDoc.data();
      
      batch.update(toUserRef, {
        friends: arrayUnion(requestData.fromUserId),
        [`friendProfiles.${requestData.fromUserId}`]: {
          name: toUserData?.name || 'Unknown',
          email: toUserData?.email || '',
          photoURL: toUserData?.photoURL || '',
        },
      });
      
      await batch.commit();
    }
    
    return { 
      success: true, 
      message: `Friend request ${response} successfully.` 
    };
  } catch (error) {
    console.error('Error responding to friend request:', error);
    return { 
      success: false, 
      message: 'Failed to process friend request. Please try again.' 
    };
  }
};

/**
 * Get all friend requests for a user
 */
export const getUserFriendRequests = async (userId: string): Promise<FriendRequest[]> => {
  try {
    // Get incoming requests
    const incomingQuery = query(
      friendRequestsCollection,
      where('toUserId', '==', userId),
      where('status', '==', 'pending')
    );
    
    const incomingSnapshot = await getDocs(incomingQuery);
    
    // Get user data for each request
    const requests = await Promise.all(
      incomingSnapshot.docs.map(async (requestDoc) => {
        const requestData = requestDoc.data() as { 
          fromUserId: string;
          toUserId: string;
          status: FriendRequestStatus;
          createdAt: Timestamp;
          updatedAt: Timestamp;
        };
        
        // Get the user document
        const fromUserDoc = await getDoc(doc(db, 'users', requestData.fromUserId));
        const fromUserData = fromUserDoc.data() as UserData | undefined;
        
        return {
          id: requestDoc.id,
          fromUserId: requestData.fromUserId,
          toUserId: requestData.toUserId,
          status: requestData.status,
          fromUser: fromUserDoc.exists() && fromUserData ? {
            id: fromUserDoc.id,
            name: fromUserData.name || 'Unknown',
            email: fromUserData.email || '',
            photoURL: fromUserData.photoURL,
          } : undefined,
          createdAt: requestData.createdAt?.toDate() || new Date(),
          updatedAt: requestData.updatedAt?.toDate() || new Date(),
        };
      })
    );
    
    return requests as FriendRequest[];
  } catch (error) {
    console.error('Error getting friend requests:', error);
    return [];
  }
};

/**
 * Get a user's friends list
 */
export const getFriendsList = async (userId: string): Promise<Array<{
  id: string;
  name: string;
  email: string;
  photoURL?: string;
  isOnline: boolean;
}>> => {
  try {
    const userDoc = await getDoc(doc(usersCollection, userId));
    
    if (!userDoc.exists()) {
      return [];
    }
    
    const userData = userDoc.data() as UserData;
    const friendIds = userData.friends || [];
    
    if (friendIds.length === 0) {
      return [];
    }
    
    // Get friend profiles from the friendProfiles map
    const friendProfiles = userData.friendProfiles || {};
    
    return Object.entries(friendProfiles)
      .filter(([id]) => friendIds.includes(id))
      .map(([id, profile]) => {
        // Ensure we have a valid profile object
        const safeProfile = typeof profile === 'object' && profile !== null 
          ? profile 
          : { name: 'Unknown', email: '', photoURL: undefined };
          
        return {
          id,
          name: safeProfile.name || 'Unknown',
          email: safeProfile.email || '',
          photoURL: safeProfile.photoURL,
          isOnline: false, // This would come from presence system in a real app
        };
      });
  } catch (error) {
    console.error('Error getting friends list:', error);
    return [];
  }
};

/**
 * Remove a friend
 */
export const removeFriend = async (
  userId: string, 
  friendId: string
): Promise<{ success: boolean; message: string }> => {
  try {
    const batch = writeBatch(db);
    
    // Remove friend from user's friends list
    const userRef = doc(usersCollection, userId);
    batch.update(userRef, {
      friends: arrayRemove(friendId),
      [`friendProfiles.${friendId}`]: null,
    });
    
    // Remove user from friend's friends list
    const friendRef = doc(usersCollection, friendId);
    batch.update(friendRef, {
      friends: arrayRemove(userId),
      [`friendProfiles.${userId}`]: null,
    });
    
    await batch.commit();
    
    return { 
      success: true, 
      message: 'Friend removed successfully.' 
    };
  } catch (error) {
    console.error('Error removing friend:', error);
    return { 
      success: false, 
      message: 'Failed to remove friend. Please try again.' 
    };
  }
};
