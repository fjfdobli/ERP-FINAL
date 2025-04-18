import React, { useEffect, ReactNode, createContext, useState, useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Provider } from 'react-redux';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { store } from './redux/store';
import { useAppDispatch, useAppSelector } from './redux/hooks';
import { getCurrentUser } from './redux/slices/authSlice';
import { supabase } from './supabaseClient';
import defaultTheme from './theme';
import Login from './pages/Login';
import Register from './pages/Register';
import AuthConfirm from './pages/AuthConfirm';
import ResetPassword from './pages/ResetPassword';
import DashboardLayout from './components/layout/Dashboard';
import DashboardHome from './pages/DashboardHome';
import ClientsList from './pages/Clients';
import OrderRequestsList from './pages/Orders/OrderRequest';
import ClientOrdersList from './pages/Orders/ClientOrders';
import ProductProfile from './pages/Orders/ProductProfile';
import InventoryList from './pages/Inventory';
import EmployeesList from './pages/Employees';
import SuppliersList from './pages/Suppliers';
import Payroll from './pages/Payroll';
import MachineryList from './pages/Machinery';
import ReportsList from './pages/Reports';
import NotFound from './pages/NotFound';
import LoadingScreen from './components/common/LoadingScreen';
import AttendanceList from './pages/Attendance';
import ProtectedRouteComponent from './components/ProtectedRoute';
interface ProtectedRouteProps {
  children: ReactNode;
}

// Use the ProtectedRoute from components/ProtectedRoute.tsx instead
// This is just an import wrapper to avoid duplicating code

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  return <ProtectedRouteComponent children={children} />;
};

// Create Theme Context
type ThemeContextType = {
  darkMode: boolean;
  setDarkMode: (value: boolean) => void;
  themeColor: string;
  setThemeColor: (value: string) => void;
  compactView: boolean;
  setCompactView: (value: boolean) => void;
  applySettings: (settings: any) => void;
};

export const ThemeContext = createContext<ThemeContextType>({
  darkMode: false,
  setDarkMode: () => {},
  themeColor: 'default',
  setThemeColor: () => {},
  compactView: false,
  setCompactView: () => {},
  applySettings: () => {}
});

// Theme Provider Component
const ThemeContextProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [darkMode, setDarkMode] = useState(false);
  const [themeColor, setThemeColor] = useState('default');
  const [compactView, setCompactView] = useState(false);
  
  // Apply theme classes to body
  useEffect(() => {
    if (darkMode) {
      document.body.classList.add('dark-mode');
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.body.classList.remove('dark-mode');
      document.documentElement.setAttribute('data-theme', 'light');
    }
  }, [darkMode]);
  
  // Apply compact view
  useEffect(() => {
    if (compactView) {
      document.body.classList.add('compact-view');
    } else {
      document.body.classList.remove('compact-view');
    }
  }, [compactView]);
  
  // Apply theme colors
  useEffect(() => {
    const themeColors = {
      default: { primary: '#1976d2', secondary: '#115293' },
      green: { primary: '#2e7d32', secondary: '#1b5e20' },
      purple: { primary: '#7b1fa2', secondary: '#4a148c' },
      teal: { primary: '#00796b', secondary: '#004d40' },
      orange: { primary: '#ef6c00', secondary: '#e65100' }
    };
    
    const selectedTheme = themeColors[themeColor as keyof typeof themeColors] || themeColors.default;
    document.documentElement.style.setProperty('--primary-color', selectedTheme.primary);
    document.documentElement.style.setProperty('--secondary-color', selectedTheme.secondary);
  }, [themeColor]);
  
  // Function to apply all settings from user profile
  const applySettings = (settings: any) => {
    if (!settings) return;
    
    if (settings.darkMode !== undefined) setDarkMode(settings.darkMode);
    if (settings.theme) setThemeColor(settings.theme);
    if (settings.compactView !== undefined) setCompactView(settings.compactView);
    
    // Apply other settings like auto logout, etc.
    if (settings.autoLogout && settings.logoutTime) {
      setupAutoLogout(settings.logoutTime);
    }
  };
  
  // Setup auto logout timer
  const setupAutoLogout = (logoutTimeMinutes: number) => {
    console.log(`Auto logout enabled: ${logoutTimeMinutes} minutes`);
    
    // In a real app, this would set up inactivity detection and auto logout
    const inactivityTime = logoutTimeMinutes * 60 * 1000;
    let timer: NodeJS.Timeout;
    
    const resetTimer = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        console.log('Auto logout triggered');
        // Would dispatch logout action here in a real implementation
      }, inactivityTime);
    };
    
    // Set up event listeners
    window.addEventListener('mousemove', resetTimer);
    window.addEventListener('keypress', resetTimer);
    window.addEventListener('click', resetTimer);
    
    // Initial timer start
    resetTimer();
    
    return () => {
      window.removeEventListener('mousemove', resetTimer);
      window.removeEventListener('keypress', resetTimer);
      window.removeEventListener('click', resetTimer);
      clearTimeout(timer);
    };
  };
  
  return (
    <ThemeContext.Provider value={{ 
      darkMode, 
      setDarkMode, 
      themeColor, 
      setThemeColor, 
      compactView, 
      setCompactView,
      applySettings
    }}>
      {children}
    </ThemeContext.Provider>
  );
};

