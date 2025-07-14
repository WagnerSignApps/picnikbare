import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { CameraIcon as CameraIconSolid, BookmarkIcon as BookmarkIconSolid, MapPinIcon } from '@heroicons/react/24/solid';
import { BookmarkIcon } from '@heroicons/react/24/outline';
import { Loader } from '@googlemaps/js-api-loader';
import { useFirebase } from '../contexts/FirebaseContext';
import { 
  collection, 
  getDocs,
  query,
  where,
  doc,
  deleteDoc,
  addDoc,
  serverTimestamp,
  orderBy,
  onSnapshot,
} from 'firebase/firestore';

// Google Maps types are now handled by @types/google.maps

// Default location (New York)
const DEFAULT_LOCATION = { lat: 40.7128, lng: -74.0060 };

// Radius options in meters
const RADIUS_OPTIONS = [
  { value: 8047, label: '5 miles' },    // 5 miles in meters
  { value: 16093, label: '10 miles' },  // 10 miles in meters
  { value: 32187, label: '20 miles' }   // 20 miles in meters
];

// Initialize Google Maps API loader
const loader = new Loader({
  apiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
  version: 'weekly',
  libraries: ['places']
});

// Types
interface Location {
  lat: number;
  lng: number;
}

interface Restaurant {
  place_id: string;
  name: string;
  vicinity: string;
  geometry: {
    location: {
      lat: () => number;
      lng: () => number;
    };
  };
  rating?: number;
  user_ratings_total?: number;
  opening_hours?: {
    isOpen: () => boolean;
  };
  distance?: number;
  photos?: Array<{
    getUrl: () => string;
  }>;
  price_level?: number;
  types?: string[];
  saved?: boolean;
}

// Helper function to calculate distance between two coordinates (Haversine formula)
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; // Distance in km
};

// Format distance with appropriate units
const formatDistance = (distance: number): string => {
  if (distance < 1) return `${Math.round(distance * 1000)}m`;
  return `${distance.toFixed(1)}km`;
};

const fetchNearbyRestaurants = async (
  map: google.maps.Map,
  location: Location,
  radius: number,
  nextPageToken?: string
): Promise<{ results: Restaurant[]; nextPageToken?: string }> => {
  return new Promise((resolve) => {
    const service = new google.maps.places.PlacesService(map);
    
    const request: google.maps.places.PlaceSearchRequest = {
      location: new google.maps.LatLng(location.lat, location.lng),
      radius: radius,
      type: 'restaurant',
      openNow: true,
    };

    if (nextPageToken) {
      (request as any).pageToken = nextPageToken; // Type assertion to bypass type checking
    }

    service.nearbySearch(request, (results: google.maps.places.PlaceResult[] | null, status: google.maps.places.PlacesServiceStatus, pagination: google.maps.places.PlaceSearchPagination | null) => {
      if (status !== 'OK' || !results) {
        console.error('Error fetching places:', status);
        return resolve({ results: [] });
      }

      const restaurants = results.map(place => {
        const placeLocation = place.geometry?.location;
        if (!placeLocation) {
          return {
            ...place,
            distance: 0,
          } as Restaurant;
        }
        
        const lat = placeLocation.lat();
        const lng = placeLocation.lng();
        
        return {
          ...place,
          distance: calculateDistance(
            location.lat,
            location.lng,
            lat,
            lng
          ),
        } as Restaurant;
      });

      // Get the next page token if available
      const nextPageToken = pagination?.hasNextPage && typeof pagination.nextPage === 'function' 
        ? String(pagination.nextPage())
        : undefined;
      
      resolve({
        results: restaurants,
        nextPageToken
      });
    });
  });
};

