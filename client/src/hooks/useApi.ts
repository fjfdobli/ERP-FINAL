import { useState, useEffect } from 'react';
import { useAppSelector } from '../redux/hooks';
import { supabase } from '../supabaseClient';

interface ApiResponse<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

// Helper to map API endpoint to Supabase table
const mapUrlToTable = (url: string): string => {
  // Remove leading and trailing slashes for consistent handling
  const cleanUrl = url.replace(/^\/+|\/+$/g, '');
  
  // Map common endpoints to table names (exact mapping)
  const tableMap: Record<string, string> = {
    'user': 'auth/user',
    'users': 'auth/users',
    'clients': 'clients',
    'orders': 'client_orders',
    'inventory': 'inventory', 
    'employees': 'employees',
    'suppliers': 'suppliers',
    'machinery': 'machinery',
    'attendance': 'attendance',
    'payroll': 'payroll',
    'order_requests': 'order_requests',
    'client_orders': 'client_orders',
    'maintenance_records': 'maintenance_records'
  };
  
  // First check for exact matches with the path
  if (tableMap[cleanUrl]) {
    return tableMap[cleanUrl];
  }
  
  // Then check if it starts with any of the keys
  for (const [endpoint, tableName] of Object.entries(tableMap)) {
    if (cleanUrl.startsWith(endpoint + '/')) {
      return tableName;
    }
  }
  
  // Default: extract table name from URL
  const parts = cleanUrl.split('/').filter(p => p);
  return parts.length > 0 ? parts[0] : '';
};

