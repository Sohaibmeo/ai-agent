import 'dotenv/config';
import express from 'express';
import cors from 'cors';

import ingredientRoutes from './api/ingredientRoutes.js';
import planRoutes from './api/planRoutes.js';
import recipeRoutes from './api/recipeRoutes.js';
import shoppingListRoutes from './api/shoppingListRoutes.js';
import userRoutes from './api/userRoutes.js';

const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.use('/api/user', userRoutes);
app.use('/api/plan', planRoutes);
app.use('/api/ingredients', ingredientRoutes);
app.use('/api/recipes', recipeRoutes);
app.use('/api/shopping-list', shoppingListRoutes);

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: (err as Error).message });
});

const port = Number(process.env.PORT ?? 3000);
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
