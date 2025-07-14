import { useState, useEffect, useRef } from 'react';
import { PencilIcon, Cog6ToothIcon, ClockIcon, UserGroupIcon, XMarkIcon, MapPinIcon, UserCircleIcon, QuestionMarkCircleIcon, ArrowRightOnRectangleIcon, BellAlertIcon, SunIcon, MoonIcon } from '@heroicons/react/24/outline';
import { BookmarkIcon as BookmarkIconSolid, StarIcon } from '@heroicons/react/24/solid';
import { collection, query, where, getDocs, doc, deleteDoc, orderBy } from 'firebase/firestore';
import { useFirebase } from '../contexts/FirebaseContext';
import { useTheme } from '../contexts/ThemeContext';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';
// Remove duplicate import
import { Dialog, DialogContent, DialogTitle, IconButton } from '@mui/material';
import { NotificationPreferences } from '../components/notifications/NotificationPreferences';

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile;
  onSave: (updatedUser: Partial<UserProfile>) => void;
}

const EditProfileModal: React.FC<EditProfileModalProps> = ({ isOpen, onClose, user, onSave }) => {
  const [formData, setFormData] = useState({
    displayName: user.displayName,
    username: user.username,
    bio: user.bio,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-md p-6 relative">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          <XMarkIcon className="h-6 w-6" />
        </button>
        
        <h2 className="text-xl font-bold mb-6 text-gray-900 dark:text-white">Edit Profile</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Display Name
            </label>
            <input
              type="text"
              name="displayName"
              value={formData.displayName}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Username
            </label>
            <div className="mt-1 flex rounded-md shadow-sm">
              <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-300 text-sm">
                @
              </span>
              <input
                type="text"
                name="username"
                value={formData.username.replace('@', '')}
                onChange={(e) => {
                  const value = e.target.value.replace(/\s/g, '');
                  handleChange({
                    ...e,
                    target: { ...e.target, value }
                  } as React.ChangeEvent<HTMLInputElement>);
                }}
                className="flex-1 min-w-0 block w-full px-3 py-2 rounded-none rounded-r-md border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Bio
            </label>
            <textarea
              name="bio"
              rows={3}
              value={formData.bio}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              maxLength={160}
            />
          </div>
          
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};


interface UserProfile {
  displayName: string;
  username: string;
  bio: string;
  photoURL: string;
  stats: {
    picniks: number;
    friends: number;
    reviews: number;
  };
}

interface PicnicData {
  id: string;
  restaurantRef: string;
  participants: string[];
  createdAt: { toDate: () => Date };
}

interface RestaurantData {
  name: string;
  photos?: string[];
}

interface Picnic {
  id: string;
  restaurant: string;
  date: Date;
  image: string;
  participants: string[];
}

export function ProfileTab() {
  const navigate = useNavigate();
  const { darkMode, toggleDarkMode, temperatureUnit, toggleTemperatureUnit } = useTheme();
  const { auth, getDocument, getDocuments, updateDocument, uploadFile, db } = useFirebase();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showNotificationPrefs, setShowNotificationPrefs] = useState(false);
  const [isUserLoading, setIsUserLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  
  // State declarations - all hooks must be called in the same order on every render
  const [activeTab, setActiveTab] = useState<'picniks' | 'saved' | 'reviews'>('picniks');
  const [user, setUser] = useState<UserProfile | null>(null);
  const [picnics, setPicnics] = useState<Picnic[]>([]);
  const [savedRestaurants, setSavedRestaurants] = useState<any[]>([]);
  const [isPicnicsLoading, setIsPicnicsLoading] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isLoadingSaved, setIsLoadingSaved] = useState(false);
  
  const ThemeToggle = () => {
    const { darkMode, toggleDarkMode } = useTheme();
    return (
      <button
        onClick={toggleDarkMode}
        className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
        aria-label="Toggle dark mode"
      >
        {darkMode ? (
          <SunIcon className="h-6 w-6" />
        ) : (
          <MoonIcon className="h-6 w-6" />
        )}
      </button>
    );
  };
  const [error, setError] = useState<string | null>(null);

  // Load saved restaurants
  useEffect(() => {
    if (!auth?.currentUser) return;
    
    const loadSavedRestaurants = async () => {
      setIsLoadingSaved(true);
      try {
        // Use the user's savedRestaurants subcollection
        const savedRestaurantsRef = collection(db, 'users', auth.currentUser!.uid, 'savedRestaurants');
        const savedQuery = query(
          savedRestaurantsRef,
          orderBy('createdAt', 'desc')
        );
        
        const querySnapshot = await getDocs(savedQuery);
        const saved = querySnapshot.docs.map(doc => {
          const data = doc.data();
          
          return {
            id: doc.id,
            place_id: data.placeId,
            name: data.name,
            vicinity: data.address || '',
            rating: data.rating || 0,
            user_ratings_total: data.userRatingsTotal || 0,
            photos: data.photoUrl ? 
              [{ getUrl: () => data.photoUrl }] : [],
            geometry: {
              location: {
                lat: () => data.location?.lat || 0,
                lng: () => data.location?.lng || 0
              }
            },
            opening_hours: {
              isOpen: () => data.isOpen || false,
              open_now: data.isOpen || false
            },
            price_level: data.priceLevel || 0,
            types: data.types || [],
            savedAt: data.createdAt?.toDate()
          };
        });
        
        setSavedRestaurants(saved);
      } catch (error) {
        console.error('Error loading saved restaurants:', error);
        setError('Failed to load saved restaurants. Please try again.');
      } finally {
        setIsLoadingSaved(false);
      }
    };
    
    loadSavedRestaurants();
  }, [auth, db]);

  // Fetch user data
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        if (!auth.currentUser) {
          setIsUserLoading(false);
          return;
        }

        const userDoc = await getDocument<UserProfile>('users', auth.currentUser.uid);
        if (userDoc) {
          setUser({
            displayName: userDoc.displayName || 'User',
            username: userDoc.username || `@user${Math.floor(Math.random() * 1000)}`,
            bio: userDoc.bio || 'Food lover and Picnik enthusiast! 🍔🍕🌮',
            photoURL: userDoc.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(userDoc.displayName || 'User')}`,
            stats: {
              picniks: userDoc.stats?.picniks || 0,
              friends: userDoc.stats?.friends || 0,
              reviews: userDoc.stats?.reviews || 0,
            },
          });
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
        setError('Failed to load user data');
      } finally {
        setIsUserLoading(false);
      }
    };

    fetchUserData();
  }, [auth.currentUser, getDocument]);

  // Fallback user data if not logged in or data not found
  const currentUser = user || {
    displayName: 'Guest User',
    username: '@guest',
    bio: 'Join us to start your Picnik journey!',
    photoURL: 'https://ui-avatars.com/api/?name=Guest',
    stats: {
      picniks: 0,
      friends: 0,
      reviews: 0,
    },
  };

  const handleUpdateProfile = async (updatedData: Partial<UserProfile>) => {
    if (!auth.currentUser?.uid) return;
    
    try {
      await updateDocument('users', auth.currentUser.uid, updatedData);
      setUser(prev => prev ? { ...prev, ...updatedData } : null);
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Failed to update profile. Please try again.');
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !auth.currentUser?.uid) return;

    setIsUploading(true);
    try {
      const downloadURL = await uploadFile(`profilePics/${auth.currentUser.uid}`, file);
      await updateDocument('users', auth.currentUser.uid, { photoURL: downloadURL });
      setUser(prev => prev ? { ...prev, photoURL: downloadURL } : null);
    } catch (error) {
      console.error('Error uploading photo:', error);
      alert('Failed to upload photo. Please try again.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSignOut = async () => {
    try {
      await auth.signOut();
      navigate('/login');
    } catch (error) {
      console.error('Error signing out:', error);
      alert('Failed to sign out. Please try again.');
    }
  };

  // Handle unsaving a restaurant
  const handleUnsaveRestaurant = async (restaurantId: string) => {
    if (!auth.currentUser) return;
    
    try {
      // Remove from Firestore
      await deleteDoc(doc(db, 'savedRestaurants', restaurantId));
      
      // Update local state
      setSavedRestaurants(prev => 
        prev.filter(restaurant => restaurant.id !== restaurantId)
      );
    } catch (error) {
      console.error('Error unsaving restaurant:', error);
      alert('Failed to remove restaurant from saved. Please try again.');
    }
  };

  // Fetch user's picnics
  useEffect(() => {
    const fetchUserPicnics = async () => {
      if (!auth.currentUser) {
        setIsPicnicsLoading(false);
        return;
      }

      try {
        setIsPicnicsLoading(true);
        const userPicnics: Picnic[] = [];
        
        // Only fetch picnics if we have a valid user
        if (auth.currentUser.uid) {
          // First, try to get picnics where user is a participant
          const picnicsQuery = query(
            collection(db, 'picnics'),
            where('participants', 'array-contains', auth.currentUser.uid),
            orderBy('createdAt', 'desc')
          );
          
          console.log('Fetching picnics with query:', {
            collection: 'picnics',
            where: ['participants', 'array-contains', auth.currentUser.uid],
            orderBy: ['createdAt', 'desc']
          });
          
          const querySnapshot = await getDocs(picnicsQuery).catch(error => {
            console.error('Error fetching picnics (participants):', error);
            throw error;
          });
          
          // Convert to array of PicnicData
          const picnicsData = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as PicnicData[];
          
          console.log('Fetched picnics:', picnicsData);
          
          // Process each picnic
          for (const picnic of picnicsData) {
            try {
              // Get restaurant details
              const restaurant = await getDocument<RestaurantData>('restaurants', picnic.restaurantRef);
              
              if (restaurant) {
                userPicnics.push({
                  id: picnic.id,
                  restaurant: restaurant.name || 'Unknown Restaurant',
                  date: picnic.createdAt?.toDate() || new Date(),
                  image: restaurant.photos?.[0] || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60',
                  participants: picnic.participants || [],
                });
              }
            } catch (error) {
              console.error('Error processing picnic:', error);
            }
          }
          
          setPicnics(userPicnics);
        }
      } catch (error) {
        console.error('Error fetching picnics:', error);
        setError('Failed to load picnics');
      } finally {
        setIsPicnicsLoading(false);
      }
    };

    fetchUserPicnics();
  }, [auth.currentUser, getDocument, getDocuments]);

  // Load saved restaurants when the tab changes or user changes
  useEffect(() => {
    const loadSavedRestaurants = async () => {
      if (activeTab !== 'saved' || !auth.currentUser) return;
      
      setIsLoadingSaved(true);
      try {
        const savedQuery = query(
          collection(db, 'users', auth.currentUser.uid, 'savedRestaurants'),
          orderBy('savedAt', 'desc')
        );
        const snapshot = await getDocs(savedQuery);
        const savedPromises = snapshot.docs.map(async (doc) => {
          try {
            // Safely get document data with null checks
            const data = doc.data() || {};
            
            // Ensure we have the required data
            if (!data || !data.placeId) {
              console.warn('Saved restaurant missing placeId or data is invalid:', doc.id, data);
              return null;
            }

            // Create a safe restaurant data object with defaults
            const restaurantData = (data && data.restaurantData) || {};
            const safeRestaurantData = {
              name: restaurantData.name || 'Unknown Restaurant',
              address: restaurantData.address || 'Address not available',
              rating: restaurantData.rating || 0,
              photoUrl: restaurantData.photoUrl || '',
              distance: restaurantData.distance || 'N/A',
              ...restaurantData
            };

            return {
              id: doc.id,
              ...data,
              savedAt: data.savedAt?.toDate ? data.savedAt.toDate() : new Date(),
              restaurantData: safeRestaurantData
            };
          } catch (error) {
            console.error('Error processing saved restaurant:', error, doc.id);
            return null;
          }
        });
        
        // Filter out any null entries and set the state
        const saved = (await Promise.all(savedPromises)).filter(Boolean);
        setSavedRestaurants(saved);
      } catch (err) {
        console.error('Error loading saved restaurants:', err);
        setError('Failed to load saved restaurants');
      } finally {
        setIsLoadingSaved(false);
      }
    };

    loadSavedRestaurants();
  }, [activeTab, auth.currentUser, db, getDocs, query, where, collection]);

  // Show loading state while data is being fetched
  if (isUserLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Show error state if there was an error
  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center p-4">
          <p className="text-red-500">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Menu items have been moved to the settings popup
  // Remove the unused menuItems array

  return (
    <div className="bg-white dark:bg-gray-900 min-h-screen">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Profile</h1>
          <div className="relative">
            <button 
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                e.nativeEvent.stopImmediatePropagation();
                setIsSettingsOpen(!isSettingsOpen);
              }}
              onMouseDown={(e) => {
                // Prevent focus change which might trigger other events
                e.preventDefault();
              }}
              className="p-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              aria-label="Settings"
              aria-expanded={isSettingsOpen}
              aria-haspopup="true"
            >
              <Cog6ToothIcon className="h-6 w-6" />
            </button>
            
            {/* Settings Popup */}
            {isSettingsOpen && (
              <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-gray-800 rounded-lg shadow-xl z-50 border border-gray-200 dark:border-gray-700 settings-popup">
                <div className="p-4">
                  <div className="flex items-center justify-between mb-6">
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Profile</h1>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setShowNotificationPrefs(true)}
                        className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full relative"
                        aria-label="Notification preferences"
                      >
                        <BellAlertIcon className="h-6 w-6" />
                      </button>
                      <ThemeToggle />
                      <button
                        onClick={handleSignOut}
                        className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
                        aria-label="Sign out"
                      >
                        <ArrowRightOnRectangleIcon className="h-6 w-6" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    {/* Theme Toggle */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {darkMode ? (
                          <MoonIcon className="h-5 w-5 text-gray-700 dark:text-yellow-400" />
                        ) : (
                          <SunIcon className="h-5 w-5 text-gray-700 dark:text-yellow-400" />
                        )}
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          {darkMode ? 'Dark' : 'Light'} Mode
                        </span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          toggleDarkMode();
                        }}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                          darkMode ? 'bg-blue-600' : 'bg-gray-200'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            darkMode ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                    
                    {/* Notification Preferences Button */}
                    <div 
                      className="flex items-center justify-between py-4 px-6 border-b border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                      onClick={() => setShowNotificationPrefs(true)}
                    >
                      <div className="flex items-center">
                        <BellAlertIcon className="h-5 w-5 text-gray-500 mr-3" />
                        <span className="text-gray-900 dark:text-white">Notification Preferences</span>
                      </div>
                      <svg
                        className="h-5 w-5 text-gray-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </div>

                    {/* Temperature Unit Toggle */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Temperature Unit
                        </span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          toggleTemperatureUnit();
                        }}
                        className="relative inline-flex h-6 w-11 items-center rounded-full bg-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                      >
                        <span
                          className={`absolute flex h-5 w-5 items-center justify-center text-xs font-medium transition-all ${
                            temperatureUnit === 'celsius' ? 'left-1 text-blue-600' : 'right-1 text-gray-600'
                          }`}
                        >
                          {temperatureUnit === 'celsius' ? '°C' : '°F'}
                        </span>
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform ${
                            temperatureUnit === 'celsius' ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                    
                    {/* Account Settings */}
                    <button 
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsSettingsOpen(false);
                        navigate('/account');
                      }}
                      className="flex items-center space-x-3 w-full p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      <UserCircleIcon className="h-5 w-5 text-gray-700 dark:text-gray-300" />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Account Settings
                      </span>
                    </button>
                    
                    {/* Help & Support */}
                    <button 
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        window.open('https://help.picnik.com', '_blank');
                      }}
                      className="flex items-center space-x-3 w-full p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      <QuestionMarkCircleIcon className="h-5 w-5 text-gray-700 dark:text-gray-300" />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Help & Support
                      </span>
                    </button>
                    
                    {/* Logout Button */}
                    <button 
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleSignOut();
                      }}
                      className="flex items-center space-x-3 w-full p-2 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors mt-2"
                    >
                      <ArrowRightOnRectangleIcon className="h-5 w-5" />
                      <span className="text-sm font-medium">
                        Logout
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Profile Header */}
      <div className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center space-x-6">
            <div className="relative group">
              <img
                src={currentUser.photoURL}
                alt={currentUser.displayName}
                className="h-24 w-24 rounded-full border-4 border-white dark:border-gray-700 shadow object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.displayName || 'User')}&background=random`;
                }}
              />
              <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="absolute bottom-0 right-0 bg-blue-500 text-white p-1.5 rounded-full hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Change photo"
              >
                {isUploading ? (
                  <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <PencilIcon className="h-4 w-4" />
                )}
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handlePhotoUpload}
                accept="image/*"
                className="hidden"
                disabled={isUploading}
              />
            </div>
            <div className="flex-1">
              <div className="flex justify-between items-start">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{currentUser.displayName}</h1>
                  <p className="text-gray-600 dark:text-gray-300">{currentUser.username}</p>
                  <p className="mt-2 text-gray-700 dark:text-gray-200">{currentUser.bio}</p>
                </div>
                <div className="flex space-x-3">
                  <button 
                    onClick={() => setShowEditModal(true)}
                    className="bg-white dark:bg-gray-800 text-gray-800 dark:text-white px-4 py-2 rounded-full text-sm font-medium flex items-center space-x-1 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <PencilIcon className="h-4 w-4" />
                    <span>Edit</span>
                  </button>
                  <button 
                    onClick={() => {
                      if (navigator.share) {
                        navigator.share({
                          title: `Check out ${currentUser.displayName}'s Picnik profile`,
                          text: `Join ${currentUser.displayName} on Picnik!`,
                          url: window.location.href,
                        }).catch(console.error);
                      } else {
                        // Fallback for browsers that don't support Web Share API
                        navigator.clipboard.writeText(window.location.href);
                        alert('Profile link copied to clipboard!');
                      }
                    }}
                    className="bg-blue-500 text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-blue-600 transition-colors"
                  >
                    Share
                  </button>
                </div>
              </div>
              
              <div className="flex items-center mt-6 text-sm text-gray-500 dark:text-gray-400 space-x-6">
                <div className="flex flex-col items-center">
                  <span className="text-xl font-bold text-gray-900 dark:text-white">{currentUser.stats.picniks}</span>
                  <span>Picniks</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-xl font-bold text-gray-900 dark:text-white">{currentUser.stats.friends}</span>
                  <span>Friends</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-xl font-bold text-gray-900 dark:text-white">{currentUser.stats.reviews}</span>
                  <span>Reviews</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-700 mb-4">
        <button
          className={`flex-1 py-2 font-medium text-sm ${
            activeTab === 'picniks' 
              ? 'text-primary-500 border-b-2 border-primary-500 dark:border-primary-400 dark:text-primary-400' 
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
          onClick={() => setActiveTab('picniks')}
        >
          My Picniks
        </button>
        <button
          className={`flex-1 py-2 font-medium text-sm ${
            activeTab === 'saved' 
              ? 'text-primary-500 border-b-2 border-primary-500 dark:border-primary-400 dark:text-primary-400' 
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
          onClick={() => setActiveTab('saved')}
        >
          Saved
        </button>
        <button
          className={`flex-1 py-2 font-medium text-sm ${
            activeTab === 'reviews' 
              ? 'text-primary-500 border-b-2 border-primary-500 dark:border-primary-400 dark:text-primary-400' 
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
          onClick={() => setActiveTab('reviews')}
        >
          Reviews
        </button>
      </div>

      {/* Content */}
      {activeTab === 'picniks' && (
        <div className="space-y-4">
          {isPicnicsLoading ? (
            <div className="flex justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : picnics.length > 0 ? (
            picnics.map((picnic) => (
              <div key={picnic.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
                <div className="relative h-40">
                  <img
                    src={picnic.image}
                    alt={picnic.restaurant}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 text-white">
                    <h3 className="font-bold text-lg">{picnic.restaurant}</h3>
                    <div className="flex items-center text-sm text-gray-200 space-x-4 mt-1">
                      <div className="flex items-center">
                        <ClockIcon className="h-4 w-4 mr-1" />
                        <span>{formatDistanceToNow(picnic.date, { addSuffix: true })}</span>
                      </div>
                      <div className="flex items-center">
                        <UserGroupIcon className="h-4 w-4 mr-1" />
                        <span>{picnic.participants.length} {picnic.participants.length === 1 ? 'friend' : 'friends'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-10">
              <p className="text-gray-500 dark:text-gray-400">No picnics yet. Start your first picnic!</p>
              <button 
                onClick={() => navigate('/restaurants')}
                className="mt-4 bg-blue-500 text-white px-6 py-2 rounded-full text-sm font-medium hover:bg-blue-600 transition-colors"
              >
                Create Picnic
              </button>
            </div>
          )}
        </div>
      )}

      {activeTab === 'saved' && (
        <div className="space-y-4">
          {isLoadingSaved ? (
            <div className="flex justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : savedRestaurants.length > 0 ? (
            savedRestaurants.map((restaurant) => (
              <div key={restaurant.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
                <div className="relative h-40">
                  {restaurant.photos?.[0]?.getUrl() ? (
                    <img
                      src={restaurant.photos[0].getUrl()}
                      alt={restaurant.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                      <span className="text-gray-400">No image</span>
                    </div>
                  )}
                  <div className="absolute top-2 right-2">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUnsaveRestaurant(restaurant.id);
                      }}
                      className="p-1.5 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm rounded-full shadow-sm hover:bg-white/100 dark:hover:bg-gray-800/100 transition-colors"
                      aria-label="Remove from saved"
                    >
                      <BookmarkIconSolid className="h-5 w-5 text-blue-500" />
                    </button>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 text-white">
                    <h3 className="font-bold text-lg">{restaurant.name}</h3>
                    <div className="flex items-center text-sm text-gray-200 space-x-4 mt-1">
                      <div className="flex items-center">
                        <MapPinIcon className="h-4 w-4 mr-1" />
                        <span>{restaurant.vicinity || 'Address not available'}</span>
                      </div>
                      {restaurant.rating > 0 && (
                        <div className="flex items-center">
                          <StarIcon className="h-4 w-4 mr-1 text-yellow-400" />
                          <span>{restaurant.rating.toFixed(1)}</span>
                          {restaurant.user_ratings_total > 0 && (
                            <span className="text-xs opacity-75 ml-1">({restaurant.user_ratings_total})</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="p-4">
                  <div className="flex justify-between items-center mt-3">
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {restaurant.savedAt ? `Saved ${formatDistanceToNow(restaurant.savedAt, { addSuffix: true })}` : 'Saved recently'}
                    </span>
                    <button 
                      onClick={() => {
                        // Navigate to the restaurant or show details
                        console.log('View restaurant:', restaurant.place_id);
                      }}
                      className="text-sm text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
                    >
                      View Details
                    </button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-10">
              <p className="text-gray-500 dark:text-gray-400">No saved restaurants yet.</p>
              <button 
                onClick={() => navigate('/restaurants')}
                className="mt-4 bg-blue-500 text-white px-6 py-2 rounded-full text-sm font-medium hover:bg-blue-600 transition-colors"
              >
                Browse Restaurants
              </button>
            </div>
          )}
        </div>
      )}

      {activeTab === 'reviews' && (
        <div className="text-center py-10">
          <p className="text-gray-500 dark:text-gray-400">No reviews yet</p>
        </div>
      )}


      {/* Edit Profile Modal */}
      <EditProfileModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        user={currentUser}
        onSave={handleUpdateProfile}
      />

      {/* Notification Preferences Dialog */}
      <Dialog
        open={showNotificationPrefs}
        onClose={() => setShowNotificationPrefs(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center">
            <BellAlertIcon className="h-6 w-6 mr-2 text-primary-500" />
            <span className="text-lg font-medium text-gray-900 dark:text-white">Notification Preferences</span>
          </div>
          <IconButton
            onClick={() => setShowNotificationPrefs(false)}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            size="small"
          >
            <XMarkIcon className="h-5 w-5" />
          </IconButton>
        </DialogTitle>
        <DialogContent className="p-0">
          <NotificationPreferences onClose={() => setShowNotificationPrefs(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
