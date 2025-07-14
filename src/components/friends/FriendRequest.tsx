import { useState } from 'react';
import type { FriendRequest as FriendRequestType, User } from '../../firebase/db';
import { respondToFriendRequest } from '../../firebase/db';
import { useAuth } from '../../contexts/AuthContext';
import { Avatar, Button, Card, CardContent, Typography, Box } from '@mui/material';
import { Check, Close } from '@mui/icons-material';

interface FriendRequestProps {
  request: FriendRequestType & { fromUser?: User };
  onRespond: () => void;
}

export const FriendRequest: React.FC<FriendRequestProps> = ({ request, onRespond }) => {
  const { currentUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRespond = async (status: 'accepted' | 'rejected') => {
    if (!currentUser) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      await respondToFriendRequest(request.id, status);
      onRespond();
    } catch (err) {
      console.error('Error responding to friend request:', err);
      setError('Failed to respond to friend request. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!request.fromUser) {
    return null; // Don't render if we don't have the user data
  }

  return (
    <Card variant="outlined" sx={{ mb: 2, width: '100%' }}>
      <CardContent>
        <Box display="flex" alignItems="center" mb={1}>
          <Avatar 
            src={request.fromUser.photoURL || ''} 
            alt={request.fromUser.name}
            sx={{ width: 48, height: 48, mr: 2 }}
          >
            {request.fromUser.name.charAt(0)}
          </Avatar>
          <Box flex={1}>
            <Typography variant="subtitle1">
              {request.fromUser.name}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Wants to be friends
            </Typography>
          </Box>
        </Box>
        
        {error && (
          <Typography color="error" variant="body2" sx={{ mt: 1, mb: 1 }}>
            {error}
          </Typography>
        )}
        
        <Box display="flex" justifyContent="flex-end" mt={1} gap={1}>
          <Button
            variant="outlined"
            color="error"
            size="small"
            startIcon={<Close />}
            onClick={() => handleRespond('rejected')}
            disabled={isLoading}
          >
            Decline
          </Button>
          <Button
            variant="contained"
            color="primary"
            size="small"
            startIcon={<Check />}
            onClick={() => handleRespond('accepted')}
            disabled={isLoading}
          >
            Accept
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
};

export default FriendRequest;
