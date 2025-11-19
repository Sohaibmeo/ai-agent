import express from 'express';

import { DEMO_USER_ID } from '../constants.js';
import { getUserPreferences, getUserProfile, upsertUserPreferences, upsertUserProfile } from '../db/repositories/userRepo.js';

const router = express.Router();

router.get('/profile', async (_req, res) => {
  const [profile, preferences] = await Promise.all([
    getUserProfile(DEMO_USER_ID),
    getUserPreferences(DEMO_USER_ID),
  ]);
  res.json({ profile, preferences });
});

router.put('/profile', async (req, res, next) => {
  try {
    const { profile, preferences } = req.body;
    if (profile) {
      await upsertUserProfile({ ...profile, userId: DEMO_USER_ID });
    }
    if (preferences) {
      await upsertUserPreferences({ ...preferences, userId: DEMO_USER_ID });
    }
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

export default router;
