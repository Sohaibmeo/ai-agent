import { z } from 'zod';

export const UserProfileSchema = z.object({
  user_id: z.number(),
  age: z.number(),
  height_cm: z.number(),
  weight_kg: z.number(),
  activity_level: z.enum(['sedentary', 'light', 'moderate', 'active']),
  goal: z.enum(['lose_weight', 'maintain_weight', 'gain_weight']),
  goal_intensity: z.string().optional(),
  diet_type: z.string(),
  allergy_keys: z.array(z.string()),
  breakfast_enabled: z.boolean(),
  snack_enabled: z.boolean(),
  lunch_enabled: z.boolean(),
  dinner_enabled: z.boolean(),
  max_difficulty: z.enum(['super_easy', 'easy', 'medium', 'hard']),
  weekly_budget_gbp: z.number().nullable()
});

export type UserProfile = z.infer<typeof UserProfileSchema>;
