import { v4 as uuid } from 'uuid';
import {
  GenerateWeekInput,
  ShoppingList,
  ShoppingListItem,
  WeeklyPlan
} from '../schemas';

export type PortionMode = 'cutting' | 'maintenance' | 'bulking';
export type MealSlot = 'breakfast' | 'snack' | 'lunch' | 'dinner';
export type DietTag =
  | 'halal'
  | 'vegan'
  | 'vegetarian'
  | 'keto'
  | 'gluten_free'
  | 'lactose_free';

export interface Ingredient {
  id: string;
  name: string;
  unit: string;
  estimatedPricePerUnit: number;
  kcalPerUnit: number;
  proteinPerUnit: number;
  carbsPerUnit: number;
  fatPerUnit: number;
  tags: DietTag[];
}

export interface RecipeIngredient {
  ingredientId: string;
  quantity: number;
  quantityUnit: string;
  optional?: boolean;
}

export interface Recipe {
  id: string;
  name: string;
  mealSlot: MealSlot;
  difficulty: 'super_easy' | 'easy' | 'medium' | 'hard';
  basePortionSize: number;
  cuisine?: string;
  tags: string[];
  instructions: string;
  ingredients: RecipeIngredient[];
}

export interface PantryItem {
  ingredientId: string;
  quantity: number;
  quantityUnit: string;
}

export interface UserState {
  id: string;
  profile: GenerateWeekInput['profile'];
  preferences: GenerateWeekInput['preferences'];
  pantry: PantryItem[];
  ingredientOverrides: Record<string, number>;
  lastPlanId?: string;
}

const portionMultiplierMap: Record<PortionMode, number> = {
  cutting: 0.85,
  maintenance: 1,
  bulking: 1.3
};

export const getPortionMultiplier = (mode: PortionMode): number =>
  portionMultiplierMap[mode] ?? 1;

const ingredientList: Ingredient[] = [
  {
    id: 'ing-chicken',
    name: 'Chicken Breast',
    unit: '100g',
    estimatedPricePerUnit: 1.2,
    kcalPerUnit: 165,
    proteinPerUnit: 31,
    carbsPerUnit: 0,
    fatPerUnit: 3.6,
    tags: ['halal', 'keto', 'gluten_free', 'lactose_free']
  },
  {
    id: 'ing-salmon',
    name: 'Salmon Fillet',
    unit: '100g',
    estimatedPricePerUnit: 1.8,
    kcalPerUnit: 208,
    proteinPerUnit: 20,
    carbsPerUnit: 0,
    fatPerUnit: 13,
    tags: ['halal', 'keto', 'gluten_free', 'lactose_free']
  },
  {
    id: 'ing-chickpeas',
    name: 'Chickpeas',
    unit: '100g',
    estimatedPricePerUnit: 0.5,
    kcalPerUnit: 164,
    proteinPerUnit: 9,
    carbsPerUnit: 27,
    fatPerUnit: 2.6,
    tags: ['halal', 'vegan', 'vegetarian', 'gluten_free', 'lactose_free']
  },
  {
    id: 'ing-oats',
    name: 'Rolled Oats',
    unit: '50g',
    estimatedPricePerUnit: 0.2,
    kcalPerUnit: 190,
    proteinPerUnit: 6,
    carbsPerUnit: 32,
    fatPerUnit: 4,
    tags: ['halal', 'vegan', 'vegetarian']
  },
  {
    id: 'ing-yogurt',
    name: 'Greek Yogurt',
    unit: '100g',
    estimatedPricePerUnit: 0.6,
    kcalPerUnit: 59,
    proteinPerUnit: 10,
    carbsPerUnit: 3.6,
    fatPerUnit: 0.4,
    tags: ['halal', 'vegetarian']
  },
  {
    id: 'ing-spinach',
    name: 'Spinach',
    unit: '50g',
    estimatedPricePerUnit: 0.25,
    kcalPerUnit: 12,
    proteinPerUnit: 1.5,
    carbsPerUnit: 1.9,
    fatPerUnit: 0.2,
    tags: ['halal', 'vegan', 'vegetarian', 'keto', 'gluten_free']
  },
  {
    id: 'ing-rice',
    name: 'Brown Rice',
    unit: '75g',
    estimatedPricePerUnit: 0.3,
    kcalPerUnit: 260,
    proteinPerUnit: 5,
    carbsPerUnit: 55,
    fatPerUnit: 2,
    tags: ['halal', 'vegan', 'vegetarian', 'lactose_free']
  },
  {
    id: 'ing-egg',
    name: 'Free-range Egg',
    unit: '1 piece',
    estimatedPricePerUnit: 0.35,
    kcalPerUnit: 78,
    proteinPerUnit: 6,
    carbsPerUnit: 0.6,
    fatPerUnit: 5,
    tags: ['halal', 'keto', 'gluten_free']
  },
  {
    id: 'ing-almond',
    name: 'Almond Butter',
    unit: '20g',
    estimatedPricePerUnit: 0.4,
    kcalPerUnit: 120,
    proteinPerUnit: 4,
    carbsPerUnit: 4,
    fatPerUnit: 10,
    tags: ['halal', 'vegan', 'vegetarian', 'keto', 'gluten_free', 'lactose_free']
  },
  {
    id: 'ing-banana',
    name: 'Banana',
    unit: '1 piece',
    estimatedPricePerUnit: 0.18,
    kcalPerUnit: 105,
    proteinPerUnit: 1.3,
    carbsPerUnit: 27,
    fatPerUnit: 0.3,
    tags: ['halal', 'vegan', 'vegetarian', 'gluten_free', 'lactose_free']
  },
  {
    id: 'ing-pita',
    name: 'Wholemeal Pita',
    unit: '1 piece',
    estimatedPricePerUnit: 0.4,
    kcalPerUnit: 165,
    proteinPerUnit: 6,
    carbsPerUnit: 33,
    fatPerUnit: 1.5,
    tags: ['halal', 'vegetarian']
  },
  {
    id: 'ing-lentils',
    name: 'Red Lentils',
    unit: '100g',
    estimatedPricePerUnit: 0.45,
    kcalPerUnit: 116,
    proteinPerUnit: 9,
    carbsPerUnit: 20,
    fatPerUnit: 0.4,
    tags: ['halal', 'vegan', 'vegetarian', 'gluten_free', 'lactose_free']
  }
];

