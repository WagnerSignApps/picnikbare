import React from 'react';
import { AuthProvider as InnerAuthProvider, useAuth as innerUseAuth } from './AuthSimple';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <InnerAuthProvider>{children}</InnerAuthProvider>
);

export const useAuth = innerUseAuth;
