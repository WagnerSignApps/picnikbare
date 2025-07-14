import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  doc as firestoreDoc,
  getDoc, 
  getDocs
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuthUser } from '../contexts/AuthUserContext';
import { 
  sendFriendRequest as sendFriendRequestApi,
  respondToFriendRequest,
  removeFriend as removeFriendApi
} from '../firebase/friends';
import { 
  MagnifyingGlassIcon, 
  UserPlusIcon as UserPlusOutline, 
  UserGroupIcon as UserGroupOutline, 
  UserCircleIcon, 
  CheckIcon, 
  XMarkIcon as XMarkIconSolid, 
  ChatBubbleLeftRightIcon 
} from '@heroicons/react/24/outline';
import { UserGroupIcon as UserGroupSolid, UserPlusIcon as UserPlusSolid } from '@heroicons/react/24/solid';

// Types
interface UserProfile {
  id: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  online?: boolean;
}

interface FriendRequest {
  id: string;
  fromUserId: string;
  toUserId: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt?: any;
  updatedAt?: any;
  fromUser?: {
    id: string;
    displayName: string;
    email: string;
    photoURL?: string;
  };
}

interface Friend extends Omit<UserProfile, 'id'> {
  id: string;
  isRequest?: boolean;
  requestId?: string;
  email: string;
  displayName: string;
  photoURL?: string;
  online?: boolean;
}

interface FriendItemProps {
  friend: Friend;
  currentUserId?: string;
  onAction?: (id: string, action: 'accept' | 'decline' | 'remove' | 'add') => void;
  isProcessing?: boolean;
}


const FriendItem = ({ friend, currentUserId, onAction, isProcessing }: FriendItemProps) => (
  <div className="flex items-center p-3 hover:bg-gray-50 rounded-xl transition-colors">
    <div className="relative mr-3">
      {friend.photoURL ? (
        <img
          src={friend.photoURL}
          alt={friend.displayName || 'Friend'}
          className="h-10 w-10 rounded-full object-cover border-2 border-white shadow-sm"
        />
      ) : (
        <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
          <UserCircleIcon className="h-8 w-8 text-gray-400" />
        </div>
      )}
      {friend.online && (
        <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
      )}
    </div>
    <div className="flex-1 min-w-0">
      <div className="flex flex-col">
        <h3 className="font-medium text-gray-900 truncate">{friend.displayName || 'Unknown'}</h3>
        <p className="text-xs text-gray-500 truncate">{friend.email}</p>
        <p className={`text-xs truncate ${
          friend.online ? 'text-green-500 font-medium' : 'text-gray-500'
        }`}>
          {friend.online ? 'Online' : 'Offline'}
        </p>
      </div>
    </div>
    {friend.isRequest && onAction && friend.requestId && (
      <div className="flex space-x-2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onAction(friend.requestId!, 'accept');
          }}
          className="p-1.5 rounded-full bg-green-100 text-green-600 hover:bg-green-200 transition-colors"
          aria-label="Accept friend request"
        >
          <CheckIcon className="h-5 w-5" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onAction(friend.requestId!, 'decline');
          }}
          className="p-1.5 rounded-full bg-red-100 text-red-600 hover:bg-red-200 transition-colors"
          aria-label="Decline friend request"
        >
          <XMarkIconSolid className="h-5 w-5" />
        </button>
      </div>
    )}
    {!friend.isRequest ? (
      <div className="flex space-x-2">
        <button 
          onClick={() => onAction?.(friend.id, 'add')}
          className="p-1.5 text-primary-500 hover:bg-primary-50 rounded-full transition-colors"
          aria-label="Message friend"
        >
          <ChatBubbleLeftRightIcon className="h-5 w-5" />
        </button>
        {currentUserId !== friend.id && (
          <button 
            onClick={() => onAction?.(friend.id, 'remove')}
            className="p-1.5 text-red-500 hover:bg-red-50 rounded-full transition-colors"
            aria-label="Remove friend"
            disabled={isProcessing}
          >
            {isProcessing ? (
              <div className="h-5 w-5 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <XMarkIconSolid className="h-5 w-5" />
            )}
          </button>
        )}
      </div>
    ) : null}
  </div>
);

