import express from 'express';
import cors from 'cors';
import { orchestrator } from './orchestrator';
import { reviewAgent } from './agents/reviewAgent';
import { ReviewInstructionSchema } from './schemas';

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/users/:userId', (req, res) => {
  try {
    const user = orchestrator.getUser(req.params.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    const latestPlan = user.lastPlanId ? orchestrator.getPlan(user.lastPlanId) : undefined;
    const shoppingList = latestPlan ? orchestrator.getShoppingList(latestPlan.id) : undefined;
    res.json({ user, latestPlan, shoppingList });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

app.put('/api/users/:userId/profile', (req, res) => {
  try {
    const updated = orchestrator.upsertUserProfile(req.params.userId, req.body);
    res.json(updated.profile);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

app.put('/api/users/:userId/preferences', (req, res) => {
  try {
    const updated = orchestrator.upsertUserPreferences(req.params.userId, req.body);
    res.json(updated.preferences);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

app.post('/api/review/interpret', (req, res) => {
  const { feedback } = req.body as { feedback?: string };
  if (!feedback) {
    return res.status(400).json({ error: 'feedback is required' });
  }
  try {
    const instruction = reviewAgent.interpretFeedback(feedback);
    res.json(instruction);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

app.post('/api/plan/generate-week', (req, res) => {
  try {
    const { userId } = req.body as { userId?: string };
    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }
    const result = orchestrator.generateNewWeek(userId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

app.post('/api/plan/apply-instruction', (req, res) => {
  try {
    const { userId, instruction } = req.body as {
      userId?: string;
      instruction?: unknown;
    };
    if (!userId || !instruction) {
      return res.status(400).json({ error: 'userId and instruction are required' });
    }
    const parsedInstruction = ReviewInstructionSchema.parse(instruction);
    const result = orchestrator.applyInstruction(userId, parsedInstruction);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

app.get('/api/plan/:planId/shopping-list', (req, res) => {
  try {
    const list = orchestrator.getShoppingList(req.params.planId);
    if (!list) {
      return res.status(404).json({ error: 'Shopping list not found' });
    }
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

const port = process.env.PORT || 4000;
app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Server listening on http://localhost:${port}`);
});
