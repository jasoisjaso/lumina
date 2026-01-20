import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.get('/api', (req, res) => {
  res.json({ message: 'Welcome to the Lumina API!' });
});

app.listen(port, () => {
  console.log(`Backend server is running on http://localhost:${port}`);
});
