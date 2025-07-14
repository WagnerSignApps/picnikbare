import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useFirebase } from '../contexts/FirebaseContext';
import CameraModal from './CameraModal';
import { DocumentData } from 'firebase/firestore';

interface Participant {
  id: string;
  name: string | null;
  photoURL: string | null;
  picnicPhotoURL?: string;
  joinedAt?: any;
}

interface PicnicData extends DocumentData {
  hostName: string;
  restaurantName: string;
  participants?: Participant[];
  updatedAt?: any;
  status?: string;
}

interface JoinPicnicFlowProps {
  picnicId: string;
  onComplete: () => void;
}

const JoinPicnicFlow: React.FC<JoinPicnicFlowProps> = ({ picnicId, onComplete }) => {
  const { currentUser } = useAuth();
  const firebase = useFirebase();
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [picnicData, setPicnicData] = useState<PicnicData | null>(null);
  
  if (!firebase) {
    throw new Error('Firebase context not available');
  }

  // Load picnic data when component mounts
  useEffect(() => {
    const loadPicnicData = async () => {
      if (!picnicId) return;
      
      try {
        const data = await firebase.getDocument<PicnicData>('picnics', picnicId);
        if (!data) {
          throw new Error('Picnic not found');
        }
        
        setPicnicData({
          ...data,
          hostName: data.hostName,
          restaurantName: data.restaurantName,
          participants: data.participants || []
        });
        
        // Show camera after a short delay
        setTimeout(() => setShowCamera(true), 500);
      } catch (err) {
        console.error('Error loading picnic:', err);
        setError('Failed to load picnic. It may have been canceled.');
      } finally {
        setIsLoading(false);
      }
    };

    loadPicnicData();
  }, [picnicId, firebase]);

  const handlePhotoTaken = useCallback(async (imageData: string) => {
    if (!currentUser || !picnicData || !picnicId) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      if (!firebase.storage) {
        throw new Error('Firebase Storage is not available');
      }

      // 1. Upload the image to Firebase Storage
      const response = await fetch(imageData);
      const blob = await response.blob();
      const filePath = `picnics/${picnicId}/participants/${currentUser.uid}_${Date.now()}.jpg`;
      const fileRef = firebase.ref(firebase.storage, filePath);
      await firebase.uploadBytes(fileRef, blob);
      
      // 2. Get the download URL
      const photoURL = await firebase.getDownloadURL(fileRef);
      
      // 3. Get current participants or initialize empty array
      const currentPicnic = await firebase.getDocument<PicnicData>('picnics', picnicId);
      const currentParticipants = currentPicnic?.participants || [];
      
      // 4. Check if user is already a participant
      const existingParticipantIndex = currentParticipants.findIndex((p: Participant) => p.id === currentUser.uid);
      
      // 5. Create participant data
      const participantData: Participant = {
        id: currentUser.uid,
        name: currentUser.displayName || 'Friend',
        photoURL: currentUser.photoURL || '',
        picnicPhotoURL: photoURL,
        joinedAt: firebase.serverTimestamp()
      };
      
      // 6. Update participants array
      const updatedParticipants = [...currentParticipants];
      if (existingParticipantIndex >= 0) {
        updatedParticipants[existingParticipantIndex] = participantData;
      } else {
        updatedParticipants.push(participantData);
      }
      
      // 7. Update the picnic document in Firestore
      await firebase.updateDocument('picnics', picnicId, {
        participants: updatedParticipants,
        updatedAt: firebase.serverTimestamp()
      });
      
      // 8. Complete the flow
      onComplete();
      
    } catch (err) {
      console.error('Error joining picnic:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to join picnic';
      setError(`Error: ${errorMessage}. Please try again.`);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser, picnicId, picnicData, onComplete, firebase]);

  if (isLoading && !showCamera) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 text-red-700 rounded-lg">
        <p>{error}</p>
        <button 
          onClick={onComplete}
          className="mt-4 px-4 py-2 bg-red-100 hover:bg-red-200 rounded-md"
        >
          Close
        </button>
      </div>
    );
  }

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">
        Join {picnicData?.hostName}'s Picnic at {picnicData?.restaurantName}
      </h2>
      
      <p className="mb-4">Take a selfie to join the picnic!</p>
      
      <div className="relative aspect-square max-w-md mx-auto">
        <CameraModal
          isOpen={showCamera}
          onClose={() => {}}
          onPhotoTaken={handlePhotoTaken}
          isLoading={isLoading}
          restaurantName={picnicData?.restaurantName || 'the picnic'}
        />
      </div>
      
      <div className="mt-4 text-center">
        <button
          onClick={onComplete}
          className="px-4 py-2 text-gray-600 hover:text-gray-800"
          disabled={isLoading}
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

export default JoinPicnicFlow;
