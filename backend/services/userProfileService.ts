import pool from '../services/db';
import { UserProfile } from '../models/userProfile';

export async function getUserProfile(userId: number): Promise<UserProfile | null> {
  const result = await pool.query('SELECT * FROM user_profile WHERE user_id = $1', [userId]);
  return result.rows[0] || null;
}

export async function upsertUserProfile(profile: UserProfile): Promise<UserProfile> {
  await pool.query(
    'INSERT INTO users (id) VALUES ($1) ON CONFLICT (id) DO NOTHING',
    [profile.user_id]
  );

  await pool.query(`
    INSERT INTO user_profile (
      user_id, age, height_cm, weight_kg, activity_level, goal, goal_intensity, diet_type, allergy_keys,
      breakfast_enabled, snack_enabled, lunch_enabled, dinner_enabled, max_difficulty, weekly_budget_gbp
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9,
      $10, $11, $12, $13, $14, $15
    )
    ON CONFLICT (user_id) DO UPDATE SET
      age = EXCLUDED.age,
      height_cm = EXCLUDED.height_cm,
      weight_kg = EXCLUDED.weight_kg,
      activity_level = EXCLUDED.activity_level,
      goal = EXCLUDED.goal,
      goal_intensity = EXCLUDED.goal_intensity,
      diet_type = EXCLUDED.diet_type,
      allergy_keys = EXCLUDED.allergy_keys,
      breakfast_enabled = EXCLUDED.breakfast_enabled,
      snack_enabled = EXCLUDED.snack_enabled,
      lunch_enabled = EXCLUDED.lunch_enabled,
      dinner_enabled = EXCLUDED.dinner_enabled,
      max_difficulty = EXCLUDED.max_difficulty,
      weekly_budget_gbp = EXCLUDED.weekly_budget_gbp
    RETURNING *;
  `, [
    profile.user_id,
    profile.age,
    profile.height_cm,
    profile.weight_kg,
    profile.activity_level,
    profile.goal,
    profile.goal_intensity,
    profile.diet_type,
    profile.allergy_keys,
    profile.breakfast_enabled,
    profile.snack_enabled,
    profile.lunch_enabled,
    profile.dinner_enabled,
    profile.max_difficulty,
    profile.weekly_budget_gbp
  ]);
  return profile;
}
