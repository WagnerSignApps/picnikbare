import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from './LoadingSpinner';

interface Props {
  children: React.ReactNode;
}

const ProfileCompleteRoute: React.FC<Props> = ({ children }) => {
  const { currentUser, userData, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Not authenticated: redirect to login
  if (!currentUser) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Authenticated but no username: redirect to set-username
  if (!userData?.username) {
    return <Navigate to="/set-username" state={{ from: location }} replace />;
  }

  // Authenticated and username set: render children
  return <>{children}</>;
};

export default ProfileCompleteRoute;
