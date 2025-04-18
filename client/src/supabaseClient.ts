import { createClient } from '@supabase/supabase-js';

// Include the full URL with 'https://' protocol
const supabaseUrl = 'https://iyjfpkcxwljfkxbjagbd.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5amZwa2N4d2xqZmt4YmphZ2JkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI2Njg5NzUsImV4cCI6MjA1ODI0NDk3NX0.0fJgoMe23ZPE1Rgz70RFwV31c3qRGnt1Cciz-x_F0io';

// Testing connection on startup
console.log(`Initializing Supabase client for: ${supabaseUrl}`);

// Clear any potentially corrupted sessions
if (typeof localStorage !== 'undefined') {
  if (localStorage.getItem('supabase_auth_token') === '[object Object]') {
    console.log('Found corrupted auth token, clearing it');
    localStorage.removeItem('supabase_auth_token');
    localStorage.removeItem('token');
  }
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storageKey: 'token', // Changed to use 'token' directly
    detectSessionInUrl: true,
    storage: {
      getItem: (key) => {
        try {
          return localStorage.getItem(key);
        } catch (error) {
          console.error('Error in storage.getItem:', error);
          return null;
        }
      },
      setItem: (key, value) => {
        try {
          if (value === '[object Object]' || value === undefined) {
            console.warn('Preventing storage of invalid value');
            return;
          }
          localStorage.setItem(key, value);
        } catch (error) {
          console.error('Error in storage.setItem:', error);
        }
      },
      removeItem: (key) => {
        try {
          localStorage.removeItem(key);
        } catch (error) {
          console.error('Error in storage.removeItem:', error);
        }
      }
    }
  },
  global: {
    headers: {
      'x-application-name': 'opzons-printing-press'
    }
  },
  db: {
    schema: 'public'
  }
});

// Log connection info but don't run test immediately
// This avoids any "bad URL" errors during page load
console.log('Supabase client configured and ready');

// Delay connection test to avoid initial load issues
setTimeout(async () => {
  try {
    console.log('Testing Supabase connection to URL:', supabaseUrl);
    
    // Check for storage corruption first
    if (localStorage.getItem('supabase_auth_token') === '[object Object]') {
      console.warn('Found corrupted auth token during connection test, clearing it');
      localStorage.removeItem('supabase_auth_token');
      localStorage.removeItem('token');
    }
    
    // Check authentication first
    try {
      const { data: authData, error: authError } = await supabase.auth.getSession();
      
      if (authError) {
        console.error('Auth check error during connection test:', authError);
        // Don't try to use the session if there was an error
      } else if (authData?.session) {
        console.log('Active Supabase session found:', authData.session.user.email);
        
        // Store tokens in both formats for compatibility
        localStorage.setItem('token', authData.session.access_token);
        localStorage.setItem('supabase_auth_token', JSON.stringify(authData.session));
        console.log('Session tokens refreshed from active session');
      } else {
        console.log('No active Supabase session, attempting to refresh...');
        
        // Check for existing token to refresh
        const existingToken = localStorage.getItem('token');
        if (existingToken) {
          // Try to refresh the session
          const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
          if (refreshError) {
            console.warn('Session refresh failed:', refreshError.message);
            // Clear invalid tokens
            localStorage.removeItem('token');
            localStorage.removeItem('supabase_auth_token');
          } else if (refreshData?.session) {
            console.log('Session refreshed successfully');
            
            // Store refreshed tokens
            localStorage.setItem('token', refreshData.session.access_token);
            localStorage.setItem('supabase_auth_token', JSON.stringify(refreshData.session));
          }
        } else {
          console.log('No token found for session refresh');
        }
      }
    } catch (authError) {
      console.error('Auth check error:', authError);
    }
    
    // Test database connection regardless of authentication status
    try {
      console.log('Testing database access...');
      const { error } = await supabase.from('clients').select('count');
      
      if (error) {
        console.warn('Database access test failed:', error.message);
        if (error.message.includes('JWT') || error.message.includes('token') || 
            error.message.includes('auth') || error.message.includes('permission')) {
          console.warn('Auth-related database access error, clearing tokens');
          localStorage.removeItem('token');
          localStorage.removeItem('supabase_auth_token');
        }
      } else {
        console.log('Database access test successful');
      }
    } catch (dbError: any) {
      console.warn('Database access test error:', dbError);
      // If it's an auth-related error, clear tokens
      if (dbError.message && (
          dbError.message.includes('JWT') || 
          dbError.message.includes('token') || 
          dbError.message.includes('auth') || 
          dbError.message.includes('permission'))) {
        console.warn('Auth-related database error, clearing tokens');
        localStorage.removeItem('token');
        localStorage.removeItem('supabase_auth_token');
      }
    }
  } catch (error) {
    console.warn('Supabase connection check failed:', error);
  }
}, 1000); // Reduced delay to 1 second for faster startup

