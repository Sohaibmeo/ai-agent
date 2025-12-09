export class UserPreferences { user: any; liked_ingredients: any = {}; disliked_ingredients: any = {}; liked_meals: any = {}; disliked_meals: any = {}; preferred_cuisines: any = {}; }
export class UserIngredientScore { user: any; ingredient: any; score = 0; updated_at = new Date(); }
export class UserRecipeScore { user: any; recipe: any; score = 0; updated_at = new Date(); }
