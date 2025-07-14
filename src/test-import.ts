import { Restaurant } from './services/googleMaps';

// This is just a test file to verify the import works
const test: Restaurant = {
  id: 'test',
  name: 'Test Restaurant',
  address: '123 Test St',
  rating: 4.5,
  user_ratings_total: 100,
  geometry: {
    location: {
      lat: 40.7128,
      lng: -74.0060
    }
  }
};

console.log(test);