export const testTableAccess = async () => {
  try {
    const { error: versionError } = await supabase.rpc('version');
    
    if (versionError) {
      console.error('Cannot connect to Supabase:', versionError);
      return { success: false, message: 'Connection error', error: versionError };
    }
  
    const { data: testData, error } = await supabase
      .from('clients')
      .select('*')
      .limit(1);
    
    if (error) {
      console.error('Cannot access clients table:', error);
      return { success: false, message: 'Table access error', error };
    }
    
    return { 
      success: true, 
      message: 'Successfully accessed clients table',
      data: testData
    };
  } catch (err) {
    console.error('Unexpected error testing table access:', err);
    return { success: false, message: 'Test failed', error: err };
  }
};

// Function to diagnose suppliers table schema
export const testSupplierColumns = async () => {
  console.log('Testing supplier table columns...');
  try {
    // Try to get a single record to see what columns exist
    const { data, error } = await supabase
      .from('suppliers')
      .select('*')
      .limit(1);

    if (error) {
      console.error('Error accessing suppliers table:', error);
      return { success: false, message: 'Cannot access suppliers table', error };
    }

    if (!data || data.length === 0) {
      // If no records, try to insert a minimal one to check column names
      const testSupplier = {
        name: 'Test Supplier',
        // Try different column name variations
        contactPerson: 'Test Contact',
        contactperson: 'Test Contact',
        contact_person: 'Test Contact'
      };

      console.log('No suppliers found, trying to create test supplier:', testSupplier);
      
      const { data: insertData, error: insertError } = await supabase
        .from('suppliers')
        .insert([testSupplier])
        .select();

      if (insertError) {
        console.error('Error creating test supplier:', insertError);
        return { 
          success: false, 
          message: 'Failed to create test supplier', 
          error: insertError,
          attemptedColumns: Object.keys(testSupplier)
        };
      }

      console.log('Successfully created test supplier, columns accepted:', insertData);
      return {
        success: true,
        message: 'Successfully created test supplier',
        data: insertData
      };
    }

    // If we have data, analyze what columns are available
    console.log('Found supplier record, available columns:', Object.keys(data[0]));
    
    return {
      success: true,
      message: 'Found existing supplier record',
      availableColumns: Object.keys(data[0]),
      sampleData: data[0]
    };
  } catch (err) {
    console.error('Unexpected error testing supplier columns:', err);
    return { success: false, message: 'Supplier column test failed', error: err };
  }
};

export const validateSchema = async () => {
  try {
    const { data: error } = await supabase
      .from('clients')
      .select('id, name, contactPerson, email, phone, status')
      .limit(1);
      
    if (error) {
      return { 
        success: false, 
        message: 'Error accessing required tables/columns', 
        error 
      };
    }

    const tables = ['clients', 'order_requests', 'order_request_items'];
    const tableChecks = await Promise.all(
      tables.map(async (table) => {
        const { error: tableError } = await supabase
          .from(table)
          .select('count')
          .limit(1);
          
        return { table, exists: !tableError };
      })
    );
    
    const missingTables = tableChecks.filter(t => !t.exists).map(t => t.table);
    
    if (missingTables.length > 0) {
      return {
        success: false,
        message: `Missing required tables: ${missingTables.join(', ')}`,
        missingTables
      };
    }
    
    return {
      success: true,
      message: 'Database schema validation passed',
      tables: tableChecks
    };
  } catch (err) {
    console.error('Unexpected error validating schema:', err);
    return { success: false, message: 'Schema validation failed', error: err };
  }
};

export const runMigrations = async () => {
  try {
    // First, add the camelCase updatedAt column if it doesn't exist
    const updateCamelCaseQuery = `
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name = 'clients' AND column_name = 'updatedAt') THEN
          ALTER TABLE clients ADD COLUMN "updatedAt" timestamp DEFAULT now();
        END IF;
      END
      $$;
    `;
    
    const { error: camelCaseError } = await supabase.rpc('pg_query', { query: updateCamelCaseQuery });
    
    if (camelCaseError) {
      return { success: false, message: 'Failed to add updatedAt column', error: camelCaseError };
    }
    
    // Now add snake_case updated_at column for compatibility
    const updateSnakeCaseQuery = `
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name = 'clients' AND column_name = 'updated_at') THEN
          ALTER TABLE clients ADD COLUMN updated_at timestamp DEFAULT now();
        END IF;
      END
      $$;
    `;
    
    const { error: snakeCaseError } = await supabase.rpc('pg_query', { query: updateSnakeCaseQuery });
    
    if (snakeCaseError) {
      return { success: false, message: 'Failed to add updated_at column', error: snakeCaseError };
    }
    
    const triggerQuery = `
      CREATE OR REPLACE FUNCTION update_modified_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW."updatedAt" = now();
        NEW.updated_at = now();
        RETURN NEW;
      END;
      $$ language 'plpgsql';

      DROP TRIGGER IF EXISTS update_clients_modtime ON clients;

      CREATE TRIGGER update_clients_modtime
      BEFORE UPDATE ON clients
      FOR EACH ROW
      EXECUTE FUNCTION update_modified_column();
    `;
    
    const { error: triggerError } = await supabase.rpc('pg_query', { query: triggerQuery });
    
    if (triggerError) {
      return { 
        success: false, 
        message: 'Failed to create update trigger', 
        error: triggerError 
      };
    }
    
    return { success: true, message: 'Migrations completed successfully' };
  } catch (err) {
    console.error('Error running migrations:', err);
    return { success: false, message: 'Migration execution failed', error: err };
  }
};