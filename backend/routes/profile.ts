
import express from 'express';
import { UserProfileSchema } from '../models/userProfile';
import { getUserProfile, upsertUserProfile } from '../services/userProfileService';

const router = express.Router();

// GET user profile
router.get('/:userId', async (req, res) => {
  const userId = Number(req.params.userId);
  if (!userId) {
    return res.status(400).json({ error: 'Missing or invalid userId' });
  }
  try {
    const profile = await getUserProfile(userId);
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }
    res.json(profile);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// PUT user profile (create or update)
router.put('/:userId', async (req, res) => {
  const userId = Number(req.params.userId);
  if (!userId) {
    return res.status(400).json({ error: 'Missing or invalid userId' });
  }
  const parseResult = UserProfileSchema.safeParse({ ...req.body, user_id: userId });
  if (!parseResult.success) {
    return res.status(400).json({ error: 'Invalid profile data', details: parseResult.error.issues });
  }
  try {
    const profile = await upsertUserProfile(parseResult.data);
    res.json(profile);
  } catch (err) {
    res.status(500).json({ error: 'Failed to save profile' });
  }
});

export default router;
