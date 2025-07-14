import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter as Router } from 'react-router-dom';

import App from './App';
import './index.css';
import { db } from './firebase/config';
import { generateMockData } from './firebase/db';

// Initialize Firebase
const initializeApp = async () => {
  try {
    // Generate mock data if needed (only in development)
    if (import.meta.env.DEV) {
      await generateMockData();
    }
  } catch (error) {
    console.error('Error initializing app:', error);
  }
};

// Initialize the app
initializeApp();

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(
    <StrictMode>
      <Router>
        
          <App />
        
      </Router>
    </StrictMode>
  );
}