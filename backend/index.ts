import planRouter from './routes/plan';
app.use('/api/plan', planRouter);
import express from 'express';
import bodyParser from 'body-parser';

const app = express();
app.use(bodyParser.json());

app.get('/', (req, res) => {
  res.send('AI Meal Planning Backend is running');
});


import profileRouter from './routes/profile';
app.use('/api/user/profile', profileRouter);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