const recipeList: Recipe[] = [
  {
    id: 'rec-porridge',
    name: 'Almond Banana Porridge',
    mealSlot: 'breakfast',
    difficulty: 'super_easy',
    basePortionSize: 1,
    cuisine: 'british',
    tags: ['vegetarian'],
    instructions: 'Cook oats with milk, top with banana and almond butter.',
    ingredients: [
      { ingredientId: 'ing-oats', quantity: 1, quantityUnit: 'portion' },
      { ingredientId: 'ing-banana', quantity: 1, quantityUnit: 'piece' },
      { ingredientId: 'ing-almond', quantity: 1, quantityUnit: 'spoon' }
    ]
  },
  {
    id: 'rec-chicken-bowl',
    name: 'Halal Chicken Grain Bowl',
    mealSlot: 'lunch',
    difficulty: 'easy',
    basePortionSize: 1,
    cuisine: 'middle_eastern',
    tags: ['halal'],
    instructions: 'Roasted chicken served with brown rice and spinach.',
    ingredients: [
      { ingredientId: 'ing-chicken', quantity: 1.5, quantityUnit: 'x100g' },
      { ingredientId: 'ing-rice', quantity: 1, quantityUnit: 'portion' },
      { ingredientId: 'ing-spinach', quantity: 1, quantityUnit: 'handful' }
    ]
  },
  {
    id: 'rec-salmon-bowl',
    name: 'Herby Salmon Bowl',
    mealSlot: 'dinner',
    difficulty: 'medium',
    basePortionSize: 1,
    cuisine: 'nordic',
    tags: ['halal'],
    instructions: 'Baked salmon with spinach and grains.',
    ingredients: [
      { ingredientId: 'ing-salmon', quantity: 1.2, quantityUnit: 'x100g' },
      { ingredientId: 'ing-rice', quantity: 0.8, quantityUnit: 'portion' },
      { ingredientId: 'ing-spinach', quantity: 1, quantityUnit: 'handful' }
    ]
  },
  {
    id: 'rec-chickpea-wrap',
    name: 'Smoky Chickpea Pita',
    mealSlot: 'lunch',
    difficulty: 'easy',
    basePortionSize: 1,
    cuisine: 'mediterranean',
    tags: ['vegetarian'],
    instructions: 'Warm pita stuffed with spiced chickpeas and greens.',
    ingredients: [
      { ingredientId: 'ing-chickpeas', quantity: 1, quantityUnit: 'cup' },
      { ingredientId: 'ing-pita', quantity: 1, quantityUnit: 'piece' },
      { ingredientId: 'ing-spinach', quantity: 1, quantityUnit: 'handful' }
    ]
  },
  {
    id: 'rec-lentil-soup',
    name: 'Cozy Lentil Soup',
    mealSlot: 'dinner',
    difficulty: 'super_easy',
    basePortionSize: 1,
    cuisine: 'turkish',
    tags: ['vegan'],
    instructions: 'Simmer lentils with spices until creamy.',
    ingredients: [
      { ingredientId: 'ing-lentils', quantity: 1.2, quantityUnit: 'cup' },
      { ingredientId: 'ing-spinach', quantity: 1, quantityUnit: 'handful' }
    ]
  },
  {
    id: 'rec-yogurt-bowl',
    name: 'Protein Yogurt Pot',
    mealSlot: 'snack',
    difficulty: 'super_easy',
    basePortionSize: 1,
    tags: ['vegetarian'],
    instructions: 'Layer yogurt with banana slices and oats.',
    ingredients: [
      { ingredientId: 'ing-yogurt', quantity: 1, quantityUnit: 'pot' },
      { ingredientId: 'ing-banana', quantity: 0.5, quantityUnit: 'piece' },
      { ingredientId: 'ing-oats', quantity: 0.5, quantityUnit: 'portion' }
    ]
  },
  {
    id: 'rec-egg-bites',
    name: 'Spinach Egg Bites',
    mealSlot: 'breakfast',
    difficulty: 'easy',
    basePortionSize: 1,
    cuisine: 'british',
    tags: ['halal', 'keto'],
    instructions: 'Bake eggs with spinach for simple bites.',
    ingredients: [
      { ingredientId: 'ing-egg', quantity: 2, quantityUnit: 'pieces' },
      { ingredientId: 'ing-spinach', quantity: 1, quantityUnit: 'handful' }
    ]
  }
];

