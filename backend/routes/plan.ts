import express from 'express';
import { getUserProfile } from '../services/userProfileService';
import { getCandidateRecipes } from '../services/planEngine';

const router = express.Router();

// POST /api/plan/generate-week/:userId
router.post('/generate-week/:userId', async (req, res) => {
  const userId = Number(req.params.userId);
  if (!userId) {
    return res.status(400).json({ error: 'Missing or invalid userId' });
  }
  try {
    const profile = await getUserProfile(userId);
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }
    // For each day (0-6) and enabled meal slot, select candidate recipes
    const days = Array.from({ length: 7 }, (_, i) => i);
    const mealSlots = [];
    if (profile.breakfast_enabled) mealSlots.push('breakfast');
    if (profile.snack_enabled) mealSlots.push('snack');
    if (profile.lunch_enabled) mealSlots.push('lunch');
    if (profile.dinner_enabled) mealSlots.push('dinner');
    const plan = [];
    for (const day of days) {
      const dayMeals: Record<string, any> = {};
      for (const slot of mealSlots) {
        const candidates = await getCandidateRecipes({
          mealSlot: slot,
          dietType: profile.diet_type,
          allergyKeys: profile.allergy_keys,
          maxDifficulty: profile.max_difficulty
        });
        // Simple selection: pick first candidate
        dayMeals[slot] = candidates[0] || null;
      }
      plan.push({ day, meals: dayMeals });
    }
    // TODO: Persist plan in DB
    res.json({ userId, plan });
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate plan' });
  }
});

export default router;
