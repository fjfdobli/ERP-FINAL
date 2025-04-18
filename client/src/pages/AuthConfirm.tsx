import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { Box, Typography, CircularProgress, Paper, Container, Alert, Button } from '@mui/material';
import { CheckCircle, Error as ErrorIcon } from '@mui/icons-material';
import PrintIcon from '@mui/icons-material/Print';

const AuthConfirm = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleEmailConfirmation = async () => {
      try {
        // Get URL hash parameters
        const hashParams = new URLSearchParams(location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        const type = hashParams.get('type');
        
        if (type === 'email_change' || type === 'signup') {
          // If we have tokens, the user has confirmed their email
          if (accessToken && refreshToken) {
            // Set the session
            const { error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken
            });
            
            if (error) {
              throw new Error(error.message);
            }
            
            // Update user metadata to mark email as verified
            const { error: updateError } = await supabase.auth.updateUser({
              data: {
                emailVerified: true
              }
            });
            
            if (updateError) {
              throw new Error(updateError.message);
            }
            
            setSuccess(true);
          } else {
            throw new Error('Invalid confirmation link');
          }
        } else {
          throw new Error('Invalid confirmation type');
        }
      } catch (err) {
        console.error('Email confirmation error:', err);
        setError(err instanceof Error ? err.message : 'Failed to confirm your email');
      } finally {
        setLoading(false);
      }
    };

    handleEmailConfirmation();
  }, [location.hash]);

  // Background SVG for decoration (same as Login/Register)
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
      
      <g opacity="0.65" transform="translate(120,150)">
        <rect x="0" y="0" width="60" height="45" rx="4" fill="#e0e0e0" stroke="#cccccc" stroke-width="1"/>
        <rect x="5" y="5" width="50" height="20" rx="2" fill="#f5f5f5" stroke="#e0e0e0" stroke-width="0.5"/>
        <rect x="15" y="30" width="30" height="5" rx="1" fill="#e0e0e0"/>
      </g>
      
      <g opacity="0.65" transform="translate(50,50)">
        <path d="M0,0 L40,0 L55,15 L55,70 L0,70 Z" fill="#f0f0f0" stroke="#dddddd" stroke-width="1"/>
        <path d="M40,0 L40,15 L55,15" fill="none" stroke="#dddddd" stroke-width="1"/>
        <line x1="10" y1="25" x2="45" y2="25" stroke="#e0e0e0" stroke-width="1"/>
        <line x1="10" y1="32" x2="45" y2="32" stroke="#e0e0e0" stroke-width="1"/>
        <line x1="10" y1="39" x2="45" y2="39" stroke="#e0e0e0" stroke-width="1"/>
      </g>
    </svg>
  `;

  const backgroundStyle = {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backgroundColor: '#f8f9fa',
    backgroundImage: `url("data:image/svg+xml;charset=utf8,${encodeURIComponent(bgSvgCode)}")`,
    backgroundSize: 'cover' as const,
    backgroundPosition: 'center' as const,
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
        <Paper elevation={6} sx={{ borderRadius: 2, overflow: 'hidden' }}>
          <Box
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
          </Box>
          
          <Box sx={{ p: 4, textAlign: 'center' }}>
            {loading ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 4 }}>
                <CircularProgress size={60} sx={{ mb: 3 }} />
                <Typography variant="h6">Confirming your email...</Typography>
              </Box>
            ) : success ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 4 }}>
                <CheckCircle color="success" sx={{ fontSize: 60, mb: 3 }} />
                <Typography variant="h5" gutterBottom>Email Confirmed!</Typography>
                <Typography variant="body1" paragraph>
                  Your email has been successfully verified. You can now log in to your account.
                </Typography>
                <Button 
                  variant="contained" 
                  color="primary" 
                  onClick={() => navigate('/login')}
                  size="large"
                  sx={{ mt: 2, py: 1.5, px: 4, fontSize: '1rem' }}
                >
                  Go to Login
                </Button>
              </Box>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 4 }}>
                <ErrorIcon color="error" sx={{ fontSize: 60, mb: 3 }} />
                <Typography variant="h5" gutterBottom>Confirmation Failed</Typography>
                <Alert severity="error" sx={{ mt: 2, mb: 3 }}>
                  {error || 'We could not confirm your email. The link may have expired.'}
                </Alert>
                <Button 
                  variant="contained" 
                  color="primary" 
                  onClick={() => navigate('/login')}
                  size="large"
                  sx={{ py: 1.5, px: 4, fontSize: '1rem' }}
                >
                  Return to Login
                </Button>
              </Box>
            )}
          </Box>
        </Paper>
        
        <Box sx={{ mt: 4, textAlign: 'center' }}>
          <Typography variant="body2" color="textSecondary">
            © {new Date().getFullYear()} Opzon's Printing Press. All rights reserved.
          </Typography>
        </Box>
      </Container>
    </Box>
  );
};

export default AuthConfirm;