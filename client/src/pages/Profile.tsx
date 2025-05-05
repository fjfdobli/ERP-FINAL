import React, { useState, useEffect, useRef } from 'react';
import { useAppDispatch, useAppSelector } from '../redux/hooks';
import { updateUserProfile, getCurrentUser, uploadAvatar } from '../redux/slices/authSlice';
import {
  Box, Typography, Card, Avatar, TextField, Button, Grid, Divider, 
  Paper, IconButton, Snackbar, Alert, useTheme, useMediaQuery } from '@mui/material';
import {
  Edit as EditIcon, Save as SaveIcon, Cancel as CancelIcon, AccountCircle,
  Email, Work, Phone, Badge, PhotoCamera as PhotoCameraIcon } from '@mui/icons-material';

const Profile: React.FC = () => {
  const theme = useTheme();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector(state => state.auth);
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('md'));
  
  const [isEditing, setIsEditing] = useState(false);
  const [notification, setNotification] = useState<{show: boolean, message: string, type: 'success' | 'error'}>({
    show: false,
    message: '',
    type: 'success'
  });
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    jobTitle: '',
    phone: '',
  });
  
  // Fetch user data if not available
  useEffect(() => {
    if (!user) {
      dispatch(getCurrentUser());
    } else {
      // Update form data when user becomes available
      setFormData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        jobTitle: user.jobTitle || '',
        phone: user.phone || '',
      });
    }
  }, [user, dispatch]);
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleEditToggle = () => {
    if (isEditing) {
      // If we're canceling edit mode, reset form data
      setFormData({
        firstName: user?.firstName || '',
        lastName: user?.lastName || '',
        jobTitle: user?.jobTitle || '',
        phone: user?.phone || '',
      });
    }
    setIsEditing(!isEditing);
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await dispatch(updateUserProfile(formData)).unwrap();
      setIsEditing(false);
      setNotification({
        show: true,
        message: 'Profile updated successfully',
        type: 'success'
      });
    } catch (error) {
      setNotification({
        show: true,
        message: 'Failed to update profile',
        type: 'error'
      });
    }
  };
  
  const handleCloseNotification = () => {
    setNotification(prev => ({ ...prev, show: false }));
  };
  
  // For avatar upload
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  const handleAvatarClick = () => {
    if (!isEditing) return;
    fileInputRef.current?.click();
  };
  
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      setNotification({
        show: true,
        message: 'Please select an image file',
        type: 'error'
      });
      return;
    }
    
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setNotification({
        show: true,
        message: 'Image size should be less than 5MB',
        type: 'error'
      });
      return;
    }
    
    setIsUploading(true);
    try {
      // Upload avatar and get URL back
      const avatarUrl = await dispatch(uploadAvatar(file)).unwrap();
      
      // Manually store in localStorage too for redundancy
      if (avatarUrl && typeof avatarUrl === 'string') {
        console.log('Storing avatar in localStorage for persistence');
        localStorage.setItem('user_avatar', avatarUrl);
        
        // Store in userData too if available
        const storedUserData = localStorage.getItem('userData');
        if (storedUserData) {
          try {
            const userData = JSON.parse(storedUserData);
            userData.avatar = avatarUrl;
            localStorage.setItem('userData', JSON.stringify(userData));
          } catch (e) {
            console.error('Failed to update avatar in userData', e);
          }
        }
        
        // Refresh the current user to update the UI
        dispatch(getCurrentUser());
      }
      
      setNotification({
        show: true,
        message: 'Profile picture updated successfully',
        type: 'success'
      });
    } catch (error) {
      console.error('Avatar upload failed:', error);
      setNotification({
        show: true,
        message: 'Failed to upload profile picture',
        type: 'error'
      });
    } finally {
      setIsUploading(false);
    }
  };
  
  const getInitials = () => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
    } else if (user?.firstName) {
      return user.firstName[0].toUpperCase();
    } else if (user?.email) {
      return user.email[0].toUpperCase();
    }
    return 'U';
  };
  
  // Get loading state from redux
  const isLoading = useAppSelector(state => state.auth.loading);
  
  if (isLoading) {
    return (
      <Box sx={{ p: 3, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Typography variant="h6" sx={{ mb: 2 }}>Loading profile information...</Typography>
        <Box sx={{ width: 50, height: 50, border: '3px solid rgba(25, 118, 210, 0.2)', borderRadius: '50%', borderTop: '3px solid #1976d2', animation: 'spin 1s linear infinite' }} />
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </Box>
    );
  }
  
  if (!user) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="h5">User not found</Typography>
        <Button 
          variant="contained" 
          color="primary" 
          sx={{ mt: 2 }}
          onClick={() => dispatch(getCurrentUser())}
        >
          Retry
        </Button>
      </Box>
    );
  }
  
  return (
    <Box sx={{ height: '100%', overflow: 'auto' }}>
      <Typography variant="h5" fontWeight="bold" sx={{ mb: 3 }}>
        My Profile
      </Typography>
      
      <Box sx={{ display: 'flex', flexDirection: isSmallScreen ? 'column' : 'row', gap: 3 }}>
        {/* Profile Card */}
        <Card 
          elevation={0} 
          sx={{ 
            width: isSmallScreen ? '100%' : 280,
            border: '1px solid var(--border-color)',
            borderRadius: 3,
            overflow: 'visible',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            p: 3,
            position: 'relative'
          }}
        >
          {/* Avatar with upload option */}
          <Box 
            sx={{ 
              position: 'relative',
              mb: 2,
            }}
          >
            <Avatar 
              src={user.avatar || undefined}
              onClick={handleAvatarClick}
              sx={{
                width: 96, 
                height: 96,
                bgcolor: 'primary.main',
                color: 'white',
                fontSize: '2rem',
                fontWeight: 'bold',
                boxShadow: '0 4px 12px rgba(25, 118, 210, 0.15)',
                cursor: isEditing ? 'pointer' : 'default',
                border: isEditing ? '2px solid #1976d2' : 'none'
              }}
            >
              {!user.avatar && getInitials()}
            </Avatar>
            
            {isEditing && (
              <Box 
                sx={{
                  position: 'absolute',
                  bottom: -5,
                  right: -5,
                  bgcolor: 'primary.main',
                  color: 'white',
                  borderRadius: '50%',
                  width: 32,
                  height: 32,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                  '&:hover': {
                    bgcolor: 'primary.dark'
                  }
                }}
                onClick={handleAvatarClick}
              >
                {isUploading ? (
                  <Box sx={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid white', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                ) : (
                  <PhotoCameraIcon fontSize="small" />
                )}
              </Box>
            )}
            
            <input 
              type="file"
              ref={fileInputRef}
              style={{ display: 'none' }}
              accept="image/*"
              onChange={handleFileChange}
              aria-label="Upload profile picture"
              title="Upload profile picture"
            />
          </Box>
          
          <Typography variant="h6" fontWeight="bold">
            {user.firstName ? `${user.firstName} ${user.lastName || ''}` : user.email}
          </Typography>
          
          <Typography 
            variant="body2" 
            sx={{
              color: 'white',
              bgcolor: 'primary.main',
              px: 2,
              py: 0.5,
              borderRadius: 4,
              mt: 1,
              fontWeight: 500,
              fontSize: '0.75rem',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}
          >
            {user.role || 'User'}
          </Typography>
          
          <Divider sx={{ my: 2, width: '100%' }} />
          
          <Box sx={{ width: '100%' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
              <Email fontSize="small" sx={{ color: 'text.secondary', mr: 1.5 }} />
              <Typography variant="body2" noWrap>
                {user.email}
              </Typography>
            </Box>
            
            {user.phone && (
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
                <Phone fontSize="small" sx={{ color: 'text.secondary', mr: 1.5 }} />
                <Typography variant="body2">
                  {user.phone}
                </Typography>
              </Box>
            )}
            
            {user.jobTitle && (
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Work fontSize="small" sx={{ color: 'text.secondary', mr: 1.5 }} />
                <Typography variant="body2">
                  {user.jobTitle}
                </Typography>
              </Box>
            )}
          </Box>
          
        </Card>
        
        {/* Profile Edit Form */}
        <Paper 
          elevation={0} 
          sx={{ 
            flexGrow: 1,
            border: '1px solid var(--border-color)',
            borderRadius: 3,
            p: 3
          }}
        >
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            mb: 3
          }}>
            <Typography variant="h6" fontWeight="bold">
              {isEditing ? 'Edit Profile Information' : 'Profile Information'}
            </Typography>
            
            <IconButton 
              onClick={handleEditToggle} 
              color={isEditing ? 'error' : 'primary'}
              sx={{ 
                bgcolor: isEditing ? 'error.light' : 'primary.light',
                color: 'white',
                '&:hover': {
                  bgcolor: isEditing ? 'error.main' : 'primary.main',
                }
              }}
            >
              {isEditing ? <CancelIcon /> : <EditIcon />}
            </IconButton>
          </Box>
          
          <Divider sx={{ mb: 3 }} />
          
          <form onSubmit={handleSubmit}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Typography variant="body2" fontWeight="medium" sx={{ mb: 1 }}>
                  First Name
                </Typography>
                <TextField
                  fullWidth
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  variant="outlined"
                  disabled={!isEditing}
                  InputProps={{
                    startAdornment: (
                      <AccountCircle sx={{ color: 'action.active', mr: 1 }} />
                    ),
                  }}
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Typography variant="body2" fontWeight="medium" sx={{ mb: 1 }}>
                  Last Name
                </Typography>
                <TextField
                  fullWidth
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  variant="outlined"
                  disabled={!isEditing}
                  InputProps={{
                    startAdornment: (
                      <Badge sx={{ color: 'action.active', mr: 1 }} />
                    ),
                  }}
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Typography variant="body2" fontWeight="medium" sx={{ mb: 1 }}>
                  Job Title
                </Typography>
                <TextField
                  fullWidth
                  name="jobTitle"
                  value={formData.jobTitle}
                  onChange={handleInputChange}
                  variant="outlined"
                  disabled={!isEditing}
                  InputProps={{
                    startAdornment: (
                      <Work sx={{ color: 'action.active', mr: 1 }} />
                    ),
                  }}
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Typography variant="body2" fontWeight="medium" sx={{ mb: 1 }}>
                  Phone Number
                </Typography>
                <TextField
                  fullWidth
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  variant="outlined"
                  disabled={!isEditing}
                  InputProps={{
                    startAdornment: (
                      <Phone sx={{ color: 'action.active', mr: 1 }} />
                    ),
                  }}
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Typography variant="body2" fontWeight="medium" sx={{ mb: 1 }}>
                  Email
                </Typography>
                <TextField
                  fullWidth
                  value={user.email}
                  variant="outlined"
                  disabled
                  InputProps={{
                    startAdornment: (
                      <Email sx={{ color: 'action.active', mr: 1 }} />
                    ),
                  }}
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Typography variant="body2" fontWeight="medium" sx={{ mb: 1 }}>
                  Role
                </Typography>
                <TextField
                  fullWidth
                  value={user.role || 'User'}
                  variant="outlined"
                  disabled
                  InputProps={{
                    startAdornment: (
                      <AccountCircle sx={{ color: 'action.active', mr: 1 }} />
                    ),
                  }}
                />
              </Grid>
            </Grid>
            
            {isEditing && (
              <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
                <Button
                  variant="contained"
                  color="primary"
                  type="submit"
                  startIcon={<SaveIcon />}
                  sx={{ px: 3 }}
                >
                  Save Changes
                </Button>
              </Box>
            )}
          </form>
        </Paper>
      </Box>
      
      <Snackbar 
        open={notification.show} 
        autoHideDuration={6000} 
        onClose={handleCloseNotification}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={handleCloseNotification} 
          severity={notification.type} 
          sx={{ width: '100%' }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Profile;