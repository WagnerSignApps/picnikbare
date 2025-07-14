import { useState, useEffect, useCallback } from 'react';
import { Box, Container, Typography, Tabs, Tab, CircularProgress } from '@mui/material';
import { FriendList } from '../components/friends/FriendList';
import { FriendRequest } from '../components/friends/FriendRequest';
import type { FriendRequest as FriendRequestType } from '../firebase/db';
import { useAuth } from '../contexts/AuthContext';
import { getUserFriendRequests } from '../firebase/db';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`friends-tabpanel-${index}`}
      aria-labelledby={`friends-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `friends-tab-${index}`,
    'aria-controls': `friends-tabpanel-${index}`,
  };
}

export default function FriendsPage() {
  const [activeTab, setActiveTab] = useState(0);
  const [friendRequests, setFriendRequests] = useState<FriendRequestType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { currentUser } = useAuth();

  // Load friend requests
  useEffect(() => {
    const loadFriendRequests = async () => {
      if (!currentUser?.uid) return;
      
      try {
        setIsLoading(true);
        const requests = await getUserFriendRequests(user.uid);
        setFriendRequests(requests);
      } catch (error) {
        console.error('Error loading friend requests:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadFriendRequests();
  }, [user?.uid]);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleRequestResponded = useCallback((requestId: string) => {
    setFriendRequests(prev => prev.filter(req => req.id !== requestId));
  }, []);

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Box mb={4}>
        <Typography variant="h4" component="h1" gutterBottom>
          Friends
        </Typography>
        <Typography color="text.secondary">
          Connect with friends and manage your friend requests
        </Typography>
      </Box>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs 
          value={activeTab} 
          onChange={handleTabChange} 
          aria-label="friends tabs"
          variant="fullWidth"
        >
          <Tab label="My Friends" {...a11yProps(0)} />
          <Tab 
            label={
              <Box display="flex" alignItems="center" gap={1}>
                Friend Requests
                {friendRequests.length > 0 && (
                  <Box 
                    sx={{
                      bgcolor: 'primary.main',
                      color: 'primary.contrastText',
                      borderRadius: '50%',
                      width: 20,
                      height: 20,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.75rem',
                    }}
                  >
                    {friendRequests.length}
                  </Box>
                )}
              </Box>
            } 
            {...a11yProps(1)} 
          />
        </Tabs>
      </Box>

      <TabPanel value={activeTab} index={0}>
        <FriendList showAddFriend={true} />
      </TabPanel>

      <TabPanel value={activeTab} index={1}>
        <Box>
          <Typography variant="h6" gutterBottom>
            Pending Friend Requests
          </Typography>
          
          {isLoading ? (
            <Box display="flex" justifyContent="center" p={4}>
              <CircularProgress />
            </Box>
          ) : friendRequests.length === 0 ? (
            <Box textAlign="center" p={4}>
              <Typography color="text.secondary">
                You don't have any pending friend requests.
              </Typography>
            </Box>
          ) : (
            <Box>
              {friendRequests.map((request) => (
                <Box key={request.id} mb={2}>
                  <FriendRequest 
                    request={request} 
                    onRespond={() => handleRequestResponded(request.id)} 
                  />
                </Box>
              ))}
            </Box>
          )}
        </Box>
      </TabPanel>
    </Container>
  );
}
