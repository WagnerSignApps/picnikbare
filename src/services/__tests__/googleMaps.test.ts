import { getNearbyRestaurants } from '../googleMaps';

describe('Google Maps Service', () => {
  // Mock the Google Maps API
  beforeAll(() => {
    // Mock the Google Maps API
    (window as any).google = {
      maps: {
        places: {
          PlacesServiceStatus: {
            OK: 'OK',
            ZERO_RESULTS: 'ZERO_RESULTS',
            ERROR: 'ERROR',
          },
        },
        Map: jest.fn(),
        Marker: jest.fn(),
        LatLng: jest.fn(),
        LatLngBounds: jest.fn(),
        event: {
          clearInstanceListeners: jest.fn(),
        },
      },
    };
  });

  it('should be defined', () => {
    expect(getNearbyRestaurants).toBeDefined();
  });
});
