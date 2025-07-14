import { useEffect, useState } from 'react';
import { 
  User as FirebaseUser,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  updateProfile,
  updateEmail as updateFirebaseEmail,
  updatePassword as updateFirebasePassword,
} from 'firebase/auth';
import { auth } from '../firebase/config';
import { createUser, getUser } from '../firebase/db';

export function useAuth() {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Sign in with email and password
  const signIn = async (email: string, password: string) => {
    const { user } = await signInWithEmailAndPassword(auth, email, password);
    return user;
  };

  // Sign up with email, password, and name
  const signUp = async (email: string, password: string, name: string) => {
    const { user } = await createUserWithEmailAndPassword(auth, email, password);
    
    // Update user profile with display name
    await updateProfile(user, { displayName: name });
    
    // Create user document in Firestore
    const userData = {
      name,
      email,
      photoURL: user.photoURL || '',
      friends: [],
      createdAt: new Date(),
    };
    
    await createUser(userData);
    return user;
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
  };

  // Update photo URL
  const updatePhotoURL = async (photoURL: string) => {
    if (!currentUser) throw new Error('No user is signed in');
    await updateProfile(currentUser, { photoURL });
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

  return {
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
}

export default useAuth;
