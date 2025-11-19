import express from 'express';
import cors from 'cors';
import { v4 as uuid } from 'uuid';
import { orchestrator } from './orchestrator';
import { reviewAgent } from './agents/reviewAgent';
import { ReviewInstructionSchema } from './schemas';
import { logger } from './logger';

const app = express();
app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  const requestId = (req.headers['x-request-id'] as string) ?? uuid();
  const start = Date.now();
  res.on('finish', () => {
    logger.info(
      {
        requestId,
        method: req.method,
        path: req.originalUrl,
        statusCode: res.statusCode,
        durationMs: Date.now() - start
      },
      'request.completed'
    );
  });
  next();
});

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/users/:userId', (req, res) => {
  try {
    const log = logger.child({ route: 'get-user', userId: req.params.userId });
    log.info('Fetching user');
    const user = orchestrator.getUser(req.params.userId);
    if (!user) {
      log.warn('User not found');
      return res.status(404).json({ error: 'User not found' });
    }
    const latestPlan = user.lastPlanId ? orchestrator.getPlan(user.lastPlanId) : undefined;
    const shoppingList = latestPlan ? orchestrator.getShoppingList(latestPlan.id) : undefined;
    res.json({ user, latestPlan, shoppingList });
  } catch (error) {
    logger.error(
      { route: 'get-user', error: (error as Error).message, stack: (error as Error).stack },
      'Failed to fetch user'
    );
    res.status(500).json({ error: (error as Error).message });
  }
});

app.put('/api/users/:userId/profile', (req, res) => {
  try {
    logger.info({ route: 'update-profile', userId: req.params.userId }, 'Updating profile');
    const updated = orchestrator.upsertUserProfile(req.params.userId, req.body);
    res.json(updated.profile);
  } catch (error) {
    logger.error(
      { route: 'update-profile', error: (error as Error).message },
      'Failed to update profile'
    );
    res.status(400).json({ error: (error as Error).message });
  }
});

app.put('/api/users/:userId/preferences', (req, res) => {
  try {
    logger.info(
      { route: 'update-preferences', userId: req.params.userId },
      'Updating preferences'
    );
    const updated = orchestrator.upsertUserPreferences(req.params.userId, req.body);
    res.json(updated.preferences);
  } catch (error) {
    logger.error(
      { route: 'update-preferences', error: (error as Error).message },
      'Failed to update preferences'
    );
    res.status(400).json({ error: (error as Error).message });
  }
});

app.post('/api/review/interpret', (req, res) => {
  const { feedback } = req.body as { feedback?: string };
  if (!feedback) {
    return res.status(400).json({ error: 'feedback is required' });
  }
  try {
    logger.info({ route: 'interpret-feedback' }, 'Interpreting feedback');
    const instruction = reviewAgent.interpretFeedback(feedback);
    res.json(instruction);
  } catch (error) {
    logger.error(
      { route: 'interpret-feedback', error: (error as Error).message },
      'Failed to interpret feedback'
    );
    res.status(400).json({ error: (error as Error).message });
  }
});

app.post('/api/plan/generate-week', (req, res) => {
  try {
    const { userId } = req.body as { userId?: string };
    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }
    logger.info({ route: 'generate-week', userId }, 'Generating new week');
    const result = orchestrator.generateNewWeek(userId);
    res.json(result);
  } catch (error) {
    logger.error(
      { route: 'generate-week', error: (error as Error).message },
      'Failed to generate week'
    );
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
    logger.info(
      { route: 'apply-instruction', userId, action: parsedInstruction.action },
      'Applying instruction'
    );
    const result = orchestrator.applyInstruction(userId, parsedInstruction);
    res.json(result);
  } catch (error) {
    logger.error(
      { route: 'apply-instruction', error: (error as Error).message },
      'Failed to apply instruction'
    );
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
    logger.error(
      { route: 'shopping-list', error: (error as Error).message },
      'Failed to retrieve shopping list'
    );
    res.status(500).json({ error: (error as Error).message });
  }
});

const port = process.env.PORT || 4000;
app.listen(port, () => {
  logger.info({ port }, 'Server listening');
});
