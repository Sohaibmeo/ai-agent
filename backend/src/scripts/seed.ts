import { initDb, pool } from "../lib/db.js";

async function main() {
  await initDb();

  const userResult = await pool.query(
    `
      INSERT INTO users
        (name, email, height_cm, weight_kg, age, activity_level, weekly_budget_cents, dietary_preferences, excluded_ingredients, fitness_goal, updated_at)
      VALUES
        ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10, now())
      ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email
      RETURNING *;
    `,
    [
      "Demo Student",
      "demo@student.dev",
      175,
      75,
      24,
      "moderate",
      4500,
      ["halal"],
      ["pork"],
      "GAIN_MUSCLE",
    ],
  );

  const recipes = [
    {
      name: "Protein Oats",
      mealType: "breakfast",
      calories: 420,
      proteinGrams: 32,
      carbsGrams: 45,
      fatGrams: 12,
      costCents: 250,
      dietTags: ["vegetarian"],
      ingredients: ["rolled oats", "whey protein", "banana", "almond butter"],
      instructions: "Cook oats with water, stir in whey, top with banana and almond butter.",
    },
    {
      name: "Chicken Rice Bowl",
      mealType: "lunch",
      calories: 620,
      proteinGrams: 48,
      carbsGrams: 55,
      fatGrams: 18,
      costCents: 550,
      dietTags: ["halal"],
      ingredients: ["chicken breast", "rice", "broccoli", "olive oil"],
      instructions: "Grill chicken, steam broccoli, serve over rice.",
    },
    {
      name: "Tuna Wrap",
      mealType: "snack",
      calories: 380,
      proteinGrams: 30,
      carbsGrams: 32,
      fatGrams: 14,
      costCents: 320,
      dietTags: ["pescatarian"],
      ingredients: ["whole wheat tortilla", "canned tuna", "yogurt", "spinach"],
      instructions: "Mix tuna with yogurt, spread on tortilla, add spinach, wrap.",
    },
  ];

  for (const recipe of recipes) {
    await pool.query(
      `
        INSERT INTO recipes
          (name, meal_type, calories, protein_grams, carbs_grams, fat_grams, cost_cents, diet_tags, ingredients, instructions, updated_at)
        VALUES
          ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10, now())
        ON CONFLICT (name) DO UPDATE SET
          meal_type = EXCLUDED.meal_type,
          calories = EXCLUDED.calories,
          protein_grams = EXCLUDED.protein_grams,
          carbs_grams = EXCLUDED.carbs_grams,
          fat_grams = EXCLUDED.fat_grams,
          cost_cents = EXCLUDED.cost_cents,
          diet_tags = EXCLUDED.diet_tags,
          ingredients = EXCLUDED.ingredients,
          instructions = EXCLUDED.instructions,
          updated_at = now();
      `,
      [
        recipe.name,
        recipe.mealType,
        recipe.calories,
        recipe.proteinGrams,
        recipe.carbsGrams,
        recipe.fatGrams,
        recipe.costCents,
        recipe.dietTags,
        recipe.ingredients,
        recipe.instructions,
      ],
    );
  }

  console.log(`Seed complete. User id: ${userResult.rows[0].id}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await pool.end();
  });
