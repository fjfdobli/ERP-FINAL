import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Button, 
  Container, 
  Paper,
  Grid,
  Divider,
  useTheme,
  keyframes,
  Breadcrumbs,
  Link
} from '@mui/material';
import { 
  Home as HomeIcon, 
  ArrowBack as BackIcon,
  Error as ErrorIcon,
  Print as PrintIcon,
  SentimentDissatisfied as SadIcon
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';

// Define subtle animations
const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
`;

const gentlePulse = keyframes`
  0%, 100% { opacity: 0.9; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.02); }
`;

const moveBackground = keyframes`
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
`;

const NotFound: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const [counter, setCounter] = useState(0);

  // Gentle progress animation
  useEffect(() => {
    const timer = setInterval(() => {
      setCounter(prev => {
        if (prev === 100) return 0;
        return prev + 1;
      });
    }, 50);
    
    return () => clearInterval(timer);
  }, []);

  // Quick links based on standard ERP sections
  const quickLinks = [
    { name: 'Dashboard', path: '/dashboard', icon: <HomeIcon fontSize="small" /> },
    { name: 'Orders', path: '/orders/clients', icon: <PrintIcon fontSize="small" /> },
    { name: 'Inventory', path: '/inventory', icon: <PrintIcon fontSize="small" /> },
    { name: 'Employees', path: '/employees', icon: <PrintIcon fontSize="small" /> }
  ];

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
        backgroundColor: theme.palette.background.default,
        padding: { xs: 2, md: 4 },
        backgroundImage: `linear-gradient(45deg, ${theme.palette.background.default} 25%, ${theme.palette.background.paper} 25%, ${theme.palette.background.paper} 50%, ${theme.palette.background.default} 50%, ${theme.palette.background.default} 75%, ${theme.palette.background.paper} 75%, ${theme.palette.background.paper} 100%)`,
        backgroundSize: '100px 100px',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          zIndex: 1
        }
      }}
    >
      <Container 
        maxWidth="md" 
        sx={{ 
          position: 'relative', 
          zIndex: 5, 
          animation: `${fadeIn} 0.4s ease-out`
        }}
      >
        {/* Company Header */}
        <Box sx={{ mb: 4, display: 'flex', justifyContent: 'center' }}>
          <Box 
            sx={{ 
              display: 'flex', 
              alignItems: 'center',
              justifyContent: 'center',
              mb: 1
            }}
          >
            <Box 
              sx={{ 
                bgcolor: theme.palette.primary.main,
                color: 'white',
                width: 40, 
                height: 40,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center', 
                justifyContent: 'center',
                mr: 1,
                boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
              }}
            >
              <PrintIcon />
            </Box>
            <Typography 
              variant="h6" 
              color="primary.main"
              fontWeight="bold"
            >
              Opzon's Printing ERP System
            </Typography>
          </Box>
        </Box>

        {/* Breadcrumbs */}
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
          <Breadcrumbs 
            aria-label="breadcrumb"
            sx={{ 
              '& .MuiBreadcrumbs-separator': {
                mx: 1
              }
            }}
          >
            <Link 
              color="inherit" 
              href="#" 
              onClick={(e) => {
                e.preventDefault();
                navigate('/dashboard');
              }}
              sx={{ 
                display: 'flex',
                alignItems: 'center',
                textDecoration: 'none',
                color: 'text.secondary'
              }}
            >
              <HomeIcon fontSize="small" sx={{ mr: 0.5 }} />
              Home
            </Link>
            <Typography color="text.primary" sx={{ fontWeight: 500 }}>
              404 Error
            </Typography>
          </Breadcrumbs>
        </Box>

        {/* Main 404 Card */}
        <Paper 
          elevation={3} 
          sx={{ 
            p: { xs: 3, md: 5 },
            borderRadius: 2,
            textAlign: 'center',
            position: 'relative',
            overflow: 'hidden',
            border: '1px solid',
            borderColor: 'divider',
            boxShadow: '0 10px 30px rgba(0,0,0,0.08)'
          }}
        >
          {/* Status Bar - Professional Touch */}
          <Box 
            sx={{ 
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '6px',
              backgroundImage: `linear-gradient(90deg, ${theme.palette.primary.light}, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
              backgroundSize: '200% 200%',
              animation: `${moveBackground} 3s ease infinite`
            }}
          />
          
          <Grid container spacing={4} alignItems="center">
            {/* Left: Icon and Status */}
            <Grid item xs={12} md={6} sx={{ textAlign: { xs: 'center', md: 'right' } }}>
              <Box 
                sx={{ 
                  display: 'inline-flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  animation: `${gentlePulse} 3s infinite ease-in-out`,
                  mb: { xs: 2, md: 0 }
                }}
              >
                <Box 
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 120,
                    height: 120,
                    borderRadius: '50%',
                    backgroundColor: 'rgba(25, 118, 210, 0.05)',
                    mb: 2,
                    border: '1px solid',
                    borderColor: 'rgba(25, 118, 210, 0.1)'
                  }}
                >
                  <ErrorIcon 
                    sx={{ 
                      fontSize: 70, 
                      color: theme.palette.primary.main,
                      opacity: 0.9
                    }} 
                  />
                </Box>
                <Typography 
                  variant="h1" 
                  component="div" 
                  sx={{ 
                    fontWeight: 800,
                    fontSize: { xs: '5rem', md: '6rem' },
                    color: theme.palette.primary.main,
                    lineHeight: 1,
                    letterSpacing: '-0.02em',
                    textShadow: '2px 2px 0px rgba(0,0,0,0.05)'
                  }}
                >
                  404
                </Typography>
              </Box>
            </Grid>
            
            {/* Right: Text and Actions */}
            <Grid item xs={12} md={6} sx={{ textAlign: { xs: 'center', md: 'left' } }}>
              <Typography 
                variant="h4" 
                sx={{ 
                  fontWeight: 600,
                  mb: 1,
                  color: 'text.primary'
                }}
              >
                Page Not Found
              </Typography>
              
              <Typography 
                variant="body1" 
                sx={{ 
                  color: 'text.secondary',
                  mb: 3,
                  fontSize: '1.05rem',
                  lineHeight: 1.5
                }}
              >
                We couldn't find the page you were looking for. It may have been moved or deleted, or the URL might be incorrect.
              </Typography>
              
              <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2, mb: 3 }}>
                <Button
                  variant="contained"
                  color="primary"
                  size="large"
                  startIcon={<HomeIcon />}
                  onClick={() => navigate('/dashboard')}
                  sx={{
                    py: 1.2,
                    px: 3,
                    fontWeight: 500,
                    boxShadow: 2,
                    textTransform: 'none'
                  }}
                >
                  Back to Dashboard
                </Button>
                
                <Button
                  variant="outlined"
                  color="primary"
                  size="large"
                  startIcon={<BackIcon />}
                  onClick={() => navigate(-1)}
                  sx={{
                    py: 1.2,
                    px: 3,
                    fontWeight: 500,
                    textTransform: 'none'
                  }}
                >
                  Go Back
                </Button>
              </Box>
              
              {/* Status Bar */}
              <Box 
                sx={{ 
                  width: '100%',
                  height: '4px',
                  backgroundColor: 'rgba(0,0,0,0.05)',
                  borderRadius: '2px',
                  position: 'relative',
                  mb: 0.5
                }}
              >
                <Box 
                  sx={{ 
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    height: '100%',
                    width: `${counter}%`,
                    backgroundColor: theme.palette.primary.main,
                    borderRadius: '2px',
                    transition: 'width 0.1s ease'
                  }}
                />
              </Box>
              
              <Typography 
                variant="caption" 
                color="text.secondary"
                sx={{ display: 'block', mb: 2 }}
              >
                Redirecting in a few seconds...
              </Typography>
            </Grid>
          </Grid>

          <Divider sx={{ my: 4 }} />
          
          {/* Quick Links Section */}
          <Box>
            <Typography variant="subtitle1" gutterBottom fontWeight={500} color="text.secondary">
              Quick Navigation:
            </Typography>
            
            <Grid container spacing={2} justifyContent="center" sx={{ mt: 1 }}>
              {quickLinks.map((link, index) => (
                <Grid item xs={6} sm={3} key={index}>
                  <Paper
                    elevation={0}
                    sx={{
                      p: 2,
                      textAlign: 'center', 
                      cursor: 'pointer',
                      borderRadius: 1,
                      border: '1px solid',
                      borderColor: 'divider',
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        boxShadow: '0 4px 8px rgba(0,0,0,0.08)',
                        borderColor: theme.palette.primary.main,
                        backgroundColor: 'rgba(25, 118, 210, 0.02)'
                      }
                    }}
                    onClick={() => navigate(link.path)}
                  >
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <Box 
                        sx={{ 
                          mb: 1,
                          color: theme.palette.primary.main
                        }}
                      >
                        {link.icon}
                      </Box>
                      <Typography 
                        variant="body2" 
                        fontWeight={500}
                        noWrap
                      >
                        {link.name}
                      </Typography>
                    </Box>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
};

export default NotFound;