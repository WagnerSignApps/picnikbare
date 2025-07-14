// Path alias declarations
declare module '@components/*';
declare module '@pages/*';
declare module '@contexts/*';
declare module '@hooks/*';
declare module '@utils/*';
declare module '@assets/*';
declare module '@types/*';

// Google Maps
declare const google: typeof google;

// Add type declarations for other libraries
interface Window {
  google: typeof google;
}
