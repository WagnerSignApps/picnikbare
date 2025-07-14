import { Routes, Route, useLocation, Link, Navigate, Outlet } from 'react-router-dom';
import { HomeIcon, UserGroupIcon, UserIcon, MapPinIcon } from '@heroicons/react/24/outline';
import { HomeIcon as HomeIconSolid, UserGroupIcon as UserGroupIconSolid, UserIcon as UserIconSolid, MapPinIcon as MapPinIconSolid } from '@heroicons/react/24/solid';
import { AuthProvider } from './contexts/AuthContext';
import { FirebaseProvider } from './contexts/FirebaseContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { useAuth } from './contexts/AuthContext';
import { NotificationBell } from './components/notifications/NotificationBell';
import { NotificationProvider } from './contexts/NotificationContext';
import { FriendsTab } from './pages/FriendsTab';
import RestaurantsTab from './pages/RestaurantsTab';
import { StartPicnikTab } from './pages/StartPicnikTab';
import { ProfileTab } from './pages/ProfileTab';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import FriendsPage from './pages/FriendsPage';
import PrivateRoute from './components/PrivateRoute';
import JoinPicnicPage from './pages/JoinPicnicPage';

// Main app layout with header and tab bar
function AppLayout() {
  return (
    <div className="flex flex-col min-h-screen bg-white dark:bg-gray-900">
      <Header />
      <main className="flex-1 overflow-y-auto pb-16">
        <Outlet />
      </main>
      <TabBar />
    </div>
  );
}

// Public layout for auth pages
function AuthLayout() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Outlet />
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <FirebaseProvider>
        <AuthProvider>
          <NotificationProvider>
          <Routes>
            {/* Public routes */}
            <Route element={<AuthLayout />}>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />
            </Route>
            
            {/* Protected routes */}
            <Route element={<AppLayout />}>
              <Route path="/join-picnic/:picnicId" element={
                <PrivateRoute>
                  <JoinPicnicPage />
                </PrivateRoute>
              } />
              <Route 
                element={
                  <PrivateRoute>
                    <Outlet />
                  </PrivateRoute>
                }
              >
                <Route index element={<StartPicnikTab />} />
                <Route path="/start-picnic" element={<StartPicnikTab />} />
                <Route path="/friends" element={<FriendsTab />} />
                <Route path="/find-friends" element={<FriendsPage />} />
                <Route path="/restaurants" element={<RestaurantsTab />} />
                <Route path="/profile" element={<ProfileTab />} />
              </Route>
            </Route>
            
            {/* Redirect to home if no match */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          </NotificationProvider>
        </AuthProvider>
      </FirebaseProvider>
    </ThemeProvider>
  );
}

function Header() {
  const { currentUser } = useAuth();
  
  return (
    <header className="bg-white dark:bg-gray-800 shadow-sm z-10 sticky top-0">
      <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between">
        <h1 className="text-xl font-bold text-red-500">Picnik</h1>
        {currentUser && (
          <div className="flex items-center space-x-2">
            <NotificationBell />
          </div>
        )}
      </div>
    </header>
  );
}

function TabBar() {
  const location = useLocation();
  
  const tabs = [
    { name: 'Home', href: '/', icon: HomeIcon, activeIcon: HomeIconSolid },
    { name: 'Restaurants', href: '/restaurants', icon: MapPinIcon, activeIcon: MapPinIconSolid },
    { name: 'Friends', href: '/friends', icon: UserGroupIcon, activeIcon: UserGroupIconSolid },
    { name: 'Profile', href: '/profile', icon: UserIcon, activeIcon: UserIconSolid },
  ];

  return (
    <nav className={`fixed bottom-0 w-full max-w-md bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 z-10`}>
      <div className="flex justify-around h-16">
        {tabs.map((tab) => {
          const isActive = location.pathname === tab.href;
          const Icon = isActive ? tab.activeIcon : tab.icon;
          
          return (
            <Link
              key={tab.name}
              to={tab.href}
              className={`flex-1 flex flex-col items-center justify-center text-sm font-medium ${
                isActive
                  ? 'text-primary-400'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            >
              <Icon className="h-6 w-6" aria-hidden="true" />
              <span className="mt-1 text-xs">{tab.name}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export default App;
