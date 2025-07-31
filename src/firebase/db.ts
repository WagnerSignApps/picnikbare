import { 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  getDoc, 
  query, 
  where, 
  addDoc, 
  updateDoc,
  arrayUnion,
  serverTimestamp
} from 'firebase/firestore';
import { db } from './config';

// Extend the global Window interface to include ENV variables
declare global {
  interface Window {
    ENV: {
      VITE_OPENWEATHER_API_KEY?: string;
      VITE_GOOGLE_MAPS_API_KEY?: string;
    };
  }
}

// Types
export interface User {
  id: string;
  name: string;
  username?: string;
  bio?: string;
  email: string;
  photoURL?: string;
  friends: string[];
  friendProfiles?: {
    [friendId: string]: {
      name: string;
      email: string;
      photoURL?: string;
    };
  };
  stats?: {
    picniks: number;
    friends: number;
    reviews: number;
  };
  createdAt: Date;
}

export interface Picnic {
  id: string;
  name: string;
  description: string;
  location: {
    name: string;
    address: string;
    coordinates: {
      latitude: number;
      longitude: number;
    };
  };
  date: string; // ISO string
  createdBy: string; // User ID
  participants: string[]; // Array of user IDs
  status: 'planning' | 'active' | 'completed' | 'cancelled';
  createdAt: Date;
}

export interface Vote {
  id: string;
  userId: string;
  picnicId: string;
  restaurantId: string;
  createdAt: Date;
}

export interface Restaurant {
  id: string;
  name: string;
  address: string;
  imageUrl?: string;
  rating?: number;
  priceLevel?: number;
  categories?: string[];
  coordinates: {
    latitude: number;
    longitude: number;
  };
  createdAt: Date;
}

// Collection references
const usersCollection = collection(db, 'users');
const picnicsCollection = collection(db, 'picnics');
const votesCollection = collection(db, 'votes');
const restaurantsCollection = collection(db, 'restaurants');
const friendRequestsCollection = collection(db, 'friendRequests');

// Friend request status type
export type FriendRequestStatus = 'pending' | 'accepted' | 'rejected';

export interface FriendRequest {
  id: string;
  fromUserId: string;
  toUserId: string;
  status: FriendRequestStatus;
  createdAt: Date;
  updatedAt: Date;
  fromUser?: User; // Add this line to include the user data
}

// Friend management functions
export const sendFriendRequest = async (fromUserId: string, toUserEmail: string) => {
  try {
    // Input validation
    if (!fromUserId || !toUserEmail) {
      throw new Error('Please provide both user ID and email');
    }

    // Get the sender's user data
    const fromUserDoc = await getDoc(doc(usersCollection, fromUserId));
    if (!fromUserDoc.exists()) {
      throw new Error('Your user account was not found');
    }
    const fromUser = { id: fromUserDoc.id, ...fromUserDoc.data() } as User;

    // Normalize email and find recipient
    const normalizedEmail = toUserEmail.trim().toLowerCase();
    const usersSnapshot = await getDocs(
      query(usersCollection, where('email', '==', normalizedEmail))
    );

    if (usersSnapshot.empty) {
      throw new Error('No user found with that email');
    }

    const toUserDoc = usersSnapshot.docs[0];
    const toUserId = toUserDoc.id;
    // Store toUser data but don't use it yet (for future reference)

    // Prevent self-friending
    if (fromUserId === toUserId) {
      throw new Error('You cannot send a friend request to yourself');
    }

    // Check for existing pending requests in either direction
    const sentRequests = await getDocs(
      query(
        friendRequestsCollection,
        where('fromUserId', '==', fromUserId),
        where('toUserId', '==', toUserId),
        where('status', '==', 'pending')
      )
    );
    
    const receivedRequests = await getDocs(
      query(
        friendRequestsCollection,
        where('fromUserId', '==', toUserId),
        where('toUserId', '==', fromUserId),
        where('status', '==', 'pending')
      )
    );
    
    if (!sentRequests.empty) {
      throw new Error('Friend request already sent to this user');
    }
    
    if (!receivedRequests.empty) {
      throw new Error('This user has already sent you a friend request');
    }

    // Create the friend request with all required fields
    const requestData = {
      fromUserId,
      toUserId,
      status: 'pending' as const,
      fromUser: {
        id: fromUser.id,
        name: fromUser.name || '',
        email: fromUser.email,
        photoURL: fromUser.photoURL || '',
        // Include any other user fields you want to display in the friend request
      },
      toUser: {
        id: toUserDoc.id,
        name: toUserDoc.data().name || '',
        email: toUserDoc.data().email,
        photoURL: toUserDoc.data().photoURL || ''
      },
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      // Add these fields for better querying
      fromUserEmail: fromUser.email.toLowerCase(),
      toUserEmail: toUserDoc.data().email.toLowerCase()
    };
    
    console.log('Creating friend request with data:', requestData);

    const requestRef = await addDoc(friendRequestsCollection, requestData);
    
    // Update the sender's sentRequests array
    await updateDoc(doc(usersCollection, fromUserId), {
      sentRequests: arrayUnion(requestRef.id)
    });
    
    // Update the recipient's receivedRequests array
    await updateDoc(doc(usersCollection, toUserId), {
      receivedRequests: arrayUnion(requestRef.id)
    });
    
    console.log('Friend request created successfully:', {
      requestId: requestRef.id,
      fromUserId,
      toUserId
    });
    
    return { 
      success: true, 
      requestId: requestRef.id,
      message: 'Friend request sent successfully' 
    };
  } catch (error: any) {
    console.error('Error in sendFriendRequest:', error);
    
    // Handle specific error cases
    let errorMessage = error.message || 'Failed to send friend request. Please try again.';
    
    if (error.code === 'permission-denied') {
      errorMessage = 'You do not have permission to send friend requests.';
    } else if (error.code === 'not-found') {
      errorMessage = 'User not found.';
    }
    
    throw new Error(errorMessage);
  }
};

