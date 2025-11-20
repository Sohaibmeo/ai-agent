
import express from 'express';
import bodyParser from 'body-parser';
import planRouter from './routes/plan';
import profileRouter from './routes/profile';

const app = express();
app.use(bodyParser.json());

app.get('/', (req, res) => {
  res.send('AI Meal Planning Backend is running');
});

app.use('/api/plan', planRouter);
app.use('/api/user/profile', profileRouter);

const PORT = process.env.PORT || 4000;

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
  });
}

export default app;
