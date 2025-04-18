import axios from 'axios';
import { supabase } from '../../supabaseClient';

// Use Supabase API URL as the base for our API
// This is a bridge implementation to migrate from axios to supabase
const API_URL = 'https://iyjfpkcxwljfkxbjagbd.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5amZwa2N4d2xqZmt4YmphZ2JkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI2Njg5NzUsImV4cCI6MjA1ODI0NDk3NX0.0fJgoMe23ZPE1Rgz70RFwV31c3qRGnt1Cciz-x_F0io';

// Log important connection info
console.log(`API Client connecting to: ${API_URL}`);

// Create axios instance with the base URL and proper headers
const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
    'apikey': SUPABASE_KEY,
    'Prefer': 'return=representation'
  }
});

// Map API endpoints to Supabase tables
const endpointTableMap = {
  '/user': '/auth/v1/user',
  '/clients': '/rest/v1/clients',
  '/orders': '/rest/v1/client_orders',
  '/inventory': '/rest/v1/inventory',
  '/employees': '/rest/v1/employees',
  '/suppliers': '/rest/v1/suppliers',
  '/machinery': '/rest/v1/machinery',
  '/attendance': '/rest/v1/attendance',
  '/payroll': '/rest/v1/payroll',
  '/order_requests': '/rest/v1/order_requests',
  '/client_orders': '/rest/v1/client_orders',
  '/maintenance_records': '/rest/v1/maintenance_records'
};

// Add request interceptor to include auth token
apiClient.interceptors.request.use(
  async (config) => {
    // First, try to get token directly
    let token = localStorage.getItem('token');
    
    // If no direct token, try to parse from supabase_auth_token
    if (!token) {
      const sessionStr = localStorage.getItem('supabase_auth_token');
      if (sessionStr && sessionStr !== '[object Object]') {
        try {
          if (sessionStr.startsWith('{')) {
            const session = JSON.parse(sessionStr);
            if (session?.access_token) {
              token = session.access_token;
              // Save direct token for future use
              localStorage.setItem('token', session.access_token);
              console.log('Using and saving access_token from parsed session object');
            }
          }
        } catch (e) {
          console.warn('Failed to parse token as JSON:', e);
          // Token parsing failed, remove potentially corrupted token
          localStorage.removeItem('supabase_auth_token');
        }
      }
    }
    
    // Try to get token from supabase client as a last resort
    if (!token) {
      try {
        const { data } = await supabase.auth.getSession();
        if (data?.session?.access_token) {
          token = data.session.access_token;
          localStorage.setItem('token', token);
          localStorage.setItem('supabase_auth_token', JSON.stringify(data.session));
          console.log('Retrieved token from active supabase session');
        }
      } catch (e) {
        console.warn('Failed to get session from supabase client:', e);
      }
    }
               
    if (token) {
      console.log('Setting Authorization header with token');
      config.headers.Authorization = `Bearer ${token}`;
    } else {
      console.warn('No auth token found for request');
    }
    
    // Handle missing paths by redirecting to Supabase tables
    let url = config.url || '';
    
    // Find matching endpoint prefix
    let mappedUrl = null;
    for (const [endpoint, supabasePath] of Object.entries(endpointTableMap)) {
      if (url.startsWith(endpoint)) {
        // Replace the endpoint prefix with Supabase path
        mappedUrl = supabasePath + url.substring(endpoint.length);
        break;
      }
    }
    
    if (mappedUrl) {
      console.log(`Routing request: ${url} → ${mappedUrl}`);
      config.url = mappedUrl;
    } else {
      // Default to REST API if no specific mapping is found
      if (!url.startsWith('/rest/v1/') && !url.startsWith('/auth/')) {
        // Extract table name from url
        const parts = url.split('/').filter(p => p);
        if (parts.length > 0) {
          const tableName = parts[0];
          const newUrl = `/rest/v1/${tableName}${url.substring(tableName.length + 1)}`;
          console.log(`Default routing: ${url} → ${newUrl}`);
          config.url = newUrl;
        }
      }
    }
    
    // Ensure we have Range header for potential pagination
    if (!config.headers.Range) {
      config.headers.Range = '0-999';
    }
    
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle errors
apiClient.interceptors.response.use(
  (response) => {
    // Log successful responses for debugging
    console.log(`${response.config.method?.toUpperCase()} ${response.config.url} - Status: ${response.status}`);
    return response;
  },
  (error) => {
    // Handle 401 unauthorized errors (but don't automatically redirect)
    if (error.response && error.response.status === 401) {
      console.error('Authentication error:', error.response.data);
      // Don't remove tokens or redirect automatically - let the auth components handle this
      // This prevents redirect loops when multiple API calls fail
    } else if (error.response) {
      // Log detailed error information for debugging
      console.error(`API Error ${error.response.status}:`, error.response.data);
    } else if (error.request) {
      // Network error
      console.error('Network error:', error.message);
    } else {
      console.error('API client error:', error.message);
    }
    return Promise.reject(error);
  }
);

// Direct access to Supabase client functions
// Define as separate object to avoid TypeScript errors with Axios instance
export const supabaseApi = {
  // Auth operations
  signIn: async (email: string, password: string) => {
    return await supabase.auth.signInWithPassword({ email, password });
  },
  signUp: async (email: string, password: string, userData?: any) => {
    return await supabase.auth.signUp({ 
      email, 
      password,
      options: { data: userData }
    });
  },
  signOut: async () => {
    return await supabase.auth.signOut();
  },
  getUser: async () => {
    return await supabase.auth.getUser();
  },
  
  // Table operations - more direct than going through axios
  from: (table: string) => supabase.from(table)
};

export default apiClient;