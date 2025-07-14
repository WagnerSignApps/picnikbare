// This tells TypeScript about the global `google` object
declare const google: typeof globalThis.google;

declare global {
  // This extends the global Window interface to include the Google Maps API
  interface Window {
    google: {
      maps: typeof google.maps;
    };
  }
}
