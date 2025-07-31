import { useState, useCallback, Fragment } from 'react';
import { Badge, IconButton, Menu, MenuItem, Typography, Box, Divider, Button } from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';
import { useNotifications } from '../../contexts/NotificationContext';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { playSound } from '../../utils/sound';
import { Notification, respondToPicnicInvite } from '../../firebase/notifications';

// Using Notification type from firebase/notifications

export const NotificationBell = () => {
  const { currentUser } = useAuth();
  const { notifications, markAsRead, unreadCount } = useNotifications();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [clickedNotification, setClickedNotification] = useState<string | null>(null);
  const navigate = useNavigate();
  
  // Get the count of unread notifications from the context
  const notificationCount = unreadCount || 0;

  const handleRespondToInvite = useCallback(async (notification: Notification, accept: boolean) => {
    if (!currentUser?.uid || !notification.picnicId) return;
    setIsProcessing(notification.id);
    
    try {
      await respondToPicnicInvite({
        picnicId: notification.picnicId,
        notificationId: notification.id,
        accept,
      });
      playSound(accept ? 'success' : 'notification');
      
      if (accept) {
        navigate(`/picnic/${notification.picnicId}`);
      }
    } catch (error) {
      console.error('Error responding to invite:', error);
      playSound('error');
    } finally {
      setIsProcessing(null);
    }
  }, [currentUser, navigate]);

  const handleNotificationClick = async (notification: Notification) => {
    if (notification.type === 'picnic_invite') return; // Handled by buttons
    
    setClickedNotification(notification.id);
    
    try {
      await markAsRead(notification.id);
      playSound('success');
      
      // Navigate after a short delay for better UX
      setTimeout(() => {
        if (notification.picnicId) {
          navigate(`/picnic/${notification.picnicId}`);
        }
        handleClose();
      }, 300);
      
    } catch (error) {
      console.error('Error handling notification click:', error);
      playSound('error');
    } finally {
      setTimeout(() => setClickedNotification(null), 500);
    }
  };

  const handleOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  return (
    <>
      <IconButton 
        color="inherit" 
        onClick={handleOpen}
        aria-label="show notifications"
        aria-controls="notification-menu"
        aria-haspopup="true"
      >
        <Badge badgeContent={notificationCount} color="error">
          <NotificationsIcon />
        </Badge>
      </IconButton>

      <Menu
        id="notification-menu"
        anchorEl={anchorEl}
        keepMounted
        open={Boolean(anchorEl)}
        onClose={handleClose}
        PaperProps={{
          style: {
            width: '350px',
            maxHeight: '400px',
            overflowY: 'auto'
          }
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <Box p={2}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
            <Typography variant="subtitle1" fontWeight="bold">Notifications</Typography>
            <Button 
              size="small" 
              color="primary"
              onClick={() => {
                // Handle mark all as read
                notifications.forEach(n => !n.isRead && markAsRead(n.id));
              }}
              disabled={unreadCount === 0}
            >
              Mark all as read
            </Button>
          </Box>

          <Divider />

          {notifications.length === 0 ? (
            <Box p={2} textAlign="center">
              <Typography variant="body2" color="textSecondary">
                No notifications
              </Typography>
            </Box>
          ) : (
            <Box mt={1}>
              {notifications.map((notification) => (
                <Fragment key={notification.id}>
                  <MenuItem
                    onClick={() => handleNotificationClick(notification)}
                    selected={clickedNotification === notification.id}
                    disabled={isProcessing === notification.id}
                    sx={{
                      opacity: notification.isRead ? 0.7 : 1,
                      bgcolor: clickedNotification === notification.id ? 'action.selected' : 'transparent',
                      transition: 'all 0.2s',
                      '&:hover': {
                        bgcolor: 'action.hover',
                      }
                    }}
                  >
                    <Box width="100%">
                      <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                        <Typography 
                          variant="body2" 
                          fontWeight={notification.isRead ? 'normal' : 'bold'}
                          color={notification.isRead ? 'textSecondary' : 'textPrimary'}
                        >
                          {notification.message}
                        </Typography>
                        <Typography variant="caption" color="textSecondary" ml={1}>
                          {new Date(notification.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Typography>
                      </Box>

                      {notification.type === 'picnic_invite' && (
                        <Box mt={1} display="flex" justifyContent="flex-end" gap={1}>
                          <Button
                            variant="contained"
                            color="primary"
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRespondToInvite(notification, true);
                            }}
                            disabled={isProcessing === notification.id}
                          >
                            {isProcessing === notification.id ? '...' : 'Accept'}
                          </Button>
                          <Button
                            variant="outlined"
                            color="error"
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRespondToInvite(notification, false);
                            }}
                            disabled={isProcessing === notification.id}
                          >
                            {isProcessing === notification.id ? '...' : 'Decline'}
                          </Button>
                        </Box>
                      )}
                    </Box>
                  </MenuItem>
                  <Divider />
                </Fragment>
              ))}
            </Box>
          )}
        </Box>
      </Menu>
    </>
  );
};