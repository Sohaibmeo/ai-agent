import express from 'express';
import bodyParser from 'body-parser';
import planRouter from './routes/plan';
import profileRouter from './routes/profile';
import "reflect-metadata";
import { DataSource } from "typeorm";

const app = express();
app.use(bodyParser.json());

const AppDataSource = new DataSource({
    type: "postgres",
    url: process.env.DATABASE_URL,
    synchronize: true, // Auto-sync database schema
    logging: true,
    entities: ["./entities/*.ts"],
});

AppDataSource.initialize()
    .then(() => {
        console.log("Data Source has been initialized!");
    })
    .catch((err) => {
        console.error("Error during Data Source initialization:", err);
    });

app.get('/', (req, res) => {
  res.send('AI Meal Planning Backend is running');
});

app.use('/api/plan', planRouter);
app.use('/api/user/profile', profileRouter);

if (require.main === module) {
  const PORT = process.env.PORT || 4000;
  app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
  });
}

module.exports = app;
