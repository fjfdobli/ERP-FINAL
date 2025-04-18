import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '../redux/hooks';
import { getCurrentUser, setUser } from '../redux/slices/authSlice';
import LoadingScreen from './common/LoadingScreen';
import { supabase } from '../supabaseClient';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, loading, user } = useAppSelector((state) => state.auth);
  const [initialChecked, setInitialChecked] = useState(false);
  const [authenticating, setAuthenticating] = useState(true);
  const [authAttempts, setAuthAttempts] = useState(0);
  const dispatch = useAppDispatch();

  // Check auth status when component loads
  useEffect(() => {
    const checkAuth = async () => {
      if (!isAuthenticated) {
        try {
          // First, check for token directly since it's most reliable
          const token = localStorage.getItem('token');
          
          if (token) {
            console.log("Found direct token in ProtectedRoute, authenticating...");
            try {
              // Try authenticating with the token without any session check
              await dispatch(getCurrentUser());
              return; // If successful, exit early
            } catch (tokenAuthError) {
              console.error("Direct token auth failed:", tokenAuthError);
              // Continue to check session if direct token auth failed
            }
          }
          
          // Check for session directly with Supabase as fallback
          console.log("Checking Supabase session in ProtectedRoute...");
          const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
          
          if (sessionError) {
            console.error("Session retrieval error:", sessionError);
          } else if (sessionData?.session?.access_token) {
            console.log("Found Supabase session, storing and authenticating...");
            localStorage.setItem('token', sessionData.session.access_token);
            await dispatch(getCurrentUser());
          } else {
            console.log("No active auth session found");
          }
        } catch (error) {
          console.error("Auth check failed:", error);
        }
      }
      
      setAuthenticating(false);
      setInitialChecked(true);
    };
    
    checkAuth();
  }, [dispatch, isAuthenticated]);

  // Track authentication attempts to prevent infinite loops
  useEffect(() => {
    if (!isAuthenticated && !loading && initialChecked) {
      const token = localStorage.getItem('token');
      if (token && authAttempts < 3) {
        console.log(`Authentication attempt ${authAttempts + 1} with saved token...`);
        setAuthAttempts(prev => prev + 1);
        dispatch(getCurrentUser());
      }
    }
  }, [dispatch, isAuthenticated, loading, initialChecked, authAttempts]);

  // Show loading screen during initial check or when explicitly loading
  if (authenticating || (loading && !initialChecked)) {
    return <LoadingScreen />;
  }
  
  // Only redirect to login if not authenticated AND we've tried multiple times
  if (!isAuthenticated && authAttempts >= 3) {
    console.log("Max auth attempts reached, redirecting to login");
    return <Navigate to="/login" replace />;
  }
  
  // Important: Even if not fully authenticated, render the children
  // This prevents redirects when reloading the page
  // The app will try to reauthenticate in the background
  return <>{children}</>;
};

export default ProtectedRoute;