export const FriendsTab = () => {
  const { user, loading } = useAuthUser();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'friends' | 'requests'>('friends');
  const [friends, setFriends] = useState<Friend[]>([]);
  const [rawRequests, setRawRequests] = useState<FriendRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState<Record<string, boolean>>({});
  const [email, setEmail] = useState('');
  const [showAddFriend, setShowAddFriend] = useState(false);

  // Filter friends and requests based on search query
  const filteredFriends = useMemo(() => 
    friends.filter(friend => 
      friend.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      friend.email?.toLowerCase().includes(searchQuery.toLowerCase())
    ),
    [friends, searchQuery]
  );

  const filteredRequests = useMemo(() => 
    rawRequests.filter(request => 
      request.fromUser?.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.fromUser?.email?.toLowerCase().includes(searchQuery.toLowerCase())
    ),
    [rawRequests, searchQuery]
  );

  const handleAction = useCallback(async (friendId: string, action: 'accept' | 'decline' | 'remove' | 'add') => {
    const actionKey = `${action}-${friendId}`;
    
    if (!currentUser?.uid || isProcessing[actionKey]) return;
    
    try {
      setIsProcessing(prev => ({ ...prev, [actionKey]: true }));
      
      if (action === 'accept' || action === 'decline') {
        const response = await respondToFriendRequest(friendId, action === 'accept' ? 'accepted' : 'rejected');
        
        if (response.success) {
          setRawRequests(prev => prev.filter(req => req.id !== friendId));
        }
      } else if (action === 'add') {
        // Not used - handled by handleAddFriend
      } else if (action === 'remove') {
        const response = await removeFriendApi(currentUser.uid, friendId);
        if (response.success) {
          setFriends(prev => prev.filter(friend => friend.id !== friendId));
        }
      }
    } catch (error) {
      console.error(`Error in handleAction (${action}):`, error);
    } finally {
      setIsProcessing(prev => ({
        ...prev,
        [actionKey]: false
      }));
    }
  }, [currentUser?.uid, isProcessing, setFriends, setRawRequests]);

  const handleAddFriend = async () => {
    if (!email || !currentUser?.uid) return;

    try {
      setIsProcessing(prev => ({ ...prev, 'sendingRequest': true }));
      const { success } = await sendFriendRequestApi(currentUser.uid, email);

      if (success) {
        setShowAddFriend(false);
        setEmail('');
      }
    } catch (error) {
      console.error('Error sending friend request:', error);
    } finally {
      setIsProcessing(prev => ({ ...prev, 'sendingRequest': false }));
    }
  };

  // Load friends and friend requests
  useEffect(() => {
    if (!currentUser?.uid) return;

    const loadData = async () => {
      try {
        setIsLoading(true);
        
        // Load friends
        const friendsQuery = query(
          collection(db, 'users'),
          where('friends', 'array-contains', currentUser.uid)
        );
        
        const friendsSnapshot = await getDocs(friendsQuery);
        const friendsData: Friend[] = [];
        
        for (const doc of friendsSnapshot.docs) {
          const data = doc.data();
          friendsData.push({
            id: doc.id,
            displayName: data.displayName || 'Unknown',
            email: data.email || '',
            photoURL: data.photoURL,
            online: false,
            isRequest: false
          });
        }

        setFriends(friendsData);

        // Load friend requests
        const requestsQuery = query(
          collection(db, 'friendRequests'),
          where('toUserId', '==', currentUser.uid),
          where('status', '==', 'pending')
        );

        const requestsSnapshot = await getDocs(requestsQuery);
        const requestsData: FriendRequest[] = [];
        
        for (const doc of requestsSnapshot.docs) {
          const requestData = doc.data();
          
          // Type guard to ensure required fields exist
          if (
            typeof requestData.fromUserId === 'string' &&
            typeof requestData.toUserId === 'string' &&
            ['pending', 'accepted', 'rejected'].includes(requestData.status)
          ) {
            const userDoc = await getDoc(firestoreDoc(db, 'users', requestData.fromUserId));
            if (userDoc.exists()) {
              const userData = userDoc.data();
              
              // Ensure we have the required user data
              if (userData) {
                const friendRequest: FriendRequest = {
                  id: doc.id,
                  fromUserId: requestData.fromUserId,
                  toUserId: requestData.toUserId,
                  status: requestData.status as 'pending' | 'accepted' | 'rejected',
                  fromUser: {
                    id: userDoc.id,
                    displayName: typeof userData.displayName === 'string' ? userData.displayName : 'Unknown',
                    email: typeof userData.email === 'string' ? userData.email : '',
                    photoURL: typeof userData.photoURL === 'string' ? userData.photoURL : undefined
                  },
                  createdAt: requestData.createdAt,
                  updatedAt: requestData.updatedAt
                };
                requestsData.push(friendRequest);
              }
            }
          }
        }

        setRawRequests(requestsData);
      } catch (error) {
        console.error('Error loading friends:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
    
    // Set up real-time listeners
    const unsubscribeFriends = setupFriendsListener(currentUser.uid);
    const unsubscribeRequests = setupRequestsListener(currentUser.uid);

    return () => {
      if (unsubscribeFriends) unsubscribeFriends();
      if (unsubscribeRequests) unsubscribeRequests();
    };
  }, [currentUser?.uid]);

  // Set up real-time listener for friends
  const setupFriendsListener = (userId: string) => {
    try {
      const q = query(
        collection(db, 'users'),
        where('friends', 'array-contains', userId)
      );

      return onSnapshot(q, (snapshot) => {
        const updatedFriends: Friend[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          if (data) {
            updatedFriends.push({
              id: doc.id,
              displayName: typeof data.displayName === 'string' ? data.displayName : 'Unknown',
              email: typeof data.email === 'string' ? data.email : '',
              photoURL: typeof data.photoURL === 'string' ? data.photoURL : undefined,
              online: false,
              isRequest: false
            });
          }
        });
        setFriends(updatedFriends);
      });
    } catch (error) {
      console.error('Error setting up friends listener:', error);
      return () => {};
    }
  };
  
  // Set up real-time listener for friend requests
  const setupRequestsListener = (userId: string) => {
    try {
      const q = query(
        collection(db, 'friendRequests'),
        where('toUserId', '==', userId),
        where('status', '==', 'pending')
      );

      return onSnapshot(q, async (snapshot) => {
        const requests: FriendRequest[] = [];
        
        for (const doc of snapshot.docs) {
          const requestData = doc.data();
          
          if (
            typeof requestData.fromUserId === 'string' &&
            typeof requestData.toUserId === 'string' &&
            ['pending', 'accepted', 'rejected'].includes(requestData.status)
          ) {
            const userDoc = await getDoc(firestoreDoc(db, 'users', requestData.fromUserId));
            if (userDoc.exists()) {
              const userData = userDoc.data();
              
              if (userData) {
                requests.push({
                  id: doc.id,
                  fromUserId: requestData.fromUserId,
                  toUserId: requestData.toUserId,
                  status: requestData.status as 'pending' | 'accepted' | 'rejected',
                  fromUser: {
                    id: userDoc.id,
                    displayName: typeof userData.displayName === 'string' ? userData.displayName : 'Unknown',
                    email: typeof userData.email === 'string' ? userData.email : '',
                    photoURL: typeof userData.photoURL === 'string' ? userData.photoURL : undefined
                  },
                  createdAt: requestData.createdAt,
                  updatedAt: requestData.updatedAt
                });
              }
            }
          }
        }
        
        setRawRequests(requests);
      });
    } catch (error) {
      console.error('Error setting up requests listener:', error);
      return () => {};
    }
  };

  const handleFriendAction = async (id: string, action: 'accept' | 'decline' | 'add' | 'remove') => {
    await handleAction(id, action);
  };

  return (
    <div className="flex-1 overflow-y-auto pb-24">
      <div className="p-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Friends</h2>
          <button
            onClick={() => setShowAddFriend(true)}
            className="flex items-center space-x-1 bg-blue-500 text-white px-3 py-1.5 rounded-md text-sm"
          >
            <UserPlusOutline className="h-4 w-4" />
            <span>Add Friend</span>
          </button>
        </div>
        
        {showAddFriend && (
          <div className="bg-white rounded-lg shadow-md p-4 mb-4">
            <div className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email address
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="friend@example.com"
                />
              </div>
              <div className="flex justify-end space-x-3 pt-2">
                <button
                  onClick={() => setShowAddFriend(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddFriend}
                  disabled={!email || isProcessing['sendingRequest']}
                  className="px-4 py-2 text-sm font-medium text-white bg-primary-500 hover:bg-primary-600 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isProcessing['sendingRequest'] ? 'Sending...' : 'Send Request'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      <div className="px-4 pt-2 pb-3">
        <h2 className="text-2xl font-bold text-gray-900">Friends</h2>
        <p className="text-sm text-gray-500">Connect with your friends</p>
      </div>

      {/* Search and Tabs */}
      <div className="px-4 mb-4">
        <div className="relative mb-4">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            placeholder="Search friends..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="border-b border-gray-200">
          <div className="flex space-x-4">
            <button
              onClick={() => setActiveTab('friends')}
              className={`py-3 px-1 font-medium text-sm border-b-2 ${
                activeTab === 'friends' 
                  ? 'border-primary-500 text-gray-900' 
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } transition-colors`}
            >
              <div className="flex items-center">
                {activeTab === 'friends' ? (
                  <UserGroupSolid className="h-5 w-5 mr-1.5" />
                ) : (
                  <UserGroupOutline className="h-5 w-5 mr-1.5" />
                )}
                Friends
              </div>
            </button>
            
            <button
              onClick={() => setActiveTab('requests')}
              className={`py-3 px-1 font-medium text-sm border-b-2 ${
                activeTab === 'requests' 
                  ? 'border-primary-500 text-gray-900' 
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } transition-colors`}
            >
              <div className="flex items-center">
                {activeTab === 'requests' ? (
                  <UserPlusSolid className="h-5 w-5 mr-1.5" />
                ) : (
                  <UserPlusOutline className="h-5 w-5 mr-1.5" />
                )}
                Requests
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto pb-24">
        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
          </div>
        ) : (
          <>
            {activeTab === 'friends' && (
              <div className="divide-y divide-gray-100">
                {filteredFriends.length > 0 ? (
                  filteredFriends.map(friend => (
                    <FriendItem 
                      key={friend.id} 
                      friend={friend} 
                      currentUserId={currentUser?.uid}
                      onAction={handleAction}
                      isProcessing={isProcessing[`remove-${friend.id}`]}
                    />
                  ))
                ) : (
                  <div className="text-center py-12">
                    <UserGroupOutline className="mx-auto h-12 w-12 text-gray-300" />
                    <p className="mt-2 text-sm text-gray-500">No friends found</p>
                    <button 
                      onClick={() => setShowAddFriend(true)}
                      className="px-4 py-1.5 mt-4 text-sm font-medium text-white bg-primary-400 hover:bg-primary-500 rounded-full transition-colors"
                    >
                      Add Friends
                    </button>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'requests' && (
              <div className="divide-y divide-gray-100">
                {filteredRequests.length > 0 ? (
                  filteredRequests.map(request => (
                    <FriendItem 
                      key={request.id} 
                      friend={{
                        id: request.fromUserId,
                        email: request.fromUser?.email || '',
                        displayName: request.fromUser?.displayName || 'Unknown',
                        photoURL: request.fromUser?.photoURL,
                        isRequest: true,
                        requestId: request.id,
                        online: false
                      }}
                      currentUserId={currentUser?.uid}
                      onAction={handleFriendAction}
                      isProcessing={isProcessing[`${request.status === 'pending' ? 'accept' : 'remove'}-${request.id}`]}
                    />
                  ))
                ) : (
                  <div className="text-center py-12">
                    <UserPlusOutline className="mx-auto h-12 w-12 text-gray-300" />
                    <p className="mt-2 text-sm text-gray-500">No friend requests</p>
                    <button 
                      onClick={() => setShowAddFriend(true)}
                      className="px-4 py-1.5 mt-4 text-sm font-medium text-white bg-primary-400 hover:bg-primary-500 rounded-full transition-colors"
                    >
                      Add Friend
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};