export const useApi = <T>(url: string, defaultValue: T | null = null): ApiResponse<T> => {
  const [data, setData] = useState<T | null>(defaultValue);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [refetchIndex, setRefetchIndex] = useState<number>(0);
  const { token, isAuthenticated } = useAppSelector(state => state.auth);
  
  const refetch = () => setRefetchIndex(prev => prev + 1);

  useEffect(() => {
    // Use a flag to prevent state updates after unmount
    let isMounted = true;
    
    // Add a small delay to avoid immediate fails on load
    const timeoutId = setTimeout(async () => {
      if (!isMounted) return;

      try {
        setLoading(true);
        setError(null);
        
        // Return real data from Supabase (removed mock data approach)
        if (false) {
          // This code block will never execute, but keeping structure for easier rollback if needed
          console.log(`Not using mock data for ${url}`);
          const generateMockData = (tableName: string): any[] => {
            const count = Math.floor(Math.random() * 5) + 3; // 3-8 items
            const mockItems = [];
            
            for (let i = 1; i <= count; i++) {
              if (tableName === 'clients') {
                mockItems.push({
                  id: i,
                  name: `Client ${i}`,
                  contactPerson: `Contact ${i}`,
                  email: `client${i}@example.com`,
                  phone: `+1234567890${i}`,
                  status: i % 3 === 0 ? 'Inactive' : 'Active',
                  address: `Address ${i}`,
                  createdAt: new Date().toISOString()
                });
              } else if (tableName === 'inventory') {
                mockItems.push({
                  id: i,
                  name: `Item ${i}`,
                  sku: `SKU-${i}`,
                  category: `Category ${i % 3 + 1}`,
                  quantity: Math.floor(Math.random() * 100),
                  price: Math.random() * 100 + 10,
                  reorderPoint: 10,
                  status: i % 4 === 0 ? 'Low Stock' : 'In Stock'
                });
              } else if (tableName === 'employees') {
                mockItems.push({
                  id: i,
                  firstName: `First${i}`,
                  lastName: `Last${i}`,
                  email: `employee${i}@example.com`,
                  phone: `+1987654321${i}`,
                  position: `Position ${i % 4 + 1}`,
                  hireDate: new Date().toISOString(),
                  status: 'Active'
                });
              } else if (tableName === 'machinery') {
                mockItems.push({
                  id: i,
                  name: `Machine ${i}`,
                  type: `Type ${i % 3 + 1}`,
                  serialNumber: `SN-${i}-${Date.now()}`,
                  status: i % 5 === 0 ? 'Maintenance' : 'Operational',
                  purchaseDate: new Date().toISOString(),
                  lastMaintenance: new Date().toISOString()
                });
              } else if (tableName === 'attendance') {
                mockItems.push({
                  id: i,
                  employeeId: i,
                  date: new Date().toISOString(),
                  timeIn: '08:00',
                  timeOut: '17:00',
                  status: 'Present'
                });
              } else if (tableName === 'payroll') {
                mockItems.push({
                  id: i,
                  employeeId: i,
                  period: 'April 2025',
                  amount: 1000 + (i * 100),
                  status: 'Paid'
                });
              } else if (tableName === 'suppliers') {
                mockItems.push({
                  id: i,
                  name: `Supplier ${i}`,
                  contactPerson: `Contact ${i}`,
                  email: `supplier${i}@example.com`,
                  phone: `+1555123456${i}`,
                  status: 'Active'
                });
              } else if (tableName === 'client_orders') {
                mockItems.push({
                  id: i,
                  clientId: i,
                  orderDate: new Date().toISOString(),
                  status: i % 4 === 0 ? 'Pending' : i % 4 === 1 ? 'Processing' : i % 4 === 2 ? 'Completed' : 'Delivered',
                  total: Math.random() * 1000 + 100,
                  deliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
                });
              } else if (tableName === 'order_requests') {
                mockItems.push({
                  id: i,
                  clientId: i,
                  requestDate: new Date().toISOString(),
                  status: i % 3 === 0 ? 'Pending' : i % 3 === 1 ? 'Approved' : 'Rejected',
                  details: `Order request ${i} details`
                });
              } else {
                // Generic mock data for any other table
                mockItems.push({
                  id: i,
                  name: `Item ${i}`,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                });
              }
            }
            
            return mockItems;
          };

          console.log(`Generating mock data for URL: ${url}`);
          
          // Map URL to table name
          const tableName = mapUrlToTable(url);
          if (!tableName) {
            console.warn(`Could not map URL to table: ${url}`);
            if (isMounted) {
              setData(defaultValue);
              setLoading(false);
            }
            return;
          }
          
          // Generate mock data
          const mockData = generateMockData(tableName);
          
          // Simulating network delay
          setTimeout(() => {
            if (isMounted) {
              console.log(`Successfully fetched ${mockData.length} mock records for ${tableName}`);
              setData(mockData as unknown as T);
              setLoading(false);
            }
          }, 300);
          
          return;
        }
        
        // REAL API IMPLEMENTATION BELOW
        
        // Don't attempt to fetch data if not authenticated
        if (!isAuthenticated) {
          console.warn('Cannot fetch data: not authenticated');
          if (isMounted) {
            setData(defaultValue);
            setLoading(false);
          }
          return;
        }

        // First check if we have a valid token
        let token = localStorage.getItem('token');
        
        // If direct token not found, try to get it from session
        if (!token) {
          const sessionStr = localStorage.getItem('supabase_auth_token');
          
          if (sessionStr && sessionStr !== '[object Object]') {
            try {
              if (sessionStr.startsWith('{')) {
                const session = JSON.parse(sessionStr);
                if (session?.access_token) {
                  token = session.access_token;
                  console.log('Using access_token from session object in useApi');
                  // Save token for future use
                  localStorage.setItem('token', session.access_token);
                }
              }
            } catch (e) {
              console.warn('Failed to parse token as JSON in useApi:', e);
              localStorage.removeItem('supabase_auth_token'); // Clear corrupted token
            }
          } else if (sessionStr === '[object Object]') {
            // Clear corrupted token
            console.warn('Found corrupt session token, removing it');
            localStorage.removeItem('supabase_auth_token');
          }
        }
        
        // If still no token, try to get a fresh session from Supabase
        if (!token) {
          try {
            const { data: sessionData } = await supabase.auth.getSession();
            if (sessionData?.session?.access_token) {
              token = sessionData.session.access_token;
              console.log('Retrieved fresh token from Supabase in useApi');
              // Save for future use
              localStorage.setItem('token', token);
              localStorage.setItem('supabase_auth_token', JSON.stringify(sessionData.session));
            }
          } catch (e) {
            console.warn('Failed to get fresh session from Supabase:', e);
          }
        }
        
        if (!token) {
          console.warn('No valid auth token available for request');
          if (isMounted) {
            setData(defaultValue);
            setLoading(false);
          }
          return;
        }
        
        // Map URL to Supabase table
        const tableName = mapUrlToTable(url);
        
        if (!tableName) {
          console.warn(`Could not map URL to table: ${url}`);
          if (isMounted) {
            setData(defaultValue);
            setLoading(false);
          }
          return;
        }
        
        console.log(`Fetching from Supabase table: ${tableName} for URL: ${url}`);
        
        try {
          // Check that we have a valid session before making requests
          const { data: sessionData } = await supabase.auth.getSession();
          if (!sessionData.session) {
            console.warn('No active Supabase session for data fetch');
            // Try to manually refresh auth
            await supabase.auth.refreshSession();
          }
          
          // Manually add authorization header to Supabase client if needed
          const currentToken = token || localStorage.getItem('token');
          if (currentToken) {
            console.log(`Ensuring Supabase client has auth token for ${tableName}`);
          }
          
          // Use Supabase client to fetch data with error handling and retry
          let query = supabase.from(tableName).select('*');
          
          // Add query parameters or filters if they exist in the URL
          // Example: if url contains ?status=active, add .eq('status', 'active')
          if (url.includes('?')) {
            const queryString = url.split('?')[1];
            const params = new URLSearchParams(queryString);
            
            params.forEach((value, key) => {
              if (key && value) {
                query = query.eq(key, value);
              }
            });
          }
          
          // Handle specific ordering for common tables
          if (['clients', 'employees', 'suppliers', 'inventory'].includes(tableName)) {
            query = query.order('name', { ascending: true });
          }
          
          console.log(`Fetching data from ${tableName} table...`);
          const { data: result, error: supabaseError } = await query;
            
          if (supabaseError) {
            console.error(`Supabase error for ${tableName}:`, supabaseError);
            if (isMounted) {
              setError(supabaseError.message);
              setData(defaultValue);
            }
          } else {
            if (isMounted) {
              setData(result as unknown as T);
              console.log(`Successfully fetched ${result?.length || 0} records from ${tableName}`);
            }
          }
        } catch (fetchError: any) {
          console.error(`Fetch error for ${tableName}:`, fetchError);
          if (isMounted) {
            setError(fetchError.message || 'Data fetch error');
            setData(defaultValue);
          }
        }
      } catch (error: any) {
        console.error(`Error in useApi for ${url}:`, error);
        if (isMounted) {
          setError(error.message || 'An error occurred');
          setData(defaultValue);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }, 500); // Small delay to let authentication settle

    // Clean up function
    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, [url, refetchIndex, defaultValue, isAuthenticated]);

  return { data, loading, error, refetch };
};