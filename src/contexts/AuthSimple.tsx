import { createContext, useContext, useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as fbSignOut,
  User,
} from 'firebase/auth';
import { auth } from '../firebase/config';

interface AuthContextValue {
  currentUser: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);
      console.log('[AuthSimple] onAuthStateChanged', user);
    });
    return unsubscribe;
  }, []);

  const login = (email: string, password: string) => signInWithEmailAndPassword(auth, email, password).then(() => {});
  const register = (email: string, password: string) =>
    createUserWithEmailAndPassword(auth, email, password).then(() => {});
  const logout = () => fbSignOut(auth);

  const value: AuthContextValue = {
    currentUser,
    loading,
    login,
    register,
    logout,
    signIn: login,
    signUp: register,
    signOut: logout
  };
  if (loading) {
  return <div className="flex items-center justify-center h-screen">Loading...</div>;
}
return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;

}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
