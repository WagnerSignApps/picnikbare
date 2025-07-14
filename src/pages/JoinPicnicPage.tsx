import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState, useCallback } from 'react';
import { useFirebase } from '../contexts/FirebaseContext';
import JoinPicnicFlow from '../components/JoinPicnicFlow';
import { DocumentData } from 'firebase/firestore';

const JoinPicnicPage = () => {
  const { picnicId } = useParams<{ picnicId: string }>();
  const navigate = useNavigate();
  const firebase = useFirebase();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Verify the picnic exists when the component mounts
  useEffect(() => {
    const verifyPicnic = async () => {
      if (!picnicId) {
        setError('Invalid picnic link');
        setIsLoading(false);
        return;
      }

      try {
        const data = await firebase.getDocument<DocumentData>('picnics', picnicId);
        if (!data) {
          throw new Error('Picnic not found');
        }
        
        // Check if picnic is still active
        if (data.status !== 'active') {
          throw new Error('This picnic is no longer active');
        }
        
        setError(null);
      } catch (err) {
        console.error('Error verifying picnic:', err);
        const errorMessage = err instanceof Error ? err.message : 'Failed to load picnic';
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    verifyPicnic();
  }, [picnicId, firebase]);

  const handleComplete = useCallback(() => {
    // Navigate to home after joining
    navigate('/');
  }, [navigate]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="bg-red-50 text-red-700 p-4 rounded-lg max-w-md w-full text-center">
          <h2 className="text-xl font-bold mb-2">Cannot Join Picnic</h2>
          <p className="mb-4">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-red-100 hover:bg-red-200 rounded-md text-red-700"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  if (!picnicId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Invalid picnic link</p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto p-4">
      <JoinPicnicFlow 
        picnicId={picnicId} 
        onComplete={handleComplete} 
      />
    </div>
  );
};

export default JoinPicnicPage;