const RestaurantCard: React.FC<{ 
  restaurant: Restaurant; 
  onSave: (r: Restaurant) => void; 
  onRemove: (r: Restaurant) => void; 
  isSaved: boolean;
  onStartPicnic: (r: Restaurant) => void;
}> = ({ restaurant, onSave, onRemove, isSaved, onStartPicnic }) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">{restaurant.name}</h3>
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
        {restaurant.vicinity}
      </p>
      
      <div className="mt-3 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          {restaurant.opening_hours?.isOpen?.() !== undefined && (
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              restaurant.opening_hours.isOpen() 
                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' 
                : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
            }`}>
              {restaurant.opening_hours.isOpen() ? 'Open Now' : 'Closed'}
            </span>
          )}
          {restaurant.rating && (
            <span className="flex items-center text-sm text-gray-500 dark:text-gray-400">
              ★ {restaurant.rating.toFixed(1)}
              {restaurant.user_ratings_total && ` (${restaurant.user_ratings_total})`}
            </span>
          )}
          {restaurant.distance !== undefined && (
            <span className="flex items-center text-sm text-gray-500 dark:text-gray-400">
              <MapPinIcon className="h-3.5 w-3.5 mr-0.5" />
              {formatDistance(restaurant.distance)}
            </span>
          )}
        </div>
        <div className="flex space-x-2">
          <button 
            onClick={() => onStartPicnic(restaurant)}
            className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-lg transition-colors flex items-center space-x-1.5"
          >
            <CameraIconSolid className="h-4 w-4" />
            <span>Start Picnic</span>
          </button>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              isSaved ? onRemove(restaurant) : onSave(restaurant);
            }}
            className="p-2 text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 transition-colors"
            aria-label={isSaved ? 'Remove from saved' : 'Save for later'}
          >
            {isSaved ? (
              <BookmarkIconSolid className="h-5 w-5 text-blue-500" />
            ) : (
              <BookmarkIcon className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

const RestaurantsTab: React.FC = (): JSX.Element => {
  const { auth, db } = useFirebase();
  const navigate = useNavigate();
  
  // State management
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [savedRestaurants, setSavedRestaurants] = useState<Set<string>>(new Set());
  const [userLocation, setUserLocation] = useState<Location>(DEFAULT_LOCATION);
  const [radius, setRadius] = useState<number>(RADIUS_OPTIONS[1].value);
  const [nextPageToken, setNextPageToken] = useState<string | undefined>();
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [showFilters, setShowFilters] = useState<boolean>(false);
  
  // Refs
  const mapRef = useRef<HTMLDivElement>(null);
  const lastRestaurantRef = useRef<HTMLDivElement>(null);
  const observer = useRef<IntersectionObserver | null>(null);

  // Fetch restaurants from Google Places API
  const fetchRestaurants = useCallback(async (
    map: google.maps.Map,
    location: Location,
    radius: number,
    loadMore: boolean = false
  ) => {
    if (!loadMore) {
      setLoading(true);
      setRestaurants([]);
    } else {
      setLoadingMore(true);
    }

    try {
      const { results, nextPageToken: newNextPageToken } = await fetchNearbyRestaurants(
        map,
        location,
        radius,
        loadMore ? nextPageToken : undefined
      );

      setRestaurants(prev => loadMore ? [...prev, ...results] : results);
      setNextPageToken(newNextPageToken);
      setError(null);
    } catch (err) {
      console.error('Error fetching restaurants:', err);
      setError('Failed to load restaurants. Please try again.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [nextPageToken]);

  // Toggle save/unsave restaurant
  const toggleSaveRestaurant = useCallback(async (restaurant: Restaurant) => {
    if (!auth.currentUser) return;
    
    const restaurantId = restaurant.place_id;
    
    try {
      // Check if restaurant is already saved
      const savedQuery = query(
        collection(db, 'users', auth.currentUser.uid, 'savedRestaurants'),
        where('placeId', '==', restaurantId)
      );
      
      const querySnapshot = await getDocs(savedQuery);
      
      if (!querySnapshot.empty) {
        // If restaurant is already saved, remove it
        const docId = querySnapshot.docs[0].id;
        await deleteDoc(doc(db, 'users', auth.currentUser.uid, 'savedRestaurants', docId));
        
        // Update local state
        setSavedRestaurants(prev => {
          const newSet = new Set(prev);
          newSet.delete(restaurantId);
          return newSet;
        });
      } else {
        // If restaurant is not saved, add it
        const location = restaurant.geometry?.location;
        const lat = typeof location?.lat === 'function' ? location.lat() : location?.lat;
        const lng = typeof location?.lng === 'function' ? location.lng() : location?.lng;
        
        await addDoc(
          collection(db, 'users', auth.currentUser.uid, 'savedRestaurants'), 
          {
            placeId: restaurantId,
            name: restaurant.name,
            address: restaurant.vicinity || '',
            location: {
              lat: lat || 0,
              lng: lng || 0
            },
            photoUrl: restaurant.photos?.[0]?.getUrl?.() || '',
            rating: restaurant.rating || 0,
            userRatingsTotal: restaurant.user_ratings_total || 0,
            priceLevel: restaurant.price_level || 0,
            types: restaurant.types || [],
            isOpen: restaurant.opening_hours?.isOpen?.() || false,
            savedAt: serverTimestamp()
          }
        );
        
        // Update local state
        setSavedRestaurants(prev => new Set(prev).add(restaurantId));
      }
    } catch (error) {
      console.error('Error toggling save restaurant:', error);
    }
  }, [auth.currentUser, db]);

  // Handle starting a picnic at a restaurant
  const handleStartPicnic = useCallback((restaurant: Restaurant) => {
    if (!restaurant?.place_id || !restaurant.geometry?.location) {
      console.error('Invalid restaurant data');
      setError('Invalid restaurant data. Please try again.');
      return;
    }
    
    try {
      navigate('/start-picnic', { 
        state: { 
          restaurant: {
            id: restaurant.place_id,
            name: restaurant.name || 'Unknown Restaurant',
            address: restaurant.vicinity || '',
            location: {
              lat: typeof restaurant.geometry.location.lat === 'function' 
                ? restaurant.geometry.location.lat() 
                : restaurant.geometry.location.lat,
              lng: typeof restaurant.geometry.location.lng === 'function'
                ? restaurant.geometry.location.lng()
                : restaurant.geometry.location.lng
            }
          },
          startPicnic: true
        } 
      });
    } catch (error) {
      console.error('Error navigating to start picnic:', error);
      setError('Failed to start picnic. Please try again.');
    }
  }, [navigate]);

  // Load saved restaurants when user changes
  useEffect(() => {
    if (!auth?.currentUser) {
      setSavedRestaurants(new Set());
      return;
    }

    const loadSavedRestaurants = async () => {
      if (!auth.currentUser) return;
      setLoading(true);
      setError(null);
      
      try {
        const savedRestaurantsRef = collection(db, 'users', auth.currentUser.uid, 'savedRestaurants');
        const savedQuery = query(
          savedRestaurantsRef,
          orderBy('savedAt', 'desc')
        );
        
        const querySnapshot = await getDocs(savedQuery);
        const savedIds = new Set<string>();
        
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          if (data.placeId) {
            savedIds.add(data.placeId);
          }
        });
        
        setSavedRestaurants(savedIds);
      } catch (error) {
        console.error('Error loading saved restaurants:', error);
        setError('Failed to load saved restaurants. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    loadSavedRestaurants();
    
    // Set up real-time listener for saved restaurants
    if (!auth.currentUser) return;
    
    const savedRestaurantsRef = collection(db, 'users', auth.currentUser.uid, 'savedRestaurants');
    const savedQuery = query(
      savedRestaurantsRef,
      orderBy('savedAt', 'desc')
    );
    
    const unsubscribe = onSnapshot(
      savedQuery,
      (snapshot) => {
        const updatedSaved = new Set<string>();
        snapshot.forEach((doc) => {
          const data = doc.data();
          if (data.placeId) {
            updatedSaved.add(data.placeId);
          }
        });
        setSavedRestaurants(updatedSaved);
      },
      (error) => {
        console.error('Error in saved restaurants listener:', error);
        setError('Error updating saved restaurants');
      }
    );
    
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [auth?.currentUser, db]);

  // Initialize map and fetch restaurants
  useEffect(() => {
    let isMounted = true;
    let mapInstance: google.maps.Map | null = null;

    const initMap = async () => {
      if (!isMounted) return;
      
      try {
        setLoading(true);
        setError(null);

        // Load Google Maps API
        await loader.load();
        console.log('Google Maps API loaded successfully');
        
        // Set a default location in case geolocation fails
        let currentLocation = { ...DEFAULT_LOCATION };
        
        // Try to get user's current location
        if (navigator.geolocation) {
          console.log('Requesting geolocation...');
          
          try {
            const position = await new Promise<GeolocationPosition>((resolve, reject) => {
              navigator.geolocation.getCurrentPosition(resolve, reject, {
                timeout: 5000, // 5 seconds timeout
                maximumAge: 60000, // 1 minute
                enableHighAccuracy: true
              });
            });
            
            if (position && isMounted) {
              currentLocation = {
                lat: position.coords.latitude,
                lng: position.coords.longitude
              };
              console.log('Got user location:', currentLocation);
            }
          } catch (geoError) {
            console.warn('Error getting geolocation:', geoError);
            // Continue with default location
          }
        } else {
          console.warn('Geolocation is not supported by this browser');
        }
        
        // Initialize the map
        if (!mapRef.current) {
          throw new Error('Map container ref not found');
        }
        
        // Create new map instance
        mapInstance = new window.google.maps.Map(mapRef.current, {
          center: currentLocation,
          zoom: 14,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
          zoomControl: true,
          clickableIcons: false,
          styles: [
            {
              featureType: 'poi',
              elementType: 'labels',
              stylers: [{ visibility: 'off' }]
            }
          ]
        });
        
        // Add user location marker
        new window.google.maps.Marker({
          position: currentLocation,
          map: mapInstance,
          title: 'Your Location',
          icon: {
            url: 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png',
            scaledSize: new window.google.maps.Size(40, 40)
          }
        });
        
        if (isMounted) {
          setMap(mapInstance);
          setUserLocation(currentLocation);
          
          // Fetch nearby restaurants
          try {
            const { results, nextPageToken: nextToken } = await fetchNearbyRestaurants(
              mapInstance,
              currentLocation,
              radius
            );
            
            if (isMounted) {
              setRestaurants(results);
              setNextPageToken(nextToken);
            }
          } catch (fetchError) {
            console.error('Error fetching restaurants:', fetchError);
            setError('Failed to load restaurants. Please try again.');
          }
        }
        
      } catch (error) {
        console.error('Error initializing map:', error);
        if (isMounted) {
          setError('Failed to load map. Please check your internet connection and try again.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    
    // Only initialize if we haven't already
    if (!map) {
      initMap();
    }
    
    // Cleanup function
    return () => {
      isMounted = false;
      if (mapInstance) {
        // Clean up any map listeners
        const google = window.google;
        google.maps.event.clearInstanceListeners(mapInstance);
      }
    };
  }, [radius]);

  // This function is now defined above with more complete error handling

  // Handle radius change
  const handleRadiusChange = useCallback((newRadius: number) => {
    setRadius(newRadius);
    if (map) {
      fetchRestaurants(map, userLocation, newRadius, false);
    }
  }, [map, userLocation, fetchRestaurants]);

  // Set up intersection observer for infinite scroll
  useEffect(() => {
    if (loading || !nextPageToken) return;

    if (observer.current) observer.current.disconnect();

    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && !loadingMore) {
        if (map) {
          fetchRestaurants(map, userLocation, radius, true);
        }
      }
    });

    if (lastRestaurantRef.current) {
      observer.current.observe(lastRestaurantRef.current);
    }

    return () => {
      if (observer.current) observer.current.disconnect();
    };
  }, [loading, loadingMore, nextPageToken, map, userLocation, radius, fetchRestaurants]);

  if (error) {
    return (
      <div className="p-4">
        <div className="text-red-500 text-center p-4 rounded-lg bg-red-50 dark:bg-red-900/20">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">
      {/* Map View (Top 40% of screen) */}
      <div className="h-[40vh] w-full relative">
        <div ref={mapRef} className="h-full w-full" />
        <div className="absolute top-4 right-4 z-10 flex space-x-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="p-2 bg-white dark:bg-gray-800 rounded-full shadow-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-label="Filter restaurants"
          >
            <span className="text-gray-700 dark:text-gray-200">⚙️</span>
          </button>
        </div>
        
        {/* Radius Filter Dropdown */}
        {showFilters && (
          <div className="absolute top-16 right-4 z-10 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 w-48">
            <h3 className="font-medium text-gray-700 dark:text-gray-200 mb-2">Search Radius</h3>
            <div className="space-y-2">
              {RADIUS_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => {
                    handleRadiusChange(option.value);
                    setShowFilters(false);
                  }}
                  className={`w-full text-left px-3 py-1.5 rounded-md text-sm ${
                    radius === option.value
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                      : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Restaurants List (Bottom 60% of screen) */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            {loading || loadingMore ? 'Loading...' : `Restaurants (${restaurants.length})`}
          </h2>
        </div>

        {loading && !loadingMore ? (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : restaurants.length === 0 && !loading ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            No restaurants found. Try adjusting your filters.
          </div>
        ) : (
          <div className="space-y-4">
            {restaurants.map((restaurant, index) => (
              <div 
                key={restaurant.place_id} 
                ref={index === restaurants.length - 1 ? lastRestaurantRef : null}
              >
                <RestaurantCard
                  restaurant={restaurant}
                  onSave={toggleSaveRestaurant}
                  onRemove={toggleSaveRestaurant}
                  isSaved={savedRestaurants.has(restaurant.place_id)}
                  onStartPicnic={handleStartPicnic}
                />
              </div>
            ))}
            
            {loadingMore && (
              <div className="flex justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500"></div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default RestaurantsTab;