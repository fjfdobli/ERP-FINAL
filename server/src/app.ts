import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { checkConnection, supabase } from './config/supabase';

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Test route
app.get('/', (req, res) => {
  res.send('Printing Press ERP API is running');
});

// Test Supabase connection
app.get('/api/test-db', async (req, res) => {
  const result = await checkConnection();
  res.json(result);
});

// Get all clients example
app.get('/api/clients', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('clients')
      .select('*');
    
    if (error) {
      return res.status(400).json({ success: false, error: error.message });
    }
    
    return res.status(200).json({
      success: true,
      count: data?.length || 0,
      data: data || []
    });
  } catch (err) {
    const error = err as Error;
    return res.status(500).json({ 
      success: false, 
      error: error.message || 'An unknown error occurred' 
    });
  }
});

export default app;