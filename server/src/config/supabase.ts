import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = 'https://iyjfpkcxwljfkxbjagbd.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5amZwa2N4d2xqZmt4YmphZ2JkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MjY2ODk3NSwiZXhwIjoyMDU4MjQ0OTc1fQ.m3Zt4gdwgkvtiqKoz51fqsiSf2Os7W7J8sZccxSwit4';

export const supabase = createClient(supabaseUrl, supabaseKey);

export const checkConnection = async () => {
  try {
    const { data, error } = await supabase.from('clients').select('*');
    
    if (error) {
      return { 
        success: false, 
        message: error.message, 
        error 
      };
    }
    
    return {
      success: true,
      message: 'Successfully connected to Supabase database',
      count: data?.length || 0,
      sample: data?.length > 0 ? data[0] : null
    };
  } catch (err) {
    const error = err as Error;
    return { 
      success: false, 
      message: error.message, 
      error 
    };
  }
};