export const respondToFriendRequest = async (
  requestId: string,
  status: 'accepted' | 'rejected'
) => {
  try {
    const requestRef = doc(friendRequestsCollection, requestId);
    const requestSnap = await getDoc(requestRef);

    if (!requestSnap.exists()) {
      throw new Error('Friend request not found');
    }

    const request = requestSnap.data() as FriendRequest;

    // Update request status
    await updateDoc(requestRef, {
      status,
      updatedAt: new Date(),
    });

    // If accepted, update both users' friend lists
    if (status === 'accepted') {
      const fromUserRef = doc(usersCollection, request.fromUserId);
      const toUserRef = doc(usersCollection, request.toUserId);
      
      // Get both users' data to ensure we have their profiles
      const [fromUserSnap, toUserSnap] = await Promise.all([
        getDoc(fromUserRef),
        getDoc(toUserRef)
      ]);
      
      if (!fromUserSnap.exists() || !toUserSnap.exists()) {
        throw new Error('One or both users not found');
      }
      
      const fromUserData = fromUserSnap.data() as User;
      const toUserData = toUserSnap.data() as User;

      // Add toUser to fromUser's friends list with profile data
      await updateDoc(fromUserRef, {
        friends: arrayUnion(request.toUserId),
        [`friendProfiles.${request.toUserId}`]: {
          name: toUserData.name || 'Unknown User',
          email: toUserData.email,
          photoURL: toUserData.photoURL || ''
        }
      });

      // Add fromUser to toUser's friends list with profile data
      await updateDoc(toUserRef, {
        friends: arrayUnion(request.fromUserId),
        [`friendProfiles.${request.fromUserId}`]: {
          name: fromUserData.name || 'Unknown User',
          email: fromUserData.email,
          photoURL: fromUserData.photoURL || ''
        }
      });
    }

    return { success: true };
  } catch (error) {
    console.error('Error responding to friend request:', error);
    throw error;
  }
};

