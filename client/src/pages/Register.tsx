import React, { useState, useEffect, CSSProperties } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../redux/hooks';
import { register, clearError } from '../redux/slices/authSlice';
import { Box, Container, Paper, Typography, TextField, Button, Alert, InputAdornment, IconButton, Grid } from '@mui/material';
import { Visibility, VisibilityOff, Email, Lock, Person, ArrowBack } from '@mui/icons-material';
import PrintIcon from '@mui/icons-material/Print';

const Register = () => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { isAuthenticated, error, loading } = useAppSelector((state) => state.auth);

  useEffect(() => {
    dispatch(clearError());
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [dispatch, isAuthenticated, navigate]);


const handleSubmit = (e: React.FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
        setPasswordError('Passwords do not match');
        return;
    }
    
    if (password.length < 8) {
        setPasswordError('Password must be at least 8 characters');
        return;
    }
    
    setPasswordError('');
    dispatch(register({ firstName, lastName, email, password }));
};

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
      
      <g opacity="0.65" transform="translate(70,420)">
        <rect x="0" y="0" width="50" height="60" rx="3" fill="#f5f5f5" stroke="#e0e0e0" stroke-width="1"/>
        <text x="25" y="25" font-family="Arial" font-size="24" font-weight="bold" text-anchor="middle" fill="#d0d0d0">A</text>
        <text x="25" y="45" font-family="Arial" font-size="14" text-anchor="middle" fill="#d9d9d9">a</text>
      </g>
      
      <g opacity="0.65" transform="translate(900,220)">
        <circle cx="30" cy="30" r="28" fill="#f5f5f5" stroke="#e0e0e0" stroke-width="1"/>
        <circle cx="30" cy="30" r="22" fill="#f0f0f0" stroke="#e0e0e0" stroke-width="0.5"/>
        <circle cx="30" cy="30" r="6" fill="#e0e0e0"/>
      </g>
      
      <g opacity="0.65" transform="translate(1080,50)">
        <rect x="0" y="0" width="60" height="60" rx="3" fill="#f5f5f5" stroke="#e0e0e0" stroke-width="1"/>
        <line x1="20" y1="0" x2="20" y2="60" stroke="#e0e0e0" stroke-width="1"/>
        <line x1="40" y1="0" x2="40" y2="60" stroke="#e0e0e0" stroke-width="1"/>
        <line x1="0" y1="20" x2="60" y2="20" stroke="#e0e0e0" stroke-width="1"/>
        <line x1="0" y1="40" x2="60" y2="40" stroke="#e0e0e0" stroke-width="1"/>
      </g>
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
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Button 
                  component={Link} 
                  to="/login" 
                  startIcon={<ArrowBack />}
                  sx={{ mr: 2 }}
                >
                  Back to Login
                </Button>
                <Typography variant="h5" component="h2" fontWeight="medium">
                  Create Account
                </Typography>
              </Box>
              
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
              
              <Box component="form" onSubmit={handleSubmit}>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      id="firstName"
                      label="First Name"
                      name="firstName"
                      autoComplete="given-name"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <Person color="primary" />
                          </InputAdornment>
                        ),
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      id="lastName"
                      label="Last Name"
                      name="lastName"
                      autoComplete="family-name"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <Person color="primary" />
                          </InputAdornment>
                        ),
                      }}
                    />
                  </Grid>
                </Grid>
                
                <TextField
                  margin="normal"
                  required
                  fullWidth
                  id="email"
                  label="Email Address"
                  name="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Email color="primary" />
                      </InputAdornment>
                    ),
                  }}
                  sx={{ mb: 2, mt: 2 }}
                />
                
                <TextField
                  margin="normal"
                  required
                  fullWidth
                  name="password"
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
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
                          onClick={() => setShowPassword(!showPassword)}
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
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
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
                    mt: 2, 
                    mb: 2,
                    py: 1.5,
                    fontSize: '1rem',
                    fontWeight: 'bold'
                  }}
                >
                  {loading ? 'Creating Account...' : 'Create Account'}
                </Button>
              </Box>
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

export default Register;