const defaultUserState: UserState = {
  id: 'demo-user',
  profile: {
    age: 32,
    heightCm: 175,
    weightKg: 78,
    activityLevel: 'moderate',
    dietType: 'halal',
    recipeDifficulty: 'easy',
    portionMode: 'maintenance',
    weeklyBudgetGbp: 55,
    enableBreakfast: true,
    enableSnacks: true,
    enableLunch: true,
    enableDinner: true
  },
  preferences: {
    ingredientsPreferred: ['spinach', 'chicken', 'lentils'],
    ingredientsAvoid: ['pork', 'alcohol'],
    mustHaveIngredients: [],
    recipesPreferred: [],
    cuisinesLiked: ['mediterranean', 'middle_eastern'],
    cuisinesDisliked: []
  },
  pantry: [
    { ingredientId: 'ing-oats', quantity: 2, quantityUnit: 'portion' },
    { ingredientId: 'ing-rice', quantity: 1, quantityUnit: 'portion' }
  ],
  ingredientOverrides: {
    'ing-chicken': 1.05
  }
};

interface InMemoryDb {
  ingredients: Ingredient[];
  recipes: Recipe[];
  users: Map<string, UserState>;
  weeklyPlans: Map<string, WeeklyPlan>;
  shoppingLists: Map<string, ShoppingList>;
}

const db: InMemoryDb = {
  ingredients: ingredientList,
  recipes: recipeList,
  users: new Map([[defaultUserState.id, defaultUserState]]),
  weeklyPlans: new Map(),
  shoppingLists: new Map()
};

export const mockDb = {
  getUser(userId: string): UserState | undefined {
    return db.users.get(userId);
  },
  upsertUser(user: UserState) {
    db.users.set(user.id, user);
  },
  listIngredients(): Ingredient[] {
    return db.ingredients;
  },
  listRecipes(): Recipe[] {
    return db.recipes;
  },
  saveWeeklyPlan(plan: WeeklyPlan) {
    db.weeklyPlans.set(plan.id, plan);
    const user = db.users.get(plan.userId);
    if (user) {
      user.lastPlanId = plan.id;
      db.users.set(user.id, user);
    }
  },
  getWeeklyPlan(planId: string) {
    return db.weeklyPlans.get(planId);
  },
  saveShoppingList(list: ShoppingList) {
    db.shoppingLists.set(list.weeklyPlanId, list);
  },
  getShoppingList(planId: string) {
    return db.shoppingLists.get(planId);
  },
  createShoppingListFromPlan(plan: WeeklyPlan): ShoppingList {
    const items: ShoppingListItem[] = [];
    const ingredientTotals: Record<
      string,
      { quantity: number; unit: string }
    > = {};

    plan.days.forEach((day) => {
      day.meals.forEach((meal) => {
        meal.ingredients.forEach((ingredient) => {
          const existing = ingredientTotals[ingredient.id];
          if (existing) {
            existing.quantity += ingredient.quantity;
          } else {
            ingredientTotals[ingredient.id] = {
              quantity: ingredient.quantity,
              unit: ingredient.quantityUnit
            };
          }
        });
      });
    });

    Object.entries(ingredientTotals).forEach(([ingredientId, totals]) => {
      const ingredientMeta = db.ingredients.find((ing) => ing.id === ingredientId);
      const id = uuid();
      const estimatedCost = ingredientMeta
        ? (ingredientMeta.estimatedPricePerUnit ?? 0) * totals.quantity
        : undefined;
      items.push({
        id,
        ingredientId,
        name: ingredientMeta?.name ?? ingredientId,
        requiredQuantity: Number(totals.quantity.toFixed(2)),
        quantityUnit: totals.unit,
        estimatedCost,
        isInPantry: false,
        userMarkedHave: false
      });
    });

    const totalEstimatedCost = items.reduce(
      (sum, item) => sum + (item.estimatedCost ?? 0),
      0
    );

    const list: ShoppingList = {
      weeklyPlanId: plan.id,
      items,
      totalEstimatedCost: Number(totalEstimatedCost.toFixed(2))
    };
    db.shoppingLists.set(plan.id, list);
    return list;
  }
};
