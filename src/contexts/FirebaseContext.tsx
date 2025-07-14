import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
// Firebase v9+ modular SDK
import { 
  getAuth, 
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  GoogleAuthProvider, 
  FacebookAuthProvider,
  TwitterAuthProvider,
  GithubAuthProvider,
  type User,
  type Auth
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  serverTimestamp,
  Timestamp,
  type Firestore,
  type DocumentData,
  type WhereFilterOp
} from 'firebase/firestore';
import { 
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
  type FirebaseStorage
} from 'firebase/storage';
import { app } from '../firebase/config';

// Initialize Firebase services
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Auth providers
const googleProvider = new GoogleAuthProvider();
const facebookProvider = new FacebookAuthProvider();
const twitterProvider = new TwitterAuthProvider();
const githubProvider = new GithubAuthProvider();

// Type for Firebase user with additional properties
type FirebaseUser = User & {
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  uid: string;
}

interface FirebaseContextType {
  // Firebase services
  auth: Auth;
  googleProvider: GoogleAuthProvider;
  facebookProvider: FacebookAuthProvider;
  twitterProvider: TwitterAuthProvider;
  githubProvider: GithubAuthProvider;
  db: Firestore;
  storage: FirebaseStorage;

  // Firestore methods
  collection: typeof collection;
  doc: typeof doc;
  getDoc: typeof getDoc;
  setDoc: typeof setDoc;
  updateDoc: typeof updateDoc;
  deleteDoc: typeof deleteDoc;
  query: typeof query;
  where: typeof where;
  getDocs: typeof getDocs;
  addDoc: typeof addDoc;
  
  // Timestamp and server timestamp
  serverTimestamp: typeof serverTimestamp;
  Timestamp: typeof Timestamp;
  
  // Storage methods
  ref: typeof ref;
  uploadBytes: typeof uploadBytes;
  getDownloadURL: typeof getDownloadURL;
  
  // Auth state
  currentUser: FirebaseUser | null;
  loading: boolean;
  
  // Auth methods
  signInWithGoogle: () => Promise<void>;
  signInWithFacebook: () => Promise<void>;
  signInWithTwitter: () => Promise<void>;
  signInWithGithub: () => Promise<void>;
  signOut: () => Promise<void>;
  getCurrentUser: () => Promise<User | null>;
  
  // Helper methods
  getDocument: <T extends DocumentData>(collectionPath: string, docId: string) => Promise<T | null>;
  getDocuments: <T extends DocumentData>(
    collectionPath: string, 
    constraints?: Array<[string, WhereFilterOp, unknown]>
  ) => Promise<T[]>;
  addDocument: <T extends DocumentData>(
    collectionPath: string, 
    data: Omit<T, 'id' | 'createdAt' | 'updatedAt'> & { [key: string]: unknown }
  ) => Promise<string>;
  updateDocument: <T extends DocumentData>(
    collectionPath: string, 
    docId: string, 
    data: Partial<T> & { [key: string]: unknown }
  ) => Promise<void>;
  deleteDocument: (collectionPath: string, docId: string) => Promise<void>;
  uploadFile: (path: string, file: File) => Promise<string>;
}

const FirebaseContext = createContext<FirebaseContextType | undefined>(undefined);

interface FirebaseProviderProps {
  children: ReactNode;
}

