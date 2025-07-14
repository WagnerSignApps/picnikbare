import { createContext, useContext, useEffect, useState } from 'react';
import { 
  type User as FirebaseUser,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  updateProfile,
  updateEmail as updateFirebaseEmail,
  updatePassword as updateFirebasePassword,
  fetchSignInMethodsForEmail,
  // Add back if needed later:
  // reauthenticateWithCredential,
  // EmailAuthProvider,
} from 'firebase/auth';
import { auth } from '../firebase/config';
import { type User, createUser, getUser } from '../firebase/db';

interface AuthContextType {
  currentUser: FirebaseUser | null;
  userData: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateEmail: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  updateDisplayName: (displayName: string) => Promise<void>;
  updatePhotoURL: (photoURL: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userData, setUserData] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Sign in with email and password
  const signIn = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  // Sign up with email, password, and name
  const signUp = async (email: string, password: string, name: string) => {
    try {
      // First, check if the email is already in use
      const methods = await fetchSignInMethodsForEmail(auth, email);
      if (methods && methods.length > 0) {
        throw new Error('This email is already registered. Please sign in or use a different email.');
      }
      
      // Create the user in Firebase Auth
      const { user } = await createUserWithEmailAndPassword(auth, email, password);
      
      // Update user profile with display name
      await updateProfile(user, { displayName: name });
      
      // Create user document in Firestore
      const userData: Omit<User, 'id'> = {
        name,
        email,
        photoURL: user.photoURL || '',
        friends: [],
        createdAt: new Date(),
      };
      
      await createUser(userData);
    } catch (error: any) {
      console.error('Signup error:', error);
      
      // Handle specific error cases
      if (error.code === 'auth/email-already-in-use') {
        throw new Error('This email is already registered. Please sign in or use a different email.');
      } else if (error.code === 'auth/weak-password') {
        throw new Error('Password should be at least 6 characters');
      } else if (error.code === 'auth/invalid-email') {
        throw new Error('Please enter a valid email address');
      } else {
        // For any other errors, use the default message or a generic one
        throw new Error(error.message || 'Failed to create account. Please try again.');
      }
    }
  };

  // Sign out
  const signOut = async () => {
    await firebaseSignOut(auth);
  };

  // Reset password
  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  // Update email
  const updateEmail = async (email: string) => {
    if (!currentUser) throw new Error('No user is signed in');
    await updateFirebaseEmail(currentUser, email);
  };

  // Update password
  const updatePassword = async (password: string) => {
    if (!currentUser) throw new Error('No user is signed in');
    await updateFirebasePassword(currentUser, password);
  };

  // Update display name
  const updateDisplayName = async (displayName: string) => {
    if (!currentUser) throw new Error('No user is signed in');
    await updateProfile(currentUser, { displayName });
    // Update in Firestore if needed
    // ...
  };

  // Update photo URL
  const updatePhotoURL = async (photoURL: string) => {
    if (!currentUser) throw new Error('No user is signed in');
    await updateProfile(currentUser, { photoURL });
    // Update in Firestore if needed
    // ...
  };

  // Set up auth state listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      
      if (user) {
        // Fetch additional user data from Firestore
        const userDoc = await getUser(user.uid);
        setUserData(userDoc);
      } else {
        setUserData(null);
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    userData,
    loading,
    signIn,
    signUp,
    signOut,
    resetPassword,
    updateEmail,
    updatePassword,
    updateDisplayName,
    updatePhotoURL,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

// Custom hook to use the auth context
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
