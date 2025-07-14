import { useRef, useEffect, useState } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface CameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPhotoTaken: (imageData: string) => void;
  isLoading?: boolean;
  restaurantName?: string;
}

const CameraModal: React.FC<CameraModalProps> = ({ 
  isOpen, 
  onClose, 
  onPhotoTaken, 
  isLoading = false, 
  restaurantName = 'this location' 
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<boolean>(false);

  // Function to create a black image as fallback
  const createBlackImage = (): string => {
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 480;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = 'black';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      // Add some text to indicate it's a fallback
      ctx.fillStyle = 'white';
      ctx.font = '20px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('Camera not available', canvas.width / 2, canvas.height / 2);
    }
    return canvas.toDataURL('image/jpeg');
  };

  // Start the camera when the modal opens or when the video ref changes
  useEffect(() => {
    if (!isOpen) return;
    
    console.log('Starting camera...');
    let isMounted = true;
    let mediaStream: MediaStream | null = null;
    let retryCount = 0;
    const MAX_RETRIES = 2; // Reduced retries since we have a fallback

    const startCamera = async () => {
      try {
        // Skip if already has stream
        if (stream) return;

        // Get the video element first
        const videoElement = videoRef.current;
        if (!videoElement) {
          // If video element is not found, retry a few times with delay
          if (retryCount < MAX_RETRIES) {
            retryCount++;
            console.log(`Video element not found, retrying (${retryCount}/${MAX_RETRIES})...`);
            await new Promise(resolve => setTimeout(resolve, 300));
            return startCamera();
          }
          // Instead of throwing, set camera error and provide fallback
          console.warn('Camera not available, using fallback');
          setCameraError(true);
          return;
        }

        console.log('Requesting camera access...');
        const constraints: MediaStreamConstraints = {
          video: { 
            facingMode: 'user',
            width: { ideal: 1280 },
            height: { ideal: 720 }
          },
          audio: false,
        };
        
        // Request camera access
        mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
        
        // Check if component is still mounted
        if (!isMounted) {
          mediaStream.getTracks().forEach(track => track.stop());
          return;
        }
        
        console.log('Got media stream:', mediaStream);
        
        // Set the stream to state
        setStream(mediaStream);
        
        // Set the video source
        videoElement.srcObject = mediaStream;
        
        // Handle video play
        const handlePlay = async () => {
          try {
            await videoElement.play();
            console.log('Video playback started');
          } catch (err) {
            console.error('Error playing video:', err);
            setError(`Error starting camera: ${err instanceof Error ? err.message : 'Unknown error'}`);
          }
        };
        
        // Try to play the video
        if (videoElement.readyState >= 2) { // HAVE_CURRENT_DATA
          handlePlay();
        } else {
          videoElement.onloadedmetadata = handlePlay;
        }
        
        // Cleanup function for this effect
        return () => {
          videoElement.onloadedmetadata = null;
        };
      } catch (err) {
        if (!isMounted) return;
        
        const error = err as Error;
        console.warn('Error accessing camera, using fallback:', error);
        setCameraError(true);
        // Don't show error to user since we have a fallback
      }
    };

    // Add a small delay to ensure the component is fully mounted
    const timer = setTimeout(() => {
      startCamera();
    }, 100);

    // Cleanup function to stop the camera when the modal closes or unmounts
    return () => {
      clearTimeout(timer);
      console.log('Cleaning up camera...');
      isMounted = false;
      
      // Stop all tracks in the current stream
      const stopAllTracks = (s: MediaStream | null) => {
        if (!s) return;
        s.getTracks().forEach(track => {
          console.log('Stopping track:', track.kind);
          track.stop();
        });
      };
      
      // Stop any pending media stream
      if (mediaStream) {
        console.log('Stopping media stream tracks');
        stopAllTracks(mediaStream);
      }
      
      // Stop any existing stream from state
      if (stream) {
        console.log('Stopping stream from state');
        stopAllTracks(stream);
        setStream(null);
      }
      
      // Clear video source
      const videoElement = videoRef.current;
      if (videoElement) {
        videoElement.pause();
        videoElement.srcObject = null;
        videoElement.onloadedmetadata = null;
      }
    };
  }, [isOpen]); // Remove stream from dependencies to prevent double initialization

  const captureImage = () => {
    if (cameraError) {
      // If camera failed, create a black image
      const blackImage = createBlackImage();
      setCapturedImage(blackImage);
      return;
    }

    if (!videoRef.current || !canvasRef.current) {
      const blackImage = createBlackImage();
      setCapturedImage(blackImage);
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) {
      const blackImage = createBlackImage();
      setCapturedImage(blackImage);
      return;
    }

    try {
      // Set canvas dimensions
      const width = video.videoWidth || 640;
      const height = video.videoHeight || 480;
      canvas.width = width;
      canvas.height = height;

      // Draw video frame to canvas
      context.drawImage(video, 0, 0, width, height);

      // Convert canvas to data URL and set as captured image
      const imageData = canvas.toDataURL('image/jpeg');
      setCapturedImage(imageData);
    } catch (err) {
      console.error('Error capturing image, using fallback:', err);
      const blackImage = createBlackImage();
      setCapturedImage(blackImage);
    }
  };

  const retakeImage = () => {
    setCapturedImage(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              {isLoading ? 'Saving your picnic...' : `Start a picnic at ${restaurantName}`}
            </h3>
            {!isLoading && (
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
                disabled={isLoading}
              >
                <span className="sr-only">Close</span>
                <XMarkIcon className="h-6 w-6" />
              </button>
            )}
          </div>
        </div>

        <div className="p-4">
          {isLoading ? (
            <div className="h-64 flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-700 rounded-lg">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
              <p className="text-gray-700 dark:text-gray-300">Creating your picnic...</p>
            </div>
          ) : (
            <>
              <div className="relative bg-black rounded-lg overflow-hidden mb-4" style={{ height: '400px' }}>
                {!capturedImage ? (
                  !stream ? (
                    <div className="h-full flex items-center justify-center bg-gray-200 dark:bg-gray-700">
                      <p className="text-gray-500 dark:text-gray-400">Loading camera...</p>
                    </div>
                  ) : (
                    <div className="relative h-full w-full flex items-center justify-center bg-black">
                      {cameraError ? (
                        <div className="h-full w-full flex items-center justify-center bg-black">
                          <div className="text-white text-center p-4">
                            <p>Camera not available</p>
                            <p className="text-sm opacity-75">A black image will be used</p>
                          </div>
                        </div>
                      ) : (
                        <video 
                          ref={videoRef}
                          autoPlay
                          playsInline
                          muted
                          className="h-full w-auto max-w-full object-contain"
                          style={{ transform: 'scaleX(-1)' }} // Mirror the video
                        />
                      )}
                      <div className="absolute bottom-4 left-0 right-0 flex justify-center">
                        <div className="bg-black bg-opacity-50 text-white px-4 py-2 rounded-full text-sm">
                          Position your face in the frame
                        </div>
                      </div>
                    </div>
                  )
                ) : (
                  <div className="relative h-full w-full">
                    <img 
                      src={capturedImage} 
                      alt="Captured" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
              </div>

              <div className="flex justify-center space-x-4">
                {!capturedImage ? (
                  <button
                    onClick={captureImage}
                    disabled={isLoading}
                    className={`px-4 py-2 bg-blue-500 text-white rounded-lg ${
                      isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-600'
                    }`}
                  >
                    {cameraError ? 'Use Fallback Image' : 'Take Photo'}
                  </button>
                ) : (
                  <div className="flex space-x-4">
                    <button
                      onClick={retakeImage}
                      className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
                      disabled={isLoading}
                    >
                      Retake
                    </button>
                    <button
                      onClick={() => onPhotoTaken(capturedImage)}
                      className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={isLoading}
                    >
                      Use This Photo
                    </button>
                  </div>
                )}
              </div>
              
              {error && (
                <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 text-sm rounded-lg">
                  {error}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default CameraModal;
