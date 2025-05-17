import React, { useState, useEffect } from 'react';
import { useNavigate, Outlet, useLocation } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../redux/hooks';
import { logout, getCurrentUser } from '../../redux/slices/authSlice';
import { useThemeContext } from '../../App';
import { 
  AppBar, Box, CssBaseline, Divider, Drawer, IconButton, List, ListItem, 
  ListItemButton, ListItemIcon, ListItemText, Toolbar, Typography, Button, 
  Avatar, Menu, MenuItem, useMediaQuery, Collapse, Fade, Paper, useTheme,
  Tooltip
} from '@mui/material';
import { 
  Menu as MenuIcon, Dashboard as DashboardIcon, People as ClientsIcon, 
  ShoppingCart as OrdersIcon, Inventory as InventoryIcon, Group as EmployeesIcon, 
  LocalShipping as SuppliersIcon, HowToReg as AttendanceIcon, Build as MachineryIcon, 
  BarChart as ReportsIcon, AccountCircle, ExitToApp, ChevronLeft, 
  ExpandLess, ExpandMore, RequestQuote as RequestIcon, ImportContacts as ClientRequestIcon, 
  Source as SupplierRequestIcon, Payments as PayrollIcon, KeyboardArrowDown,
  Engineering as EngineeringIcon, BuildCircle as BuildIcon, DarkMode as DarkModeIcon,
  LightMode as LightModeIcon
} from '@mui/icons-material';
import PrintIcon from '@mui/icons-material/Print';

const getDrawerWidth = () => {
  if (typeof window !== 'undefined') {
    if (window.innerWidth < 600) return 240;
    return 280;
  }
  return 280; 
};

const drawerWidth = getDrawerWidth();

