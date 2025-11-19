import express from 'express';
import { UserProfileSchema } from '../models/userProfile';

const router = express.Router();

// Mock DB (replace with real DB integration)
let userProfile: any = null;

// GET user profile
router.get('/', (req, res) => {
  if (!userProfile) {
    return res.status(404).json({ error: 'Profile not found' });
  }
  res.json(userProfile);
});

// PUT user profile (create or update)
router.put('/', (req, res) => {
  const parseResult = UserProfileSchema.safeParse(req.body);
  if (!parseResult.success) {
  return res.status(400).json({ error: 'Invalid profile data', details: parseResult.error.issues });
  }
  userProfile = parseResult.data;
  res.json(userProfile);
});

export default router;
