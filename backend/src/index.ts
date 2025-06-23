import express from 'express';
import connectDB from './db';

const app = express();
connectDB();

// your middleware/routes/etc

app.listen(3000, () => {
  console.log('Server running on port 3000');
});