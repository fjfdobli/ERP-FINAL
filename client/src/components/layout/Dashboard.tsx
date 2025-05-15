import React, { useState, useEffect } from 'react';
import { useNavigate, Outlet, useLocation } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../redux/hooks';
import { logout, getCurrentUser } from '../../redux/slices/authSlice';
import { useThemeContext } from '../../App';
import { 
  AppBar, Box, CssBaseline, Divider, Drawer, IconButton, List, ListItem, 
  ListItemButton, ListItemIcon, ListItemText, Toolbar, Typography, Button, 
  Avatar, Menu, MenuItem, useMediaQuery, Collapse, Fade, Paper, useTheme
} from '@mui/material';
import { 
  Menu as MenuIcon, Dashboard as DashboardIcon, People as ClientsIcon, 
  ShoppingCart as OrdersIcon, Inventory as InventoryIcon, Group as EmployeesIcon, 
  LocalShipping as SuppliersIcon, HowToReg as AttendanceIcon, Build as MachineryIcon, 
  BarChart as ReportsIcon, AccountCircle, ExitToApp, ChevronLeft, 
  ExpandLess, ExpandMore, RequestQuote as RequestIcon, ImportContacts as ClientRequestIcon, 
  Source as SupplierRequestIcon, Payments as PayrollIcon, KeyboardArrowDown,
  Engineering as EngineeringIcon, BuildCircle as BuildIcon
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
  const { darkMode, themeColor, compactView } = useThemeContext();
  
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
      bgcolor: 'var(--drawer-bg)',
    }}>
      <Toolbar sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        py: { xs: 1.5, md: 2 },
        background: darkMode 
          ? `linear-gradient(45deg, #222, #333)`
          : `linear-gradient(45deg, var(--primary-color), var(--secondary-color))`,
        color: 'white',
        position: 'relative'
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
                        borderRadius: theme.shape.borderRadius,
                        mb: 0.5,
                        py: 1,
                        backgroundColor: isOrdersPathActive() 
                          ? 'rgba(25, 118, 210, 0.12)' 
                          : 'transparent',
                        '&:hover': {
                          backgroundColor: 'rgba(25, 118, 210, 0.08)',
                        },
                        transition: 'all 0.2s'
                      }}
                    >
                      <ListItemIcon sx={{ 
                        minWidth: { xs: 36, md: 40 },
                        color: isOrdersPathActive() ? 'primary.main' : 'inherit',
                      }}>
                        {item.icon}
                      </ListItemIcon>
                      <ListItemText 
                        primary={item.text} 
                        primaryTypographyProps={{ 
                          fontSize: { xs: '0.875rem', md: '0.95rem' },
                          fontWeight: isOrdersPathActive() ? 600 : 400
                        }}
                      />
                      {openSubMenu === item.text ? <ExpandLess /> : <ExpandMore />}
                    </ListItemButton>
                  </ListItem>
                  
                  <Collapse in={openSubMenu === item.text} timeout="auto" unmountOnExit>
                    <List component="div" disablePadding>
                      {item.children.map((child) => (
                        <ListItem key={child.text} disablePadding>
                          <ListItemButton
                            sx={{ 
                              pl: { xs: 4, md: 4.5 },
                              borderRadius: theme.shape.borderRadius,
                              mb: 0.5,
                              py: 0.75,
                              transition: 'all 0.2s',
                              '&.Mui-selected': {
                                backgroundColor: 'primary.main',
                                color: 'white',
                                '& .MuiListItemIcon-root': {
                                  color: 'white',
                                },
                                '&:hover': {
                                  backgroundColor: 'primary.dark',
                                },
                              },
                              '&:hover': {
                                backgroundColor: 'rgba(25, 118, 210, 0.08)',
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
                              fontSize: '0.9rem'
                            }}>
                              {child.icon}
                            </ListItemIcon>
                            <ListItemText 
                              primary={child.text} 
                              primaryTypographyProps={{ 
                                fontSize: { xs: '0.8rem', md: '0.875rem' }
                              }}
                            />
                          </ListItemButton>
                        </ListItem>
                      ))}
                    </List>
                  </Collapse>
                </>
              ) : (
                <ListItem disablePadding sx={{ mb: 0.5 }}>
                  <ListItemButton
                    sx={{ 
                      borderRadius: theme.shape.borderRadius,
                      py: 1,
                      transition: 'all 0.2s',
                      '&.Mui-selected': {
                        backgroundColor: 'primary.main',
                        color: 'white',
                        '& .MuiListItemIcon-root': {
                          color: 'white',
                        },
                        '&:hover': {
                          backgroundColor: 'primary.dark',
                        },
                      },
                      '&:hover': {
                        backgroundColor: 'rgba(25, 118, 210, 0.08)',
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
                      minWidth: { xs: 36, md: 40 },
                      color: location.pathname === item.path ? 'inherit' : 'text.secondary'
                    }}>
                      {item.icon}
                    </ListItemIcon>
                    <ListItemText 
                      primary={item.text} 
                      primaryTypographyProps={{ 
                        fontSize: { xs: '0.875rem', md: '0.95rem' },
                        fontWeight: location.pathname === item.path ? 600 : 400
                      }}
                    />
                  </ListItemButton>
                </ListItem>
              )}
            </React.Fragment>
          ))}
        </List>
      </Box>
      
      <Box sx={{ p: 2, mt: 1 }}>
        <Button
          variant="contained"
          fullWidth
          color="primary"
          startIcon={<ExitToApp />}
          onClick={handleLogout}
          sx={{ 
            py: 1,
            textTransform: 'none',
            borderRadius: '8px',
            fontWeight: 500,
            boxShadow: 2,
            '&:hover': {
              boxShadow: 4,
            }
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
          bgcolor: 'var(--appbar-bg)',
          color: 'var(--text-color)',
          borderBottom: '1px solid var(--border-color)',
          backdropFilter: 'blur(8px)',
          zIndex: (theme) => theme.zIndex.drawer + 1,
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
              color: 'primary.main'
            }}
          >
            <MenuIcon />
          </IconButton>
          
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center',
            py: 1,
            px: { xs: 1, sm: 2 },
            borderRadius: 2,
            bgcolor: 'rgba(25, 118, 210, 0.04)',
            mr: 2
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
              borderRadius: 8,
              px: { xs: 1, sm: 2 },
              py: 1,
              textTransform: 'none',
              bgcolor: Boolean(userMenuAnchor) ? 'rgba(0,0,0,0.04)' : 'transparent',
              '&:hover': { bgcolor: 'rgba(0,0,0,0.08)' },
              display: 'flex',
              alignItems: 'center',
              gap: 1
            }}
            endIcon={isXsScreen ? undefined : <KeyboardArrowDown />}
          >
            <Avatar
              src={user?.avatar || undefined}
              alt={user?.firstName || user?.email}
              sx={{ 
                width: 34, 
                height: 34,
                fontSize: '0.875rem',
                fontWeight: 'bold',
                bgcolor: 'primary.main',
                color: 'white'
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
                color: 'text.primary'
                }}
              >
                {user?.firstName 
                ? `${user.firstName} ${user.lastName || ''}`
                : 'User'}
              </Typography>
                <Typography 
                  variant="caption" 
                  sx={{ 
                    color: 'text.secondary',
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
              elevation: 3,
              sx: { 
                width: 220, 
                mt: 1.5,
                overflow: 'visible',
                borderRadius: 2,
                '&:before': {
                  content: '""',
                  display: 'block',
                  position: 'absolute',
                  top: 0,
                  right: 14,
                  width: 10,
                  height: 10,
                  bgcolor: 'background.paper',
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
            <Box sx={{ pt: 2, pb: 1.5, px: 2, mb: 1, display: 'flex', alignItems: 'center' }}>
              <Avatar
                src={user?.avatar || undefined}
                alt={user?.firstName || user?.email}
                sx={{ 
                  width: 40, 
                  height: 40,
                  mr: 1.5,
                  fontSize: '1rem',
                  fontWeight: 'bold',
                  bgcolor: 'primary.main',
                  color: 'white'
                }}
              >
                {getInitial(user?.firstName || user?.email || 'U')}
              </Avatar>
              
              <Box>
                <Typography variant="subtitle2" fontWeight="bold">
                  {user?.firstName 
                    ? `${user.firstName} ${user.lastName || ''}`
                    : 'User'}
                </Typography>
              </Box>
            </Box>
            
            <MenuItem onClick={handleProfileClick} sx={{ py: 1.5 }}>
              <ListItemIcon>
                <AccountCircle fontSize="small" color="primary" />
              </ListItemIcon>
              <ListItemText primary="My Profile" />
            </MenuItem>
            
            <Divider sx={{ my: 1 }} />
            
            <MenuItem onClick={handleLogout} sx={{ py: 1.5 }}>
              <ListItemIcon>
                <ExitToApp fontSize="small" color="error" />
              </ListItemIcon>
              <ListItemText primary="Logout" primaryTypographyProps={{ color: 'error' }} />
            </MenuItem>
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
          backgroundColor: 'var(--background-color)',
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
        }}
      >
        <Toolbar sx={{ mb: { xs: 1, sm: 2 } }} />
        <Paper 
          elevation={0}
          sx={{ 
            flexGrow: 1, 
            borderRadius: 3,
            p: { xs: 2, sm: 3 },
            bgcolor: 'var(--card-bg)',
            border: '1px solid var(--border-color)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'auto' // Changed from 'hidden' to 'auto' to enable scrolling
          }}
        >
          <Outlet />
          
          {/* Small indicator to show active theme settings (can be removed in production) */}
          <Box
            sx={{
              position: 'fixed',
              bottom: 16,
              right: 16,
              bgcolor: 'rgba(0,0,0,0.05)',
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
              '&:hover': { opacity: 1 }
            }}
          >
          </Box>
        </Paper>
      </Box>
    </Box>
  );
};

export default DashboardLayout;