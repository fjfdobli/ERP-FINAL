console.log('Starting server on port 8888');
import express from 'express';
const app = express();
const PORT = 8888;
app.get('/', (req, res) => {
  res.send('Test server running');
});
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
