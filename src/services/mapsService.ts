// Google Maps TypeScript type definitions
// Using @types/google.maps for type definitions

interface PlacePhoto {
  height: number;
  width: number;
  html_attributions: string[];
  photo_reference: string;
  getUrl: (options: { maxWidth: number; maxHeight?: number }) => string;
}

export interface PlaceResult {
  name: string;
  formatted_address: string;
  photos?: PlacePhoto[];
  rating?: number;
  user_ratings_total?: number;
  geometry: {
    location: {
      lat: () => number;
      lng: () => number;
    };
  };
  place_id: string;
  vicinity?: string;
}

interface MapsService {
  initMap: (elementIdOrElement: string | HTMLElement, options: google.maps.MapOptions) => Promise<google.maps.Map>;
  searchPlaces: (request: google.maps.places.PlaceSearchRequest) => Promise<PlaceResult[]>;
  getCurrentPosition: () => Promise<GeolocationPosition>;
  getPlaceDetails: (placeId: string) => Promise<google.maps.places.PlaceResult | null>;
  isLoaded: () => boolean;
}

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;


const loadGoogleMaps = (): Promise<typeof google.maps> => {
  return new Promise((resolve, reject) => {
    // Check if already loaded
    if (window.google?.maps) {
      resolve(window.google.maps);
      return;
    }

    // Check if script is already being loaded
    const existingScript = document.querySelector(
      'script[src^="https://maps.googleapis.com/maps/api/js"]'
    );
    
    if (existingScript) {
      // If script is already being loaded, wait for it
      existingScript.addEventListener('load', () => {
        if (window.google?.maps) {
          resolve(window.google.maps);
        } else {
          reject(new Error('Google Maps API not loaded correctly'));
        }
      });
      return;
    }

    // Create and load the script with async and defer
    const script = document.createElement('script');
    const callbackName = `gmapsCallback_${Date.now()}`;
    
    // Assign the callback dynamically
    (window as any)[callbackName] = () => {
      if ((window as any).google?.maps) {
        resolve((window as any).google.maps);
      } else {
        reject(new Error('Google Maps API not loaded correctly'));
      }
      // Clean up
      delete (window as any)[callbackName];
    };

    // Set up error handling
    script.onerror = () => {
      delete (window as any)[callbackName];
      reject(new Error('Failed to load Google Maps API'));
    };

    // Set the script source with the callback
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places&callback=${callbackName}`;
    script.async = true;
    script.defer = true;
    
    // Add the script to the document
    document.head.appendChild(script);
  });
};

let mapsApi: typeof google.maps | null = null;
let placesService: google.maps.places.PlacesService | null = null;

const initGoogleMaps = async (): Promise<typeof google.maps> => {
  if (!mapsApi) {
    try {
      mapsApi = await loadGoogleMaps();
      // Initialize places service
      if (!placesService && mapsApi) {
        const mapElement = document.createElement('div');
        mapElement.style.display = 'none';
        document.body.appendChild(mapElement);
        const map = new mapsApi.Map(mapElement, {
          center: { lat: 0, lng: 0 },
          zoom: 15,
        });
        placesService = new mapsApi.places.PlacesService(map);
      }
    } catch (error) {
      console.error('Failed to initialize Google Maps:', error);
      throw error;
    }
  }
  return mapsApi;
};

const mapsService: MapsService = {
  initMap: async (elementIdOrElement: string | HTMLElement, options: google.maps.MapOptions): Promise<google.maps.Map> => {
    try {
      const googleMaps = await initGoogleMaps();
      let mapElement: HTMLElement | null;
      
      if (typeof elementIdOrElement === 'string') {
        mapElement = document.getElementById(elementIdOrElement);
        if (!mapElement) {
          throw new Error(`Map element with ID '${elementIdOrElement}' not found`);
        }
      } else {
        mapElement = elementIdOrElement;
      }
      
      const map = new googleMaps.Map(mapElement, options);
      placesService = new googleMaps.places.PlacesService(map);
      return map;
    } catch (error) {
      console.error('Error initializing Google Maps:', error);
      throw error;
    }
  },

  isLoaded: (): boolean => {
    return window.google?.maps !== undefined;
  },

  searchPlaces: async (request: google.maps.places.PlaceSearchRequest): Promise<PlaceResult[]> => {
    if (!placesService) {
      throw new Error('PlacesService not initialized. Call initMap first.');
    }

    try {
      await initGoogleMaps(); // Ensure maps and places are initialized
      
      return new Promise((resolve, reject) => {
        if (!placesService) {
          reject(new Error('PlacesService not available'));
          return;
        }

        placesService.nearbySearch(
          request, 
          (results: google.maps.places.PlaceResult[] | null, status: google.maps.places.PlacesServiceStatus) => {
            if (status === google.maps.places.PlacesServiceStatus.OK && results) {
              const places = results.map(place => ({
                name: place.name || 'Unnamed Place',
                formatted_address: place.formatted_address || place.vicinity || 'Address not available',
                photos: place.photos?.map((photo: any) => ({
                  height: photo.height,
                  width: photo.width,
                  html_attributions: photo.html_attributions,
                  photo_reference: photo.photo_reference,
                  getUrl: (options: { maxWidth: number; maxHeight?: number }) => {
                    if (!photo.photo_reference) return '';
                    let url = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${options.maxWidth}`;
                    if (options.maxHeight) url += `&maxheight=${options.maxHeight}`;
                    url += `&photoreference=${photo.photo_reference}&key=${GOOGLE_MAPS_API_KEY}`;
                    return url;
                  }
                })) || [],
                rating: place.rating,
                user_ratings_total: place.user_ratings_total,
                geometry: {
                  location: {
                    lat: () => place.geometry?.location?.lat() || 0,
                    lng: () => place.geometry?.location?.lng() || 0
                  }
                },
                place_id: place.place_id || '',
                vicinity: place.vicinity || place.formatted_address || ''
              }));
              resolve(places);
            } else {
              console.error('Places request failed with status:', status);
              reject(new Error(`Places request failed with status: ${status}`));
            }
          }
        );
      });
    } catch (error) {
      console.error('Error in searchPlaces:', error);
      throw error;
    }
  },

  getCurrentPosition: (): Promise<GeolocationPosition> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by your browser'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => resolve(position),
        (error) => {
          console.error('Error getting location:', error);
          reject(error);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    });
  },

  getPlaceDetails: (placeId: string): Promise<google.maps.places.PlaceResult | null> => {
    return new Promise((resolve, reject) => {
      if (!placesService) {
        reject(new Error('PlacesService not initialized. Call initMap first.'));
        return;
      }

      placesService.getDetails(
        { placeId }, 
        (place: google.maps.places.PlaceResult | null, status: google.maps.places.PlacesServiceStatus) => {
          if (status === google.maps.places.PlacesServiceStatus.OK) {
            resolve(place);
          } else {
            reject(new Error(`Place details request failed with status: ${status}`));
          }
        }
      );
    });
  }
};

export default mapsService;
