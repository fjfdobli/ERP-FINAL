import React, { useState, useEffect, CSSProperties } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { 
  Box, 
  Container, 
  Paper, 
  Typography, 
  TextField, 
  Button, 
  Alert, 
  InputAdornment,
  IconButton,
  CircularProgress,
  Grid
} from '@mui/material';
import { Lock, Visibility, VisibilityOff } from '@mui/icons-material';
import PrintIcon from '@mui/icons-material/Print';

const ResetPassword = () => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Check if we have the access token in the URL
    const hashParams = new URLSearchParams(location.hash.substring(1));
    const accessToken = hashParams.get('access_token');
    
    if (!accessToken) {
      setError('Invalid or missing reset token. Please request a new password reset link.');
    }
  }, [location]);

  const handleTogglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleToggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    // Password validation
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }
    
    if (newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters');
      return;
    }
    
    // Check password strength
    const hasUpperCase = /[A-Z]/.test(newPassword);
    const hasLowerCase = /[a-z]/.test(newPassword);
    const hasNumbers = /\d/.test(newPassword);
    const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPassword);
    
    if (!(hasUpperCase && hasLowerCase && hasNumbers)) {
      setPasswordError('Password must contain at least one uppercase letter, one lowercase letter, and one number');
      return;
    }
    
    if (!hasSpecialChar) {
      setPasswordError('Password must contain at least one special character (e.g., !@#$%^&*)');
      return;
    }
    
    setPasswordError('');
    setLoading(true);
    setError('');
    
    try {
      // Parse the URL for tokens
      const hashParams = new URLSearchParams(location.hash.substring(1));
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token') || '';
      const type = hashParams.get('type');
      
      // Validate the token and type
      if (!accessToken) {
        throw new Error('Invalid or missing reset token');
      }
      
      if (type !== 'recovery') {
        throw new Error('Invalid password reset link');
      }
      
      // Set the session with the token
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken
      });
      
      if (sessionError) {
        throw new Error(`Unable to verify your reset token: ${sessionError.message}`);
      }
      
      // Update the user's password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });
      
      if (updateError) {
        throw new Error(`Failed to update password: ${updateError.message}`);
      }
      
      // Password updated successfully
      setSuccess(true);
      
      // Sign the user out of this temporary session
      await supabase.auth.signOut();
      
      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err: any) {
      console.error('Password reset error:', err);
      setError(err.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  // Background SVG
  const bgSvgCode = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800">
      <defs>
        <pattern id="subtlePattern" patternUnits="userSpaceOnUse" width="100" height="100">
          <rect width="100" height="100" fill="#f8f9fa"/>
          <rect width="100" height="100" fill="#f0f2f5" opacity="0.4"/>
          <path d="M0 50 L100 50 M50 0 L50 100" stroke="#e9ecef" stroke-width="0.5" opacity="0.5"/>
        </pattern>
      </defs>
      <rect width="1200" height="800" fill="url(#subtlePattern)"/>
    </svg>
  `;

  const backgroundStyle: CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backgroundColor: '#f8f9fa',
    backgroundImage: `url("data:image/svg+xml;charset=utf8,${encodeURIComponent(bgSvgCode)}")`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    zIndex: -1,
    opacity: 0.8
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        padding: { xs: 2, md: 4 },
        position: 'relative'
      }}
    >
      {/* Background div */}
      <div style={backgroundStyle}></div>
      
      <Container maxWidth="sm">
        <Paper 
          elevation={6} 
          sx={{ 
            borderRadius: 2,
            overflow: 'hidden'
          }}
        >
          <Grid container>
            <Grid item xs={12}
              sx={{
                bgcolor: 'primary.main',
                color: 'white',
                py: 3,
                px: 4,
                textAlign: 'center'
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1 }}>
                <PrintIcon sx={{ fontSize: 40, mr: 1 }} />
                <Typography variant="h4" component="h1" fontWeight="bold">
                  Opzon's Printing Press
                </Typography>
              </Box>
              <Typography variant="subtitle1">
                Enterprise Resource Planning System
              </Typography>
            </Grid>
            
            <Grid item xs={12} sx={{ p: 4 }}>
              <Typography variant="h5" component="h2" gutterBottom>
                Reset Your Password
              </Typography>
              
              {error && (
                <Alert severity="error" sx={{ mb: 3 }}>
                  {error}
                </Alert>
              )}
              
              {passwordError && (
                <Alert severity="error" sx={{ mb: 3 }}>
                  {passwordError}
                </Alert>
              )}
              
              {success ? (
                <Box sx={{ textAlign: 'center', py: 3 }}>
                  <Alert severity="success" sx={{ mb: 3 }}>
                    Your password has been reset successfully!
                  </Alert>
                  <Typography variant="body1" paragraph>
                    Redirecting you to the login page...
                  </Typography>
                  <CircularProgress size={30} />
                </Box>
              ) : (
                <Box component="form" onSubmit={handleSubmit}>
                  <TextField
                    margin="normal"
                    required
                    fullWidth
                    name="newPassword"
                    label="New Password"
                    type={showPassword ? 'text' : 'password'}
                    id="newPassword"
                    autoComplete="new-password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Lock color="primary" />
                        </InputAdornment>
                      ),
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            aria-label="toggle password visibility"
                            onClick={handleTogglePasswordVisibility}
                            edge="end"
                          >
                            {showPassword ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      )
                    }}
                    sx={{ mb: 2 }}
                  />
                  
                  <TextField
                    margin="normal"
                    required
                    fullWidth
                    name="confirmPassword"
                    label="Confirm Password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    id="confirmPassword"
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Lock color="primary" />
                        </InputAdornment>
                      ),
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            aria-label="toggle password visibility"
                            onClick={handleToggleConfirmPasswordVisibility}
                            edge="end"
                          >
                            {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      )
                    }}
                    sx={{ mb: 3 }}
                  />
                  
                  <Button
                    type="submit"
                    fullWidth
                    variant="contained"
                    size="large"
                    disabled={loading}
                    sx={{ 
                      py: 1.5,
                      fontSize: '1rem',
                      fontWeight: 'bold'
                    }}
                  >
                    {loading ? <CircularProgress size={24} /> : 'Reset Password'}
                  </Button>
                  
                  <Box sx={{ mt:3, textAlign: 'center' }}>
                    <Button 
                      onClick={() => navigate('/login')}
                      color="primary" 
                    >
                      Return to Login
                    </Button>
                  </Box>
                </Box>
              )}
            </Grid>
          </Grid>
        </Paper>
        
        <Box sx={{ mt: 4, textAlign: 'center' }}>
          <Typography variant="body2" color="black">
            © {new Date().getFullYear()} Opzon's Printing Press. All rights reserved.
          </Typography>
        </Box>
      </Container>
    </Box>
  );
};

export default ResetPassword;