export const getUserFriendRequests = async (userId: string) => {
  try {
    console.log('Fetching friend requests for user:', userId);
    
    // Get requests where user is the recipient (pending requests)
    const receivedQuery = query(
      friendRequestsCollection,
      where('toUserId', '==', userId),
      where('status', '==', 'pending')
    );
    
    // Get requests where user is the sender (to show sent requests)
    const sentQuery = query(
      friendRequestsCollection,
      where('fromUserId', '==', userId)
    );
    
    console.log('Executing queries for user:', userId);
    
    // Execute both queries in parallel
    const [receivedSnapshot, sentSnapshot] = await Promise.all([
      getDocs(receivedQuery),
      getDocs(sentQuery)
    ]);
    
    console.log(`Found ${receivedSnapshot.size} received and ${sentSnapshot.size} sent friend requests`);
    
    // Combine the results
    const allRequests = [...receivedSnapshot.docs, ...sentSnapshot.docs];
    
    if (allRequests.length === 0) {
      console.warn('No friend requests found for user:', userId);
      // Debug: Check all requests in collection
      const allRequestsSnapshot = await getDocs(friendRequestsCollection);
      console.log('Total friend requests in collection:', allRequestsSnapshot.size);
      allRequestsSnapshot.forEach((doc) => {
        console.log('All friend request in collection:', doc.id, doc.data());
      });
      return [];
    }

    const requests: FriendRequest[] = [];
    const userPromises: Promise<void>[] = [];

    // Process all requests (both received and sent)
    for (const docSnap of allRequests) {
      try {
        const requestData = docSnap.data();
        console.log('Processing request:', docSnap.id, requestData);
        
        // Convert Firestore timestamps to Date objects if they exist
        const createdAt = requestData.createdAt?.toDate 
          ? requestData.createdAt.toDate() 
          : new Date();
          
        const updatedAt = requestData.updatedAt?.toDate 
          ? requestData.updatedAt.toDate() 
          : new Date();

        const request: FriendRequest = {
          id: docSnap.id,
          fromUserId: requestData.fromUserId,
          toUserId: requestData.toUserId,
          status: requestData.status,
          createdAt,
          updatedAt,
          fromUser: requestData.fromUser || null // Include fromUser if it exists
        };
        
        // If we don't have fromUser in the request, fetch it
        if (!request.fromUser) {
          const userPromise = getDoc(doc(usersCollection, request.fromUserId))
            .then((userDoc) => {
              if (userDoc.exists()) {
                request.fromUser = { id: userDoc.id, ...userDoc.data() } as User;
                // Update the request in Firestore with the user data for future use
                updateDoc(doc(friendRequestsCollection, request.id), {
                  fromUser: {
                    id: userDoc.id,
                    name: userDoc.data().name || '',
                    email: userDoc.data().email,
                    photoURL: userDoc.data().photoURL || ''
                  }
                }).catch(console.error);
              }
            });
          userPromises.push(userPromise);
        }
        
        requests.push(request);
      } catch (error) {
        console.error('Error processing friend request:', docSnap.id, error);
      }
    }

    await Promise.all(userPromises);
    console.log('Returning', requests.length, 'processed friend requests');
    return requests;
  } catch (error) {
    console.error('Error getting friend requests:', error);
    throw error;
  }
};

export const getFriendsList = async (userId: string) => {
  try {
    // First, check if the user document exists
    const userRef = doc(usersCollection, userId);
    const userDoc = await getDoc(userRef);
    
    // If user doesn't exist, create a basic user document
    if (!userDoc.exists()) {
      console.log('User document not found, creating one...');
      const newUser: Omit<User, 'id'> = {
        name: '',
        email: '',
        friends: [],
        createdAt: new Date(),
      };
      await setDoc(userRef, newUser, { merge: true });
      return [];
    }

    const userData = userDoc.data() as User;
    const friendIds = userData.friends || [];

    if (friendIds.length === 0) {
      return [];
    }

    // Check if we have friend profiles in the user document
    if (userData.friendProfiles && Object.keys(userData.friendProfiles).length > 0) {
      return friendIds.map(friendId => {
        const profile = userData.friendProfiles?.[friendId];
        return {
          id: friendId,
          name: profile?.name || 'Unknown User',
          email: profile?.email || '',
          photoURL: profile?.photoURL
        } as User;
      }).filter(Boolean);
    }

    // Fallback: Fetch all friends' data individually
    const friendPromises = friendIds.map(async (friendId) => {
      try {
        const friendDoc = await getDoc(doc(usersCollection, friendId));
        if (friendDoc.exists()) {
          const friendData = friendDoc.data() as User;
          return { 
            id: friendDoc.id, 
            name: friendData.name || 'Unknown User',
            email: friendData.email,
            photoURL: friendData.photoURL
          } as User;
        }
        return null;
      } catch (error) {
        console.error(`Error fetching friend ${friendId}:`, error);
        return null;
      }
    });

    const friends = await Promise.all(friendPromises);
    return friends.filter((friend) => friend !== null) as User[];
  } catch (error) {
    console.error('Error in getFriendsList:', error);
    // Instead of throwing, return an empty array to prevent UI crashes
    return [];
  }
};

