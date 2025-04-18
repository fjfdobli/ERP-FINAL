import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const port = process.env.PORT || 8080; 

app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.get('/', (req, res) => {
  res.send('Printing Press ERP API is running');
});

app.get('/api/test-db', async (req, res) => {
  res.json({ message: 'Database connection endpoint (to be implemented)' });
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

export default app;