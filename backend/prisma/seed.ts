import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.userProfile.upsert({
    where: { email: "demo@student.dev" },
    update: {},
    create: {
      name: "Demo Student",
      email: "demo@student.dev",
      heightCm: 175,
      weightKg: 75,
      age: 24,
      activityLevel: "moderate",
      weeklyBudgetCents: 4500,
      dietaryPreferences: ["halal"],
      excludedIngredients: ["pork"],
      fitnessGoal: "GAIN_MUSCLE",
    },
  });

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
    await prisma.recipe.upsert({
      where: { name: recipe.name },
      update: recipe,
      create: recipe,
    });
  }

  console.log(`Seed complete. User id: ${user.id}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
