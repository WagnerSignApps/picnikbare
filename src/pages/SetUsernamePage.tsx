import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useFirebase } from '../contexts/FirebaseContext';

const SetUsernamePage: React.FC = () => {
  const { currentUser } = useAuth();
  const { updateDocument } = useFirebase();
  const [username, setUsername] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!currentUser?.uid) return;
    if (!username.trim()) {
      setError('Username cannot be empty.');
      return;
    }
    setLoading(true);
    try {
      // Check if username is already taken (by querying Firestore)
      // This assumes you have a users collection with a username field
      // You may want to implement this check more robustly in production
      const res = await fetch(`/api/check-username?username=${encodeURIComponent(username)}`);
      const { exists } = await res.json();
      if (exists) {
        setError('Username is already taken.');
        setLoading(false);
        return;
      }
      await updateDocument('users', currentUser.uid, { username });
      navigate('/'); // Redirect to main app
    } catch (err: any) {
      setError('Failed to set username. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md w-full max-w-md">
        <h2 className="text-2xl font-semibold mb-4 text-center">Set Your Username</h2>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            className="w-full px-4 py-2 mb-3 rounded border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-400"
            placeholder="Choose a unique username"
            value={username}
            onChange={e => setUsername(e.target.value)}
            disabled={loading}
            autoFocus
          />
          {error && <div className="text-red-500 mb-2 text-sm">{error}</div>}
          <button
            type="submit"
            className="w-full bg-primary-400 hover:bg-primary-500 text-white font-semibold py-2 px-4 rounded disabled:opacity-50"
            disabled={loading}
          >
            {loading ? 'Saving...' : 'Set Username'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default SetUsernamePage;