// Custom hook to use the theme context
export const useThemeContext = () => useContext(ThemeContext);

// App Initializer for authentication and settings
const AppInitializer: React.FC = () => {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector(state => state.auth);
  const { applySettings } = useThemeContext();

  // Handle authentication
  useEffect(() => {
    const checkAuth = async () => {
      // Try to get session directly from Supabase first
      try {
        // Check for storage corruption first
        if (localStorage.getItem('supabase_auth_token') === '[object Object]') {
          console.warn('Found corrupted auth token in App.tsx, clearing it');
          localStorage.removeItem('supabase_auth_token');
          localStorage.removeItem('token');
        }
        
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Session retrieval error:', sessionError);
          if (!user) return; // Don't proceed if there's an error and we're not logged in
        }
        
        if (sessionData?.session?.access_token) {
          // Make sure token is in localStorage for API calls
          localStorage.setItem('token', sessionData.session.access_token);
          localStorage.setItem('supabase_auth_token', JSON.stringify(sessionData.session));
          console.log('Valid session found in App.tsx, authenticating...');
          
          // If not already authenticated, get current user
          if (!user) {
            dispatch(getCurrentUser());
          }
        } else {
          // Fallback to token if available
          const token = localStorage.getItem('token');
          const sessionStr = localStorage.getItem('supabase_auth_token');
          
          if (token && !user) {
            console.log('Direct token found in App.tsx, authenticating...');
            dispatch(getCurrentUser());
          } else if (sessionStr && sessionStr !== '[object Object]' && !user) {
            try {
              const parsedSession = JSON.parse(sessionStr);
              if (parsedSession?.access_token) {
                console.log('Session token found in App.tsx, authenticating...');
                localStorage.setItem('token', parsedSession.access_token);
                dispatch(getCurrentUser());
              }
            } catch (e) {
              console.error('Error parsing session in App.tsx:', e);
              localStorage.removeItem('supabase_auth_token');
            }
          }
        }
      } catch (error) {
        console.error('Auth session check error in App.tsx:', error);
        // Don't attempt automatic authentication on error to prevent loops
      }
    };
    
    // Run auth check
    checkAuth();
    
    // Listen for auth state changes from Supabase
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state change:', event);
        if (event === 'SIGNED_IN' && session) {
          console.log('Auth state change: SIGNED_IN - updating tokens and fetching user');
          
          // Update local storage with session tokens
          localStorage.setItem('token', session.access_token);
          localStorage.setItem('supabase_auth_token', JSON.stringify(session));
          
          // Wait a moment for auth to fully propagate
          await new Promise(resolve => setTimeout(resolve, 200));
          
          // Get user data if not already authenticated
          if (!user) {
            console.log('No existing user data, fetching after sign in event');
            dispatch(getCurrentUser());
          }
        } else if (event === 'TOKEN_REFRESHED' && session) {
          console.log('Auth state change: TOKEN_REFRESHED - updating tokens');
          
          // Update local storage with refreshed tokens
          localStorage.setItem('token', session.access_token);
          localStorage.setItem('supabase_auth_token', JSON.stringify(session));
        } else if (event === 'SIGNED_OUT') {
          console.log('Auth state change: SIGNED_OUT - clearing tokens');
          
          // Clear tokens
          localStorage.removeItem('token');
          localStorage.removeItem('supabase_auth_token');
        } else if (event === 'USER_UPDATED' && session) {
          console.log('Auth state change: USER_UPDATED');
          
          // Update local storage with session tokens
          localStorage.setItem('token', session.access_token);
          localStorage.setItem('supabase_auth_token', JSON.stringify(session));
          
          // Refresh user data to reflect the changes
          dispatch(getCurrentUser());
        }
      }
    );
    
    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, [dispatch, user]);
  
  // Apply user settings when user data is loaded
  useEffect(() => {
    if (user?.settings) {
      console.log('Applying user settings from profile');
      applySettings(user.settings);
    }
  }, [user, applySettings]);

  return null;
};

const AppContent: React.FC = () => {
  return (
    <>
      <AppInitializer />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/auth/confirm" element={<AuthConfirm />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/" element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardHome />} />
          <Route path="clients" element={<ClientsList />} />
          <Route path="orders/requests" element={<OrderRequestsList />} />
          <Route path="orders/clients" element={<ClientOrdersList />} />
          <Route path="orders/products" element={<ProductProfile />} />
          <Route path="inventory" element={<InventoryList />} />
          <Route path="employees" element={<EmployeesList />} />
          <Route path="payroll" element={<Payroll />} />
          <Route path="suppliers" element={<SuppliersList />} />
          <Route path="machinery" element={<MachineryList />} />
          <Route path="reports" element={<ReportsList />} />
          <Route path="attendance" element={<AttendanceList />} />
        </Route>

        {/* 404 Route */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
};

const App: React.FC = () => {
  // Create a dynamic theme using the current theme settings
  const [muiTheme, setMuiTheme] = useState(defaultTheme);
  
  return (
    <Provider store={store}>
      <ThemeContextProvider>
        <ThemeProvider theme={muiTheme}>
          <CssBaseline />
          <Router>
            <AppContent />
          </Router>
        </ThemeProvider>
      </ThemeContextProvider>
    </Provider>
  );
};

export default App;