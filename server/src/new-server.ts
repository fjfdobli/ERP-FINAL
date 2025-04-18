import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import net from 'net';

// Load environment variables
dotenv.config();

// Function to find an available port
function findAvailablePort(startPort: number): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    
    server.listen(startPort, () => {
      const port = (server.address() as net.AddressInfo).port;
      server.close(() => {
        resolve(port);
      });
    });
    
    server.on('error', (err: any) => {
      if (err.code === 'EADDRINUSE') {
        findAvailablePort(startPort + 1)
          .then(resolve)
          .catch(reject);
      } else {
        reject(err);
      }
    });
  });
}

// Validate Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL || 'https://iyjfpkcxwljfkxbjagbd.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5amZwa2N4d2xqZmt4YmphZ2JkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MjY2ODk3NSwiZXhwIjoyMDU4MjQ0OTc1fQ.m3Zt4gdwgkvtiqKoz51fqsiSf2Os7W7J8sZccxSwit4';

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase configuration. Please check your .env file.');
  process.exit(1);
}

// Initialize Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

// Extend Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

// Initialize Express app
const app = express();

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Authentication middleware
const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }
  
  try {
    const { data, error } = await supabase.auth.getUser(token);
    
    if (error || !data.user) {
      return res.status(401).json({ success: false, error: 'Invalid token' });
    }
    
    req.user = data.user;
    next();
  } catch (error: any) {
    return res.status(401).json({ success: false, error: error.message });
  }
};

// Basic route
app.get('/', (req: Request, res: Response) => {
  res.send('Printing Press ERP API is running');
});

// Rest of your existing routes remain the same...
// (You can paste all the existing routes from the previous file)

// Server startup function
async function startServer() {
  try {
    // Find an available port, starting from 9999
    const PORT = await findAvailablePort(9999);

    const server = app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log('SIGTERM signal received: closing HTTP server');
      server.close(() => {
        console.log('HTTP server closed');
        process.exit(0);
      });
    });

    return server;
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();

export default app;