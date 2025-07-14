import { User as FirebaseUser } from 'firebase/auth';
import { User, Picnic, Vote, Restaurant } from '../firebase/db';

declare global {
  // Extend Window interface if needed
  interface Window {
    // Add any global browser API extensions here
  }

  // Extend Firebase types if needed
  namespace firebase {
    interface User extends FirebaseUser {}
  }
}

// Export types for easier imports
export type { User, Picnic, Vote, Restaurant };