// User operations
export const createUser = async (userId: string, userData: Omit<User, 'id' | 'createdAt'>) => {
  try {
    // Ensure required fields are present
    if (!userData.email) {
      throw new Error('Email is required');
    }

    // Create a sanitized user object with only the fields we want to store
    const userToSave: Omit<User, 'id'> = {
      name: userData.name || '',
      email: userData.email,
      photoURL: userData.photoURL || '',
      friends: [],
      createdAt: new Date(),
    };

    // Create a reference to the user document using the same ID as the auth user
    const userRef = doc(usersCollection, userId);
    
    // Set the document with merge: true to avoid overwriting existing data
    await setDoc(userRef, userToSave, { merge: true });
    
    // Return the created user data with the document ID
    return { id: userRef.id, ...userToSave } as User;
  } catch (error) {
    console.error('Error creating user document:', error);
    throw new Error('Failed to create user document');
  }
};

export const getUser = async (userId: string) => {
  const userDoc = await getDoc(doc(usersCollection, userId));
  return userDoc.exists() ? (userDoc.data() as User) : null;
};

// Picnic operations
export const createPicnic = async (picnicData: Omit<Picnic, 'id' | 'createdAt'>) => {
  const picnicRef = doc(picnicsCollection);
  const picnic: Picnic = {
    id: picnicRef.id,
    ...picnicData,
    status: 'planning',
    createdAt: new Date(),
  };
  await setDoc(picnicRef, picnic);
  return picnic;
};

export const getPicnic = async (picnicId: string) => {
  const picnicDoc = await getDoc(doc(picnicsCollection, picnicId));
  return picnicDoc.exists() ? (picnicDoc.data() as Picnic) : null;
};

// Vote operations
export const addVote = async (voteData: Omit<Vote, 'id' | 'createdAt'>) => {
  const voteRef = doc(votesCollection);
  const vote: Vote = {
    id: voteRef.id,
    ...voteData,
    createdAt: new Date(),
  };
  await setDoc(voteRef, vote);
  return vote;
};

// Restaurant operations
export const addRestaurant = async (restaurantData: Omit<Restaurant, 'id' | 'createdAt'>) => {
  const restaurantRef = doc(restaurantsCollection);
  const restaurant: Restaurant = {
    id: restaurantRef.id,
    ...restaurantData,
    createdAt: new Date(),
  };
  await setDoc(restaurantRef, restaurant);
  return restaurant;
};

// Mock data generation
export const generateMockData = async () => {
  // Check if we already have data
  const usersSnapshot = await getDocs(usersCollection);
  if (!usersSnapshot.empty) {
    console.log('Database already contains data. Skipping mock data generation.');
    return;
  }

  console.log('Generating mock data...');

  // Create mock users
  const mockUsers: Omit<User, 'id'>[] = [
    {
      name: 'Alex Johnson',
      email: 'alex@example.com',
      photoURL: 'https://randomuser.me/api/portraits/men/1.jpg',
      friends: [],
      createdAt: new Date(),
    },
    {
      name: 'Jamie Smith',
      email: 'jamie@example.com',
      photoURL: 'https://randomuser.me/api/portraits/women/2.jpg',
      friends: [],
      createdAt: new Date(),
    },
    // Add more mock users as needed
  ];

  const createdUsers = await Promise.all(mockUsers.map(user => createUser(user.email, user)));

  // Update friends lists
  const updatePromises = createdUsers.map((user, index) => {
    const friends = createdUsers
      .filter((_, i) => i !== index)
      .map(u => u.id);
    return updateDoc(doc(usersCollection, user.id), { friends });
  });

  await Promise.all(updatePromises);
  console.log('Mock data generation complete!');
};
