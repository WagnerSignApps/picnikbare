import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useFirebase } from '../contexts/FirebaseContext';
import { collection, doc, setDoc, deleteDoc, serverTimestamp, getDocs, query, where } from 'firebase/firestore';
import { useLocation } from 'react-router-dom';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';
import PicnicWidget from '../components/PicnicWidget';
import type { PicnicData } from '../components/PicnicWidget';
import CameraModal from '../components/CameraModal';
import { TrashIcon } from '@heroicons/react/24/outline';

interface ExtendedPicnicData extends PicnicData {
  status?: 'active' | 'completed';
  createdAt?: any;
  updatedAt?: any;
  photoURL?: string;
  photoPath?: string;
  hostId?: string;
}

interface Restaurant {
  id: string;
  name: string;
  address: string;
  location: {
    lat: number;
    lng: number;
  };
}

interface WeatherData {
  emoji: string;
  face: string;
  message: string;
  temp: number;
  condition: string;
  unit: string;
}

export function StartPicnikTab() {
  const navigate = useNavigate();
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [_, setUserLocation] = useState<{lat: number; lng: number} | null>(null);
  const [activePicnics, setActivePicnics] = useState<ExtendedPicnicData[]>([]);
  // Define the shape of location state
  interface LocationState {
    restaurant?: Restaurant;
    showCamera?: boolean;
  }

  const location = useLocation();
  const locationState = location.state as LocationState | undefined;
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [isCreatingPicnic, setIsCreatingPicnic] = useState(false);
  const [errorState, setErrorState] = useState<string | null>(null);
  
  const { db } = useFirebase();
  const { currentUser } = useAuth();
  
  // Get weather emoji and face based on condition
  const getWeatherEmoji = (condition: string) => {
    const conditionLower = condition.toLowerCase();
    
    // Define weather emojis and corresponding face expressions
    const weatherEmojis = {
      sunny: { emoji: '☀️', face: '😎' },
      clear: { emoji: '☀️', face: '😊' },
      cloudy: { emoji: '☁️', face: '😐' },
      'partly cloudy': { emoji: '⛅', face: '😊' },
      rainy: { emoji: '🌧️', face: '☔' },
      rainy2: { emoji: '🌧️', face: '😟' },
      thunderstorm: { emoji: '⛈️', face: '😨' },
      snowy: { emoji: '❄️', face: '⛄' },
      foggy: { emoji: '🌫️', face: '😶‍🌫️' },
      windy: { emoji: '💨', face: '🌬️' },
      default: { emoji: '🌈', face: '😊' }
    };

    // Find matching weather condition
    const match = Object.entries(weatherEmojis).find(([key]) => 
      conditionLower.includes(key)
    );

    return match ? match[1] : weatherEmojis.default;
  };

  // Fetch weather data based on location using OpenWeather API
  const fetchWeather = useCallback(async (lat: number, lng: number) => {
    try {
      // Import the weather service function
      const { getWeatherData } = await import('../services/weatherService');
      
      // Use the weather service to get real weather data
      const weatherData = await getWeatherData(lat, lng, 'imperial');
      
      // Get the main weather condition
      const mainCondition = weatherData.weather[0]?.main || 'Clear';
      const description = weatherData.weather[0]?.description || 'clear sky';
      const { emoji, face } = getWeatherEmoji(mainCondition.toLowerCase());
      
      // Determine if it's a good day for a picnic based on temperature and conditions
      let message = `It's ${description} today!`;
      const tempF = Math.round(weatherData.main.temp);
      const feelsLikeF = Math.round(weatherData.main.feels_like || tempF);
      
      if (tempF >= 85) {
        message = `Hot out! Stay hydrated if picnicking! 🥵`;
      } else if (tempF >= 75) {
        message = 'Warm and great for a picnic! 🧺';
      } else if (tempF >= 60) {
        message = 'Nice day for a picnic! 🍃';
      } else if (tempF >= 50) {
        message = 'Cool but pleasant for a picnic with a jacket 🧥';
      } else {
        message = 'Chilly out - bundle up if picnicking! ❄️';
      }
      
      // Add feels like temperature if it's significantly different
      if (Math.abs(feelsLikeF - tempF) >= 5) {
        message += ` (Feels like ${feelsLikeF}°F)`;
      }
      
      // Set the weather state
      setWeather({
        emoji,
        face,
        message,
        temp: Math.round(weatherData.main.temp), // This will be displayed as just the number
        condition: mainCondition,
        unit: '°F'
      });
      
      // Update user location
      setUserLocation({ lat, lng });
      
    } catch (err) {
      console.error('Error fetching weather:', err);
      setErrorState('Failed to load weather data');
      
      // Fallback to mock data if API fails
      const fallbackWeather: WeatherData = {
        emoji: '🌤️',
        face: '😊',
        message: 'Weather data not available',
        temp: 72,
        condition: 'Unknown',
        unit: '°F'
      };
      setWeather(fallbackWeather);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load user location and weather
  useEffect(() => {
    const fetchLocationAndWeather = async () => {
      try {
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            async (position) => {
              const { latitude, longitude } = position.coords;
              await fetchWeather(latitude, longitude);
            },
            (error) => {
              console.error('Error getting location:', error);
              // Default to New York coordinates if location access is denied
              const defaultLat = 40.7128;
              const defaultLng = -74.0060;
              fetchWeather(defaultLat, defaultLng);
            }
          );
        } else {
          // Default to New York coordinates if geolocation is not supported
          const defaultLat = 40.7128;
          const defaultLng = -74.0060;
          fetchWeather(defaultLat, defaultLng);
        }
      } catch (error) {
        console.error('Error in location handling:', error);
        setErrorState('Failed to get location');
        setLoading(false);
      }
    };

    fetchLocationAndWeather();
  }, [fetchWeather]);

  useEffect(() => {
    if (location.state?.startPicnic && location.state.restaurant) {
      setSelectedRestaurant(location.state.restaurant);
      setShowCameraModal(true);
      // Clear the state to prevent reopening on refresh
      window.history.replaceState({}, '');
    }
  }, [location.state]);

  // Image upload and picnic creation handled by the parent component
  // This function was removed as it's not being used and was causing TypeScript errors

  // Handle photo taken from camera
  const handlePhotoTaken = useCallback(async (imageData: string) => {
    if (!currentUser || !selectedRestaurant) return;
    
    try {
      setIsCreatingPicnic(true);
      
      // Create a new picnic ID
      const picnicId = uuidv4();
      const storage = getStorage();
      const fileName = `photo-${Date.now()}.jpg`;
      const storagePath = `picnics/${currentUser.uid}/${picnicId}/${fileName}`;
      const storageRef = ref(storage, storagePath);

      // Convert base64 to blob and upload
      const response = await fetch(imageData);
      const blob = await response.blob();
      const snapshot = await uploadBytes(storageRef, blob);
      const photoURL = await getDownloadURL(snapshot.ref);

      // Create picnic document
      const picnicData: ExtendedPicnicData = {
        id: picnicId,
        hostName: currentUser.displayName || 'You',
        hostPhotoURL: currentUser.photoURL || 'https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y',
        restaurantName: selectedRestaurant.name,
        participants: [{
          id: currentUser.uid,
          name: currentUser.displayName || 'You',
          photoURL: currentUser.photoURL || 'https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y',
        }],
        status: 'active',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        photoPath: storagePath,
        photoURL: photoURL,
        hostId: currentUser.uid
      };

      // Save to Firestore
      const picnicRef = doc(collection(db, 'picnics'), picnicId);
      await setDoc(picnicRef, picnicData);

      // Update local state
      setActivePicnics(prev => [...prev, picnicData]);
      
      // Close the camera modal and navigate
      setShowCameraModal(false);
      setSelectedRestaurant(null);
      navigate('/');
    } catch (error) {
      console.error('Error creating picnic:', error);
      setErrorState('Failed to create picnic. Please try again.');
    } finally {
      setIsCreatingPicnic(false);
    }
  }, [currentUser, selectedRestaurant, db, navigate]);
  
  // Load active picnics on mount
  useEffect(() => {
    if (!currentUser) return;
    
    const loadActivePicnics = async () => {
      try {
        const q = query(
          collection(db, 'picnics'),
          where('participants', 'array-contains', { id: currentUser.uid })
        );
        
        const querySnapshot = await getDocs(q);
        const picnics = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as ExtendedPicnicData[];
        
        setActivePicnics(picnics);
      } catch (error) {
        console.error('Error loading picnics:', error);
        setErrorState('Failed to load picnics. Please refresh the page.');
      }
    };
    
    loadActivePicnics();
  }, [currentUser, db]);

  // Check for restaurant data in location state
  useEffect(() => {
    if (locationState?.restaurant) {
      setSelectedRestaurant(locationState.restaurant);
      setShowCameraModal(!!locationState.showCamera);
      // Clear the state to prevent reopening on refresh
      window.history.replaceState({}, '');
    }
  }, [locationState]);

  // Handle picnic deletion
  const handleDeletePicnic = useCallback(async (picnicId: string) => {
    if (!currentUser) return;
    
    try {
      // First find the document ID since we're querying by picnic ID
      const picnicQuery = query(collection(db, 'picnics'), where('id', '==', picnicId));
      const querySnapshot = await getDocs(picnicQuery);
      
      if (!querySnapshot.empty) {
        const docId = querySnapshot.docs[0].id;
        await deleteDoc(doc(db, 'picnics', docId));
        
        // Remove from local state
        setActivePicnics(prev => prev.filter(p => p.id !== picnicId));
      }
    } catch (error) {
      console.error('Error deleting picnic:', error);
      setErrorState('Failed to delete picnic. Please try again.');
    }
  }, [currentUser, db]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (errorState) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-500 text-center p-4">
          <p className="text-xl font-semibold">Error</p>
          <p>{errorState}</p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col space-y-8">
          <div className="space-y-6">
            {weather && (
              <div className="weather-widget p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
                <div className="flex items-center justify-between mb-2">
                  <h1 className="text-2xl font-bold flex items-center">
                    <span className="mr-2">Picnic Time!</span>
                    <span className="text-2xl">{weather.face}</span>
                  </h1>
                  <div className="text-right">
                    <div className="flex items-baseline space-x-1">
                      <span className="text-4xl">{weather.emoji}</span>
                      <span className="text-3xl font-bold">{weather.temp}</span>
                      <span className="text-2xl">°F</span>
                    </div>
                    <div className="text-gray-600 dark:text-gray-300 text-lg">
                      {weather.condition}
                    </div>
                  </div>
                </div>
                <div className="mt-2 text-sm text-gray-600 dark:text-gray-400 italic">
                  {weather.message}
                </div>
              </div>
            )}

            <div className="space-y-4">
              <PicnicWidget
                picnics={activePicnics}
                onJoinPicnic={(picnicId) => {
                  // Handle joining a picnic
                  console.log('Joining picnic:', picnicId);
                }}
              />
              
              {activePicnics.map((picnic) => (
                currentUser?.uid === picnic.hostId && (
                  <div key={`delete-${picnic.id}`} className="relative">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm('Are you sure you want to delete this picnic?')) {
                          handleDeletePicnic(picnic.id);
                        }
                      }}
                      className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                      aria-label="Delete picnic"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                )
              ))}
            </div>

            <CameraModal
              isOpen={showCameraModal}
              onClose={() => setShowCameraModal(false)}
              onPhotoTaken={handlePhotoTaken}
              isLoading={isCreatingPicnic}
              restaurantName={selectedRestaurant?.name || 'the park'}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default StartPicnikTab;
