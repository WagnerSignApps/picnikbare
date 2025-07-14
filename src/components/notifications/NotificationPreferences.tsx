import React from 'react';
import { Switch, FormGroup, FormControlLabel, Typography, Box, Divider, Paper, IconButton } from '@mui/material';
import { XMarkIcon } from '@heroicons/react/24/outline';
import NotificationsIcon from '@mui/icons-material/Notifications';
import NotificationsOffIcon from '@mui/icons-material/NotificationsOff';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';
import EmailIcon from '@mui/icons-material/Email';
import PushPinIcon from '@mui/icons-material/PushPin';
import { usePushNotifications, type NotificationPreferences as NotificationPreferencesType } from '../../hooks/usePushNotifications';

type NotificationPreferencesProps = {
  onClose: () => void;
};

export const NotificationPreferences: React.FC<NotificationPreferencesProps> = ({ onClose }) => {
  // onClose is used by the parent component to close the dialog
  const { preferences, updatePreferences, isSupported, permission, requestPermission } = usePushNotifications();
  
  const handleToggle = (key: keyof Omit<NotificationPreferencesType, 'types'>) => {
    updatePreferences({
      [key]: !(preferences as any)[key],
    } as Partial<NotificationPreferencesType>);
  };

  const handleTypeToggle = (type: keyof NotificationPreferencesType['types']) => {
    updatePreferences({
      types: {
        ...(preferences as any).types,
        [type]: !(preferences as any).types[type],
      },
    });
  };

  const handleRequestPermission = async () => {
    const granted = await requestPermission();
    if (!granted) {
      alert('Please enable notifications in your browser settings to receive push notifications.');
    }
  };

  return (
    <Paper elevation={3} sx={{ p: 3, maxWidth: 500, width: '100%' }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box display="flex" alignItems="center">
          <NotificationsIcon color="primary" sx={{ mr: 1 }} />
          <Typography variant="h6" component="h2">
            Notification Preferences
          </Typography>
        </Box>
        <IconButton 
          onClick={onClose}
          size="small"
          sx={{
            '&:hover': {
              backgroundColor: 'rgba(0, 0, 0, 0.04)'
            }
          }}
          aria-label="Close"
        >
          <XMarkIcon className="h-5 w-5" />
        </IconButton>
      </Box>

      <FormGroup>
        {/* Global Toggle */}
        <Box mb={2}>
          <FormControlLabel
            control={
              <Switch
                checked={preferences.enabled}
                onChange={() => handleToggle('enabled')}
                color="primary"
              />
            }
            label={
              <Box display="flex" alignItems="center">
                {preferences.enabled ? (
                  <NotificationsIcon color="primary" sx={{ mr: 1 }} />
                ) : (
                  <NotificationsOffIcon color="disabled" sx={{ mr: 1 }} />
                )}
                <Typography>Enable Notifications</Typography>
              </Box>
            }
            disabled={!isSupported}
          />
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* Sound Toggle */}
        <Box mb={2}>
          <FormControlLabel
            control={
              <Switch
                checked={preferences.sound}
                onChange={() => handleToggle('sound')}
                color="primary"
                disabled={!preferences.enabled}
              />
            }
            label={
              <Box display="flex" alignItems="center">
                {preferences.sound ? (
                  <VolumeUpIcon color="primary" sx={{ mr: 1 }} />
                ) : (
                  <VolumeOffIcon color="disabled" sx={{ mr: 1 }} />
                )}
                <Typography>Notification Sounds</Typography>
              </Box>
            }
          />
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* Notification Types */}
        <Typography variant="subtitle2" color="textSecondary" gutterBottom>
          Notification Types
        </Typography>

        <Box pl={2} mb={2}>
          <FormControlLabel
            control={
              <Switch
                checked={preferences.types.picnicInvites}
                onChange={() => handleTypeToggle('picnicInvites')}
                color="primary"
                disabled={!preferences.enabled}
              />
            }
            label="Picnic Invites"
          />

          <FormControlLabel
            control={
              <Switch
                checked={preferences.types.friendRequests}
                onChange={() => handleTypeToggle('friendRequests')}
                color="primary"
                disabled={!preferences.enabled}
              />
            }
            label="Friend Requests"
          />

          <FormControlLabel
            control={
              <Switch
                checked={preferences.types.messages}
                onChange={() => handleTypeToggle('messages')}
                color="primary"
                disabled={!preferences.enabled}
              />
            }
            label="Messages"
          />

          <FormControlLabel
            control={
              <Switch
                checked={preferences.types.updates}
                onChange={() => handleTypeToggle('updates')}
                color="primary"
                disabled={!preferences.enabled}
              />
            }
            label="Updates & Announcements"
          />
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* Push Notifications */}
        <Box mb={2}>
          <FormControlLabel
            control={
              <Switch
                checked={permission === 'granted' && preferences.push}
                onChange={handleRequestPermission}
                color="primary"
                disabled={!preferences.enabled || !isSupported}
              />
            }
            label={
              <Box display="flex" alignItems="center">
                <PushPinIcon color={permission === 'granted' ? 'primary' : 'disabled'} sx={{ mr: 1 }} />
                <Typography>Push Notifications</Typography>
                {!isSupported && (
                  <Typography variant="caption" color="error" sx={{ ml: 1 }}>
                    (Not supported in this browser)
                  </Typography>
                )}
              </Box>
            }
          />
        </Box>

        {/* Email Notifications */}
        <Box mb={2}>
          <FormControlLabel
            control={
              <Switch
                checked={preferences.email}
                onChange={() => handleToggle('email')}
                color="primary"
                disabled={!preferences.enabled}
              />
            }
            label={
              <Box display="flex" alignItems="center">
                <EmailIcon color={preferences.email ? 'primary' : 'disabled'} sx={{ mr: 1 }} />
                <Typography>Email Notifications</Typography>
              </Box>
            }
          />
        </Box>
      </FormGroup>

      {!isSupported && (
        <Typography variant="body2" color="textSecondary" mt={2}>
          Your browser doesn't support push notifications. Please use a modern browser like Chrome, Firefox, or Edge.
        </Typography>
      )}

      {permission === 'denied' && (
        <Typography variant="body2" color="error" mt={2}>
          Notifications are blocked. Please enable them in your browser settings.
        </Typography>
      )}
    </Paper>
  );
};

export default NotificationPreferences;
