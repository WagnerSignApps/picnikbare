import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { getFriendsList, sendFriendRequest, type User } from '../../firebase/db';
import { 
  Avatar, 
  Box, 
  Button, 
  Card, 
  CardContent, 
  Divider, 
  List, 
  ListItem, 
  ListItemAvatar, 
  ListItemText, 
  TextField, 
  Typography,
  Snackbar,
  Alert
} from '@mui/material';
import { PersonAdd } from '@mui/icons-material';

interface FriendListProps {
  onFriendSelect?: (friend: User) => void;
  showAddFriend?: boolean;
}

export const FriendList: React.FC<FriendListProps> = ({ 
  onFriendSelect, 
  showAddFriend = true 
}) => {
  const { currentUser } = useAuth();
  const [friends, setFriends] = useState<User[]>([]);
  const [searchEmail, setSearchEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info' | 'warning';
  }>({ open: false, message: '', severity: 'info' });

  // Load friends list
  useEffect(() => {
    const loadFriends = async () => {
      if (!currentUser?.uid) return;
      
      try {
        setIsLoading(true);
        const friendsList = await getFriendsList(currentUser.uid);
        setFriends(friendsList);
      } catch (error) {
        console.error('Error loading friends:', error);
        showSnackbar('Failed to load friends', 'error');
      } finally {
        setIsLoading(false);
      }
    };

    loadFriends();
  }, [currentUser?.uid]);

  const handleAddFriend = async () => {
    if (!currentUser?.uid || !searchEmail.trim()) return;
    
    try {
      setIsLoading(true);
      await sendFriendRequest(currentUser.uid, searchEmail.trim());
      setSearchEmail('');
      showSnackbar('Friend request sent!', 'success');
    } catch (error: any) {
      console.error('Error sending friend request:', error);
      showSnackbar(error.message || 'Failed to send friend request', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const showSnackbar = (message: string, severity: 'success' | 'error' | 'info' | 'warning') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  return (
    <Card variant="outlined" sx={{ height: '100%' }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Friends
        </Typography>
        
        {showAddFriend && (
          <Box mb={2}>
            <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
              <TextField
                fullWidth
                variant="outlined"
                placeholder="Search by email"
                value={searchEmail}
                onChange={(e) => setSearchEmail(e.target.value)}
                sx={{ flex: 1 }}
              />
              <Button 
                variant="contained" 
                color="primary" 
                onClick={handleAddFriend}
                disabled={isLoading}
              >
                Search
              </Button>
            </Box>
          </Box>
        )}
        
        <Divider sx={{ my: 2 }} />
        
        {isLoading && !friends.length ? (
          <Box display="flex" justifyContent="center" p={2}>
            <Typography color="text.secondary">Loading friends...</Typography>
          </Box>
        ) : friends.length === 0 ? (
          <Box textAlign="center" p={2}>
            <Typography color="text.secondary">
              {showAddFriend 
                ? "You don't have any friends yet. Add some!" 
                : "No friends found"}
            </Typography>
          </Box>
        ) : (
          <List>
            {friends.map((friend) => (
              <ListItem 
                key={friend.id}
                onClick={() => onFriendSelect?.(friend)}
                sx={{
                  borderRadius: 1,
                  '&:hover': {
                    backgroundColor: 'action.hover',
                  },
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  py: 2
                }}
              >
                <ListItemAvatar>
                  <Avatar 
                    src={friend.photoURL || ''} 
                    alt={friend.name}
                  />
                </ListItemAvatar>
                <ListItemText 
                  primary={friend.name} 
                  secondary={friend.email} 
                />
                {showAddFriend && (
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<PersonAdd />}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAddFriend();
                    }}
                    disabled={isLoading}
                  >
                    Add
                  </Button>
                )}
              </ListItem>
            ))}
          </List>
        )}
      </CardContent>
      
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={handleCloseSnackbar} 
          severity={snackbar.severity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Card>
  );
};

export default FriendList;
