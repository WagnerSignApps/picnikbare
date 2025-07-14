import { Loader } from '@googlemaps/js-api-loader';

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

if (!GOOGLE_MAPS_API_KEY) {
  console.warn('Google Maps API key is not set. Please set VITE_GOOGLE_MAPS_API_KEY in your .env file');
}

const loader = new Loader({
  apiKey: GOOGLE_MAPS_API_KEY || '',
  version: "weekly",
  libraries: ["places", "geometry"]
});

export interface Photo {
  photo_reference: string;
  height: number;
  width: number;
  html_attributions: string[];
}

export interface Restaurant {
  id?: string;
  place_id?: string;
  name: string;
  address?: string;
  rating?: number;
  user_ratings_total?: number;
  price_level?: number;
  types?: string[];
  photos?: Photo[];
  geometry?: {
    location: {
      lat: number;
      lng: number;
    };
  };
  opening_hours?: {
    open_now: boolean;
  };
  vicinity?: string;
  formatted_address?: string;
  icon?: string;
  reference?: string;
  scope?: string;
  plus_code?: {
    compound_code: string;
    global_code: string;
  };
  business_status?: string;
  formatted_phone_number?: string;
  international_phone_number?: string;
  website?: string;
  url?: string;
  utc_offset?: number;
}

export const getNearbyRestaurants = async (lat: number, lng: number, radius = 1609): Promise<Restaurant[]> => {
  try {
    await loader.load();
    
    if (!window.google?.maps?.places || !window.google.maps.geometry) {
      throw new Error('Google Maps libraries failed to load');
    }
    
    const { Map } = (await window.google.maps.importLibrary('maps')) as google.maps.MapsLibrary;
    const { PlacesService } = (await window.google.maps.importLibrary('places')) as google.maps.PlacesLibrary;
    
    const map = new Map(document.createElement('div'));
    const service = new PlacesService(map);
    
    return new Promise((resolve, reject) => {
      service.nearbySearch(
        {
          location: { lat, lng },
          radius,
          type: 'restaurant',
          keyword: 'food',
        },
        (
          results: google.maps.places.PlaceResult[] | null,
          status: google.maps.places.PlacesServiceStatus,
          _pagination: google.maps.places.PlaceSearchPagination | null
        ) => {
          if (status === window.google.maps.places.PlacesServiceStatus.OK && results) {
            const restaurants = results.map(place => {
              const photoUrl = place.photos?.[0]?.getUrl({
                maxWidth: 400,
                maxHeight: 300,
              });
              
              // Calculate distance in miles if available
              let distance = 'N/A';
              if (place.geometry?.location && window.google.maps.geometry) {
                try {
                  const userLocation = new window.google.maps.LatLng(lat, lng);
                  const placeLocation = place.geometry.location;
                  const distanceInMeters = window.google.maps.geometry.spherical.computeDistanceBetween(
                    userLocation,
                    placeLocation
                  );
                  distance = `${(distanceInMeters * 0.000621371).toFixed(1)} miles`;
                } catch (err) {
                  console.warn('Error calculating distance:', err);
                }
              }
              
              return {
                id: place.place_id || Math.random().toString(36).substr(2, 9),
                name: place.name || 'Unnamed Restaurant',
                address: place.vicinity || place.formatted_address || '',
                rating: place.rating || 0,
                userRatingsTotal: place.user_ratings_total || 0,
                priceLevel: place.price_level,
                types: place.types,
                photoUrl,
                distance,
                location: {
                  lat: place.geometry?.location?.lat() || 0,
                  lng: place.geometry?.location?.lng() || 0,
                },
              };
            });
            
            resolve(restaurants);
          } else {
            reject(new Error(`Error fetching restaurants: ${status}`));
          }
        }
      );
    });
  } catch (error) {
    console.error('Error initializing Google Maps:', error);
    throw error;
  }
};