const menuItems = [
  { text: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard' },
  { text: 'Clients', icon: <ClientsIcon />, path: '/clients' },
  { text: 'Orders', 
    icon: <OrdersIcon />, 
    children: [
      { text: 'Products', icon: <PrintIcon />, path: '/orders/products' },
      { text: 'Order Requests', icon: <RequestIcon />, path: '/orders/requests' },
      { text: 'Client Orders', icon: <ClientRequestIcon />, path: '/orders/clients' },
      { text: 'Supplier Orders', icon: <SupplierRequestIcon />, path: '/orders/suppliers' }
    ]
  },
  { text: 'Suppliers', icon: <SuppliersIcon />, path: '/suppliers' },
  { text: 'Inventory', icon: <InventoryIcon />, path: '/inventory' },
  { text: 'Employees', icon: <EmployeesIcon />, path: '/employees' },
  { text: 'Attendance', icon: <AttendanceIcon />, path: '/attendance' },
  { text: 'Payroll', icon: <PayrollIcon />, path: '/payroll' },
  { text: 'Machine Operations', 
    icon: <MachineryIcon />, 
    children: [
      { text: 'Technicians', icon: <EngineeringIcon />, path: '/technicians' },
      { text: 'Machinery', icon: <BuildIcon />, path: '/machinery' },
    ]
  },
  { text: 'Reports', icon: <ReportsIcon />, path: '/reports' },
];


const DashboardLayout: React.FC = () => {
  const theme = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuAnchor, setUserMenuAnchor] = useState<HTMLButtonElement | null>(null);
  const [openSubMenu, setOpenSubMenu] = useState<string | null>(null);
  const [currentWidth, setCurrentWidth] = useState(drawerWidth);
  
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAppSelector(state => state.auth);
  
  // Simple effect just to ensure we have user data
  useEffect(() => {
    if (!user) {
      console.log('Dashboard loading initial user data');
      dispatch(getCurrentUser());
    }
  // eslint-disable-next-line
  }, [dispatch]);
  
  // Access theme context to use settings
  const { darkMode, themeColor, compactView, toggleTheme } = useThemeContext();
  
  const isXsScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('md'));

  // Update drawer width on resize
  useEffect(() => {
    const handleResize = () => {
      setCurrentWidth(getDrawerWidth());
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isOrdersPathActive = React.useCallback(() => {
    return location.pathname.includes('/orders');
  }, [location.pathname]);

  useEffect(() => {
    if (isOrdersPathActive() && openSubMenu !== 'Orders') {
      setOpenSubMenu('Orders');
    }
  }, [isOrdersPathActive, openSubMenu]);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleSubMenuToggle = (text: string) => {
    setOpenSubMenu(openSubMenu === text ? null : text);
  };

  interface UserMenuOpenEvent extends React.MouseEvent<HTMLButtonElement> {}

  const handleUserMenuOpen = (event: UserMenuOpenEvent) => {
    setUserMenuAnchor(event.currentTarget);
  };

  const handleUserMenuClose = () => {
    setUserMenuAnchor(null);
  };

  const handleProfileClick = () => {
    setUserMenuAnchor(null);
    navigate('/profile');
  };

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  const getInitial = (str?: string): string => {
    return str && str.length > 0 ? str.charAt(0).toUpperCase() : 'U';
  };


  const drawer = (
    <Box sx={{ 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column',
      bgcolor: darkMode 
        ? 'rgba(24, 34, 51, 0.98)' 
        : 'rgba(255, 255, 255, 0.98)',
      backgroundImage: darkMode
        ? 'linear-gradient(to bottom, rgba(25, 118, 210, 0.05) 0%, rgba(13, 71, 161, 0.02) 100%)'
        : 'linear-gradient(to bottom, rgba(240, 244, 249, 0.8) 0%, rgba(255, 255, 255, 0.9) 100%)',
    }}>
      <Toolbar sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        py: { xs: 1.5, md: 2 },
        background: darkMode 
          ? `linear-gradient(135deg, #1a237e 0%, #283593 50%, #3949ab 100%)`
          : `linear-gradient(135deg, #0d47a1 0%, #1565c0 50%, #1976d2 100%)`,
        color: 'white',
        position: 'relative',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
      }}>
        <Box 
          sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            transition: 'all 0.3s ease'
          }}
        >
          <Avatar 
            sx={{ 
              bgcolor: darkMode ? 'rgba(255,255,255,0.2)' : 'white',
              color: darkMode ? 'white' : 'var(--primary-color)',
              mr: 1.5,
              width: { xs: 34, md: 40 },
              height: { xs: 34, md: 40 }
            }}
          >
            <PrintIcon sx={{ color: 'inherit !important' }} />
          </Avatar>
          <Typography 
            variant="h6" 
            noWrap 
            component="div" 
            fontWeight="bold"
            sx={{
              fontSize: { xs: '1rem', md: '1.2rem' },
              letterSpacing: '0.5px',
              color: 'white !important'
            }}
          >
            Opzon's Printers
          </Typography>
        </Box>
        {isSmallScreen && (
          <IconButton 
            onClick={handleDrawerToggle}
            sx={{ 
              position: 'absolute', 
              right: 8,
              color: 'white !important',
              bgcolor: 'rgba(255,255,255,0.1)',
              '&:hover': {
                bgcolor: 'rgba(255,255,255,0.2)',
              }
            }}
            size="small"
          >
            <ChevronLeft sx={{ color: 'inherit !important' }} />
          </IconButton>
        )}
      </Toolbar>
      <Divider />
      
      {user && (
        <Box 
          sx={{ 
            p: { xs: 2, md: 3 }, 
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            bgcolor: darkMode ? 'rgba(255, 255, 255, 0.03)' : 'rgba(25, 118, 210, 0.04)'
          }}
        >
          <Avatar
            src={user.avatar || undefined}
            alt={user.firstName || user.email}
            sx={{ 
              width: { xs: 60, md: 70 }, 
              height: { xs: 60, md: 70 },
              fontSize: { xs: '1.5rem', md: '1.8rem' },
              fontWeight: 'bold',
              bgcolor: 'primary.main',
              color: 'white',
              mb: 1.5,
              boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
              cursor: 'pointer',
              '&:hover': {
                transform: 'scale(1.05)',
                transition: 'transform 0.2s'
              }
            }}
            onClick={handleProfileClick}
          >
            {!user.avatar && getInitial(user.firstName || user.email || 'U')}
          </Avatar>
          
          <Typography 
            variant="subtitle1" 
            sx={{ 
              fontWeight: 'medium',
              fontSize: { xs: '0.95rem', md: '1.1rem' }
            }}
          >
            {user.firstName 
              ? `${user.firstName} ${user.lastName || ''}`
              : user.email}
          </Typography>
          <Typography 
            variant="body2" 
            sx={{
              color: darkMode ? 'white !important' : 'var(--primary-color) !important',
              fontWeight: 500,
              fontSize: { xs: '0.8rem', md: '0.9rem' },
              bgcolor: darkMode 
                ? 'rgba(255, 255, 255, 0.1)'  
                : 'rgba(25, 118, 210, 0.1)',
              px: 1.5,
              py: 0.5,
              borderRadius: 4,
              mt: 0.5
            }}
          >
            {user.role || 'Admin'}
          </Typography>
        </Box>
      )}
      
      <Divider sx={{ my: 1 }} />
      
      <Box 
        sx={{ 
          flexGrow: 1, 
          overflowY: 'auto',
          '&::-webkit-scrollbar': {
            width: '4px',
          },
          '&::-webkit-scrollbar-track': {
            background: 'transparent',
          },
          '&::-webkit-scrollbar-thumb': {
            background: '#bbb',
            borderRadius: '4px',
          },
          '&::-webkit-scrollbar-thumb:hover': {
            background: '#999',
          },
        }}
      >
        <List sx={{ px: { xs: 1, md: 1.5 } }}>
          {menuItems.map((item) => (
            <React.Fragment key={item.text}>
              {item.children ? (
                <>
                  <ListItem disablePadding>
                    <ListItemButton
                      onClick={() => handleSubMenuToggle(item.text)}
                      sx={{ 
                        borderRadius: 2,
                        mb: 0.8,
                        py: 1.2,
                        backgroundColor: isOrdersPathActive() 
                          ? darkMode
                            ? 'rgba(25, 118, 210, 0.2)' 
                            : 'rgba(25, 118, 210, 0.12)'
                          : 'transparent',
                        '&:hover': {
                          backgroundColor: darkMode
                            ? 'rgba(25, 118, 210, 0.15)'
                            : 'rgba(25, 118, 210, 0.08)',
                          transform: 'translateX(4px)',
                        },
                        transition: 'all 0.2s ease',
                        border: isOrdersPathActive() ? '1px solid' : 'none',
                        borderColor: isOrdersPathActive() 
                          ? darkMode
                            ? 'rgba(255, 255, 255, 0.1)'
                            : 'rgba(25, 118, 210, 0.2)'
                          : 'transparent',
                        boxShadow: isOrdersPathActive()
                          ? darkMode
                            ? '0 2px 8px rgba(0, 0, 0, 0.2)'
                            : '0 2px 8px rgba(0, 0, 0, 0.05)'
                          : 'none'
                      }}
                    >
                      <ListItemIcon sx={{ 
                        minWidth: { xs: 36, md: 42 },
                        color: isOrdersPathActive() 
                          ? 'primary.main' 
                          : darkMode ? 'rgba(255, 255, 255, 0.7)' : 'text.secondary',
                        '& .MuiSvgIcon-root': {
                          transition: 'transform 0.2s ease',
                          transform: isOrdersPathActive() ? 'scale(1.1)' : 'scale(1)',
                        }
                      }}>
                        {item.icon}
                      </ListItemIcon>
                      <ListItemText 
                        primary={item.text} 
                        primaryTypographyProps={{ 
                          fontSize: { xs: '0.875rem', md: '0.95rem' },
                          fontWeight: isOrdersPathActive() ? 600 : 500,
                          letterSpacing: '0.3px',
                          color: isOrdersPathActive() 
                            ? darkMode ? 'white' : 'primary.main'
                            : 'inherit'
                        }}
                      />
                      {openSubMenu === item.text 
                        ? <ExpandLess sx={{ color: isOrdersPathActive() ? 'primary.main' : 'inherit' }} /> 
                        : <ExpandMore sx={{ color: isOrdersPathActive() ? 'primary.main' : 'inherit' }} />
                      }
                    </ListItemButton>
                  </ListItem>
                  
                  <Collapse in={openSubMenu === item.text} timeout="auto" unmountOnExit>
                    <List 
                      component="div" 
                      disablePadding
                      sx={{
                        ml: 1,
                        pl: 1.5,
                        borderLeft: '1px dashed',
                        borderColor: darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
                        mb: 1
                      }}
                    >
                      {item.children.map((child) => (
                        <ListItem key={child.text} disablePadding>
                          <ListItemButton
                            sx={{ 
                              pl: { xs: 2, md: 2.5 },
                              borderRadius: 2,
                              mb: 0.8,
                              py: 0.9,
                              transition: 'all 0.2s ease',
                              '&.Mui-selected': {
                                background: darkMode
                                  ? 'linear-gradient(90deg, rgba(25, 118, 210, 0.8), rgba(25, 118, 210, 0.6))'
                                  : 'linear-gradient(90deg, rgba(25, 118, 210, 0.9), rgba(25, 118, 210, 0.7))',
                                color: 'white',
                                boxShadow: '0 4px 10px rgba(0, 0, 0, 0.15)',
                                '& .MuiListItemIcon-root': {
                                  color: 'white',
                                },
                                '&:hover': {
                                  background: darkMode
                                    ? 'linear-gradient(90deg, rgba(21, 101, 192, 0.8), rgba(13, 71, 161, 0.6))'
                                    : 'linear-gradient(90deg, rgba(21, 101, 192, 0.9), rgba(21, 101, 192, 0.7))',
                                },
                              },
                              '&:hover': {
                                backgroundColor: darkMode 
                                  ? 'rgba(255, 255, 255, 0.08)'
                                  : 'rgba(25, 118, 210, 0.08)',
                                transform: 'translateX(4px)',
                              }
                            }}
                            selected={location.pathname === child.path}
                            onClick={() => {
                              navigate(child.path);
                              if (isSmallScreen) {
                                setMobileOpen(false);
                              }
                            }}
                          >
                            <ListItemIcon sx={{ 
                              minWidth: { xs: 32, md: 36 },
                              fontSize: '0.9rem',
                              color: location.pathname === child.path
                                ? 'inherit'
                                : darkMode ? 'rgba(255, 255, 255, 0.5)' : 'text.secondary'
                            }}>
                              {child.icon}
                            </ListItemIcon>
                            <ListItemText 
                              primary={child.text} 
                              primaryTypographyProps={{ 
                                fontSize: { xs: '0.8rem', md: '0.875rem' },
                                fontWeight: location.pathname === child.path ? 600 : 400,
                                letterSpacing: '0.2px'
                              }}
                            />
                          </ListItemButton>
                        </ListItem>
                      ))}
                    </List>
                  </Collapse>
                </>
              ) : (
                <ListItem disablePadding sx={{ mb: 0.8 }}>
                  <ListItemButton
                    sx={{ 
                      borderRadius: 2,
                      py: 1.2,
                      transition: 'all 0.2s ease',
                      '&.Mui-selected': {
                        background: darkMode
                          ? 'linear-gradient(90deg, rgba(25, 118, 210, 0.8), rgba(25, 118, 210, 0.6))'
                          : 'linear-gradient(90deg, rgba(25, 118, 210, 0.9), rgba(25, 118, 210, 0.7))',
                        color: 'white',
                        boxShadow: '0 4px 10px rgba(0, 0, 0, 0.15)',
                        transform: 'translateX(4px)',
                        '& .MuiListItemIcon-root': {
                          color: 'white',
                        },
                        '&:hover': {
                          background: darkMode
                            ? 'linear-gradient(90deg, rgba(21, 101, 192, 0.8), rgba(13, 71, 161, 0.6))'
                            : 'linear-gradient(90deg, rgba(21, 101, 192, 0.9), rgba(21, 101, 192, 0.7))',
                        },
                      },
                      '&:hover': {
                        backgroundColor: darkMode 
                          ? 'rgba(255, 255, 255, 0.08)'
                          : 'rgba(25, 118, 210, 0.08)',
                        transform: 'translateX(4px)',
                      }
                    }}
                    selected={location.pathname === item.path}
                    onClick={() => {
                      navigate(item.path);
                      if (isSmallScreen) {
                        setMobileOpen(false);
                      }
                    }}
                  >
                    <ListItemIcon sx={{ 
                      minWidth: { xs: 36, md: 42 },
                      color: location.pathname === item.path 
                        ? 'inherit' 
                        : darkMode ? 'rgba(255, 255, 255, 0.7)' : 'text.secondary',
                      '& .MuiSvgIcon-root': {
                        transition: 'transform 0.2s ease',
                        transform: location.pathname === item.path ? 'scale(1.1)' : 'scale(1)',
                      }
                    }}>
                      {item.icon}
                    </ListItemIcon>
                    <ListItemText 
                      primary={item.text} 
                      primaryTypographyProps={{ 
                        fontSize: { xs: '0.875rem', md: '0.95rem' },
                        fontWeight: location.pathname === item.path ? 600 : 500,
                        letterSpacing: '0.3px'
                      }}
                    />
                  </ListItemButton>
                </ListItem>
              )}
            </React.Fragment>
          ))}
        </List>
      </Box>
      
      <Box sx={{ 
        p: 2.5, 
        mt: 1.5,
        borderTop: '1px solid',
        borderColor: darkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'
      }}>
        <Button
          variant="contained"
          fullWidth
          color="primary"
          startIcon={<ExitToApp sx={{ fontSize: '1.2rem' }} />}
          onClick={handleLogout}
          sx={{ 
            py: 1.2,
            textTransform: 'none',
            borderRadius: '12px',
            fontWeight: 500,
            fontSize: '0.95rem',
            letterSpacing: '0.3px',
            boxShadow: darkMode 
              ? '0 4px 12px rgba(0, 0, 0, 0.3)' 
              : '0 4px 12px rgba(25, 118, 210, 0.2)',
            background: darkMode
              ? 'linear-gradient(135deg, #1565C0 0%, #0D47A1 100%)'
              : 'linear-gradient(135deg, #1976D2 0%, #1565C0 100%)',
            border: '1px solid',
            borderColor: darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.2)',
            '&:hover': {
              boxShadow: darkMode 
                ? '0 6px 16px rgba(0, 0, 0, 0.4)' 
                : '0 6px 16px rgba(25, 118, 210, 0.3)',
              background: darkMode
                ? 'linear-gradient(135deg, #1976D2 0%, #1565C0 100%)'
                : 'linear-gradient(135deg, #1E88E5 0%, #1976D2 100%)',
              transform: 'translateY(-2px)'
            },
            transition: 'all 0.3s ease'
          }}
        >
          Logout
        </Button>
      </Box>
    </Box>
  );

  const getPageTitle = () => {
    if (location.pathname.includes('/orders/requests')) return 'Order Requests';
    if (location.pathname.includes('/orders/clients')) return 'Client Orders';
    if (location.pathname.includes('/orders/suppliers')) return 'Supplier Orders';
    if (location.pathname.includes('/dashboard')) return 'Dashboard'
    
    const pathSegments = location.pathname.split('/');
    const lastSegment = pathSegments[pathSegments.length - 1];
    
    if (!lastSegment) return 'Dashboard';
    
    return lastSegment.charAt(0).toUpperCase() + lastSegment.slice(1);
  };

  return (
    <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <CssBaseline />
      
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          width: { sm: `calc(100% - ${currentWidth}px)` },
          ml: { sm: `${currentWidth}px` },
          bgcolor: darkMode 
            ? 'rgba(30, 40, 60, 0.85)'
            : 'rgba(255, 255, 255, 0.85)',
          color: 'var(--text-color)',
          borderBottom: '1px solid var(--border-color)',
          backdropFilter: 'blur(10px)',
          zIndex: (theme) => theme.zIndex.drawer + 1,
          boxShadow: '0 2px 10px rgba(0, 0, 0, 0.08)',
        }}
      >
        <Toolbar sx={{ height: { xs: 64, md: 70 } }}>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ 
              mr: 2, 
              display: { sm: 'none' },
              color: 'primary.main',
              bgcolor: 'rgba(25, 118, 210, 0.08)',
              '&:hover': {
                bgcolor: 'rgba(25, 118, 210, 0.15)',
              }
            }}
          >
            <MenuIcon />
          </IconButton>
          
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center',
            py: 1,
            px: { xs: 1.5, sm: 2.5 },
            borderRadius: 2,
            background: darkMode
              ? 'linear-gradient(to right, rgba(25, 118, 210, 0.15), rgba(25, 118, 210, 0.05))'
              : 'linear-gradient(to right, rgba(25, 118, 210, 0.1), rgba(25, 118, 210, 0.02))',
            mr: 2,
            border: '1px solid',
            borderColor: darkMode 
              ? 'rgba(255, 255, 255, 0.05)'
              : 'rgba(25, 118, 210, 0.1)',
            boxShadow: '0 2px 6px rgba(0, 0, 0, 0.03)'
          }}>
            <Typography
              variant="h6"
              component="div"
              sx={{ 
                fontWeight: 600,
                fontSize: { xs: '1rem', md: '1.2rem' },
                color: 'primary.main',
                display: 'flex',
                alignItems: 'center',
                textShadow: darkMode ? '0 1px 2px rgba(0,0,0,0.3)' : 'none',
                letterSpacing: '0.3px'
              }}
            >
              {getPageTitle()}
            </Typography>
          </Box>
          
          <Box sx={{ flexGrow: 1 }} />
          
          <Button
            onClick={handleUserMenuOpen}
            color="inherit"
            sx={{ 
              ml: 2, 
              borderRadius: '12px',
              px: { xs: 1.5, sm: 2 },
              py: 1,
              textTransform: 'none',
              bgcolor: Boolean(userMenuAnchor) 
                ? (darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(25, 118, 210, 0.1)') 
                : (darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(25, 118, 210, 0.05)'),
              '&:hover': { 
                bgcolor: darkMode ? 'rgba(255,255,255,0.15)' : 'rgba(25, 118, 210, 0.15)',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
              },
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              border: '1px solid',
              borderColor: darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(25, 118, 210, 0.1)',
              transition: 'all 0.2s ease',
              boxShadow: '0 2px 5px rgba(0, 0, 0, 0.05)'
            }}
            endIcon={isXsScreen ? undefined : <KeyboardArrowDown />}
          >
            <Avatar
              src={user?.avatar || undefined}
              alt={user?.firstName || user?.email}
              sx={{ 
                width: 36, 
                height: 36,
                fontSize: '0.875rem',
                fontWeight: 'bold',
                bgcolor: 'primary.main',
                color: 'white',
                border: '2px solid',
                borderColor: darkMode ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.9)',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}
            >
              {getInitial(user?.firstName || user?.email || 'U')}
            </Avatar>
            
            {!isXsScreen && (
              <Box sx={{ textAlign: 'left' }}>
              <Typography 
                variant="body2" 
                sx={{ 
                fontWeight: 'medium', 
                lineHeight: 1.2,
                color: darkMode ? 'white' : 'text.primary'
                }}
              >
                {user?.firstName 
                ? `${user.firstName} ${user.lastName || ''}`
                : 'User'}
              </Typography>
                <Typography 
                  variant="caption" 
                  sx={{ 
                    color: darkMode ? 'rgba(255,255,255,0.7)' : 'text.secondary',
                    fontSize: '0.7rem'
                  }}
                >
                  {user?.role || 'Admin'}
                </Typography>
              </Box>
            )}
          </Button>
          
          <Menu
            anchorEl={userMenuAnchor}
            open={Boolean(userMenuAnchor)}
            onClose={handleUserMenuClose}
            PaperProps={{
              elevation: 8,
              sx: { 
                width: 240, 
                mt: 1.5,
                overflow: 'visible',
                borderRadius: 3,
                border: '1px solid',
                borderColor: darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
                boxShadow: darkMode 
                  ? '0 8px 24px rgba(0,0,0,0.3)'
                  : '0 8px 24px rgba(0,0,0,0.12)',
                '&:before': {
                  content: '""',
                  display: 'block',
                  position: 'absolute',
                  top: 0,
                  right: 14,
                  width: 10,
                  height: 10,
                  bgcolor: 'background.paper',
                  borderTop: '1px solid',
                  borderLeft: '1px solid',
                  borderColor: darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
                  transform: 'translateY(-50%) rotate(45deg)',
                  zIndex: 0,
                },
              }
            }}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
            TransitionComponent={Fade}
            transitionDuration={200}
          >
            <Box sx={{ 
              pt: 3, 
              pb: 2, 
              px: 3, 
              mb: 1, 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center',
              background: darkMode
                ? 'linear-gradient(to bottom, rgba(25, 118, 210, 0.15), rgba(25, 118, 210, 0.05))'
                : 'linear-gradient(to bottom, rgba(25, 118, 210, 0.08), rgba(25, 118, 210, 0.02))', 
              borderRadius: '16px',
              borderBottomLeftRadius: 0,
              borderBottomRightRadius: 0,
              marginTop: -1,
              position: 'relative',
              borderBottom: '1px solid',
              borderColor: darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'
            }}>
              <Avatar
                src={user?.avatar || undefined}
                alt={user?.firstName || user?.email}
                sx={{ 
                  width: 60, 
                  height: 60,
                  mb: 1.5,
                  fontSize: '1.5rem',
                  fontWeight: 'bold',
                  bgcolor: 'primary.main',
                  color: 'white',
                  border: '3px solid',
                  borderColor: darkMode ? 'rgba(255,255,255,0.2)' : 'white',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                }}
              >
                {getInitial(user?.firstName || user?.email || 'U')}
              </Avatar>
              
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 0.5 }}>
                  {user?.firstName 
                    ? `${user.firstName} ${user.lastName || ''}`
                    : 'User'}
                </Typography>
                <Typography 
                  variant="caption" 
                  sx={{ 
                    color: darkMode ? 'rgba(255,255,255,0.7)' : 'text.secondary',
                    bgcolor: darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(25, 118, 210, 0.1)',
                    px: 1.5,
                    py: 0.5,
                    borderRadius: 10,
                    fontSize: '0.75rem'
                  }}
                >
                  {user?.role || 'Admin'}
                </Typography>
              </Box>
            </Box>
            
            <Box sx={{ px: 1, py: 1 }}>
              <MenuItem 
                onClick={handleProfileClick} 
                sx={{ 
                  py: 1.5, 
                  px: 2,
                  borderRadius: 2,
                  mx: 1, 
                  '&:hover': { 
                    bgcolor: darkMode 
                      ? 'rgba(255,255,255,0.08)' 
                      : 'rgba(25, 118, 210, 0.08)' 
                  } 
                }}
              >
                <ListItemIcon>
                  <AccountCircle 
                    fontSize="small" 
                    sx={{ 
                      color: 'primary.main', 
                      filter: darkMode ? 'brightness(1.2)' : 'none' 
                    }} 
                  />
                </ListItemIcon>
                <ListItemText 
                  primary="My Profile" 
                  primaryTypographyProps={{ 
                    fontWeight: 500,
                    fontSize: '0.95rem'
                  }} 
                />
              </MenuItem>
            </Box>
            
            <Divider sx={{ 
              my: 1, 
              mx: 2,
              borderColor: darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)' 
            }} />
            
            <Box sx={{ px: 1, pb: 1.5, pt: 0.5 }}>
              <MenuItem 
                onClick={handleLogout} 
                sx={{ 
                  py: 1.5, 
                  px: 2,
                  borderRadius: 2,
                  mx: 1,
                  '&:hover': { 
                    bgcolor: darkMode 
                      ? 'rgba(255,0,0,0.08)' 
                      : 'rgba(255,0,0,0.05)' 
                  }
                }}
              >
                <ListItemIcon>
                  <ExitToApp 
                    fontSize="small" 
                    sx={{ color: theme.palette.error.main }} 
                  />
                </ListItemIcon>
                <ListItemText 
                  primary="Logout" 
                  primaryTypographyProps={{ 
                    color: theme.palette.error.main,
                    fontWeight: 500,
                    fontSize: '0.95rem'
                  }} 
                />
              </MenuItem>
            </Box>
          </Menu>
        </Toolbar>
      </AppBar>
      
      <Box
        component="nav"
        sx={{ 
          width: { sm: currentWidth }, 
          flexShrink: { sm: 0 } 
        }}
        aria-label="dashboard navigation"
      >
        {/* Mobile drawer */}
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true, // Better mobile performance
          }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': { 
              boxSizing: 'border-box', 
              width: currentWidth,
              boxShadow: 3,
              bgcolor: 'var(--drawer-bg)',
              color: 'var(--text-color)',
              borderRight: '1px solid var(--border-color)'
            },
          }}
        >
          {drawer}
        </Drawer>
        
        {/* Desktop drawer */}
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': { 
              boxSizing: 'border-box', 
              width: currentWidth,
              boxShadow: 'none',
              bgcolor: 'var(--drawer-bg)',
              color: 'var(--text-color)',
              borderRight: '1px solid var(--border-color)'
            },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>
      
      {/* Main content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 2, sm: 3 },
          width: { sm: `calc(100% - ${currentWidth}px)` },
          background: darkMode 
            ? 'linear-gradient(135deg, rgba(18, 26, 42, 0.95) 0%, rgba(25, 32, 48, 0.95) 100%)' 
            : 'linear-gradient(135deg, #f5f7fa 0%, #f8f9fc 100%)',
          height: '100vh',
          overflow: 'auto',
          display: 'flex',
          flexDirection: 'column',
          '&::-webkit-scrollbar': {
            width: '8px',
          },
          '&::-webkit-scrollbar-track': {
            background: darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
          },
          '&::-webkit-scrollbar-thumb': {
            background: darkMode ? '#555' : '#bbb',
            borderRadius: '4px',
          },
          '&::-webkit-scrollbar-thumb:hover': {
            background: darkMode ? '#777' : '#999',
          },
          backgroundAttachment: 'fixed',
        }}
      >
        <Toolbar sx={{ mb: { xs: 1.5, sm: 2.5 } }} />
        
        {/* Path breadcrumb indicator */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            mb: 2.5,
            px: 1,
            opacity: 0.85
          }}
        >
          <Typography 
            variant="body2" 
            sx={{ 
              fontWeight: 500, 
              color: darkMode ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <DashboardIcon 
              sx={{ 
                fontSize: '0.9rem', 
                mr: 0.8, 
                opacity: 0.7,
                color: 'primary.main'
              }} 
            />
            Dashboard
            
            {location.pathname !== '/dashboard' && (
              <>
                <Box 
                  component="span" 
                  sx={{ 
                    mx: 0.8, 
                    fontSize: '1.2rem', 
                    lineHeight: 1, 
                    color: darkMode ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)' 
                  }}
                >
                  /
                </Box>
                <Box component="span" sx={{ color: 'primary.main', fontWeight: 600 }}>
                  {getPageTitle()}
                </Box>
              </>
            )}
          </Typography>
        </Box>
        
        <Paper 
          elevation={0}
          sx={{ 
            flexGrow: 1, 
            borderRadius: { xs: 3, sm: 4 },
            p: { xs: 2, sm: 3 },
            bgcolor: darkMode ? 'rgba(30, 40, 60, 0.7)' : 'rgba(255, 255, 255, 0.9)',
            border: '1px solid',
            borderColor: darkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'auto', // Changed from 'hidden' to 'auto' to enable scrolling
            backdropFilter: 'blur(10px)',
            boxShadow: darkMode 
              ? '0 10px 30px rgba(0, 0, 0, 0.2)' 
              : '0 10px 30px rgba(0, 0, 0, 0.05)',
            position: 'relative',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '4px',
              background: 'linear-gradient(90deg, #1565C0, #1976D2, #1E88E5)',
              borderTopLeftRadius: { xs: '12px', sm: '16px' },
              borderTopRightRadius: { xs: '12px', sm: '16px' },
            }
          }}
        >
          <Outlet />
        </Paper>
        
        {/* Small copyright footer */}
        <Box
          sx={{
            mt: 2,
            mb: 1,
            textAlign: 'center',
            opacity: 0.6
          }}
        >
          <Typography
            variant="caption"
            sx={{
              fontSize: '0.7rem',
              color: darkMode ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)'
            }}
          >
            © {new Date().getFullYear()} Opzon's Printers ERP System. All Rights Reserved.
          </Typography>
        </Box>
        
        {/* Theme settings indicator (can be removed in production) */}
        <Box
          sx={{
            position: 'fixed',
            bottom: 16,
            right: 16,
            bgcolor: darkMode ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.8)',
            borderRadius: 2,
            p: 1,
            fontSize: compactView ? '0.7rem' : '0.8rem',
            opacity: 0.8,
            zIndex: 999,
            pointerEvents: 'none',
            color: darkMode ? '#fff' : '#333',
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            cursor: 'default',
            border: '1px solid',
            borderColor: darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            backdropFilter: 'blur(4px)',
            '&:hover': { opacity: 1 }
          }}
        >
        </Box>
      </Box>
    </Box>
  );
};

export default DashboardLayout;