export const FirebaseProvider: React.FC<FirebaseProviderProps> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Set up auth state listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      // Cast the user to FirebaseUser since we know it will have these properties
      setCurrentUser(user as FirebaseUser);
      setLoading(false);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Sign in with Google
  const signInWithGoogle = async (): Promise<void> => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error('Error signing in with Google:', error);
      throw error;
    }
  };

  // Sign in with Facebook
  const signInWithFacebook = async (): Promise<void> => {
    try {
      const provider = new FacebookAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error('Error signing in with Facebook:', error);
      throw error; // Re-throw to allow error handling by the caller
    }
  };

  // Sign in with Twitter
  const signInWithTwitter = async (): Promise<void> => {
    try {
      const provider = new TwitterAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error('Error signing in with Twitter:', error);
      throw error; // Re-throw to allow error handling by the caller
    }
  };

  // Sign in with GitHub
  const signInWithGithub = async (): Promise<void> => {
    try {
      const provider = new GithubAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error('Error signing in with GitHub:', error);
      throw error; // Re-throw to allow error handling by the caller
    }
  };

  // Sign out with error handling
  const signOut = async (): Promise<void> => {
    try {
      await firebaseSignOut(auth);
    } catch (error) {
      console.error('Error signing out:', error);
      throw error; // Re-throw to allow error handling by the caller
    }
  };

  // Get current user with proper typing and error handling
  const getCurrentUser = async (): Promise<User | null> => {
    try {
      return new Promise<User | null>((resolve, reject) => {
        const unsubscribe = onAuthStateChanged(
          auth,
          (user) => {
            unsubscribe();
            resolve(user);
          },
          (error) => {
            unsubscribe();
            console.error('Error getting current user:', error);
            reject(error);
          }
        );
      });
    } catch (error) {
      console.error('Error in getCurrentUser:', error);
      throw error;
    }
  };

  // Get document from Firestore with proper type safety
  const getDocument = async <T extends DocumentData>(collectionPath: string, docId: string): Promise<T | null> => {
    try {
      const docRef = doc(db, collectionPath, docId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as unknown as T;
      } else {
        return null;
      }
    } catch (error) {
      console.error('Error getting document:', error);
      return null;
    }
  };

  // Get documents from Firestore with optional query constraints and proper type safety
  const getDocuments = async <T extends DocumentData>(
    collectionPath: string, 
    constraints: Array<[string, WhereFilterOp, unknown]> = []
  ): Promise<T[]> => {
    try {
      let q = query(collection(db, collectionPath));
      
      if (constraints) {
        constraints.forEach(([field, operator, value]) => {
          q = query(q, where(field, operator, value));
        });
      }
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as unknown as T));
    } catch (error) {
      console.error('Error getting documents:', error);
      return [];
    }
  };

  // Add document to Firestore with proper type safety
  const addDocument = async <T extends DocumentData>(
    collectionPath: string,
    data: Omit<T, 'id' | 'createdAt' | 'updatedAt'> & { [key: string]: unknown }
  ): Promise<string> => {
    try {
      const docRef = await addDoc(collection(db, collectionPath), {
        ...data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return docRef.id;
    } catch (error) {
      console.error('Error adding document:', error);
      throw error;
    }
  };

  // Update document in Firestore with proper type safety
  const updateDocument = async <T extends DocumentData>(
    collectionPath: string,
    docId: string,
    data: Partial<T> & { [key: string]: unknown }
  ): Promise<void> => {
    try {
      const docRef = doc(db, collectionPath, docId);
      await updateDoc(docRef, {
        ...data,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating document:', error);
      throw error;
    }
  };

  // Delete document from Firestore with error handling
  const deleteDocument = async (
    collectionPath: string,
    docId: string
  ): Promise<void> => {
    try {
      const docRef = doc(db, collectionPath, docId);
      await deleteDoc(docRef);
    } catch (error) {
      console.error('Error deleting document:', error);
      throw error;
    }
  };

  // Upload file to Firebase Storage with error handling
  const uploadFile = async (path: string, file: File): Promise<string> => {
    try {
      const storageRef = ref(storage, path);
      const snapshot = await uploadBytes(storageRef, file);
      return await getDownloadURL(snapshot.ref);
    } catch (error) {
      console.error('Error uploading file:', error);
      throw error;
    }
  };

  const value: FirebaseContextType = {
    // Firebase services
    auth,
    googleProvider,
    facebookProvider,
    twitterProvider,
    githubProvider,
    db,
    storage,
    
    // Firestore methods
    collection,
    doc,
    getDoc,
    setDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    getDocs,
    addDoc,
    
    // Timestamp
    serverTimestamp,
    Timestamp,
    
    // Storage methods
    ref,
    uploadBytes,
    getDownloadURL,
    
    // Auth state
    currentUser,
    loading,
    
    // Auth methods
    signInWithGoogle,
    signInWithFacebook,
    signInWithTwitter,
    signInWithGithub,
    signOut,
    getCurrentUser,
    
    // Helper methods
    getDocument,
    getDocuments,
    addDocument,
    updateDocument,
    deleteDocument,
    uploadFile
  } as const;

  return (
    <FirebaseContext.Provider value={value}>
      {!loading && children}
    </FirebaseContext.Provider>
  );
};

export const useFirebase = (): FirebaseContextType => {
  const context = useContext(FirebaseContext);
  if (context === undefined) {
    throw new Error('useFirebase must be used within a FirebaseProvider');
  }
  return context;
};

export default FirebaseContext;
