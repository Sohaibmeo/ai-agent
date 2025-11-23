🧠 AI-Powered Meal Planning Platform
Enterprise-Grade Nutrition, Cost Optimization & Preference-Learning System

Built with NestJS, Postgres, Local LLM Agents, TypeScript, and Structured AI Orchestration

📌 Overview

This repository contains a production-ready AI-Assisted Meal Planning System, designed for the UK market.
It generates 7-day meal plans tailored to:

Body composition goals (lose / maintain / gain)

Diet requirements (Halal, Vegan, Vegetarian, Keto, etc.)

UK’s 14 allergen categories

Weekly budget constraints

Recipe difficulty

Meal schedule preferences

User behaviour (likes, dislikes, swaps, custom recipes)

The system combines:

Local LLM agents (Review Agent + Coach Agent)

Strong deterministic backend logic (macro/cost engine, filtering, targets)

Preference learning

Recipe + Ingredient catalogs with cost estimation

Shopping list generation with price overrides + pantry tracking

This architecture prioritises reliability, explainability, and cost efficiency while still benefiting from AI reasoning where helpful.

🧩 System Flow (Figma Diagram)

Prototype Workflow (to be updated in future iterations):
👉 https://github.com/Sohaibmeo/ai-agent/raw/adv-fitness-agent/docs/Figma.png

src/
 ├─ agents/
 │   ├─ agents.service.ts      # Review & Coach agent wrappers
 │   ├─ schemas/               # Zod schemas for AI IO
 │
 ├─ plans/
 │   ├─ plans.service.ts       # Weekly plan generation core logic
 │   ├─ plans.controller.ts
 │
 ├─ recipes/
 │   ├─ recipes.service.ts     # Candidate selection, difficulty, diets
 │   ├─ entities/              # Recipe + RecipeIngredients
 │
 ├─ ingredients/
 │   ├─ ingredients.service.ts
 │   ├─ entities/              # Ingredient + price overrides + pantry
 │
 ├─ preferences/
 │   ├─ preferences.service.ts # Learning engine for likes/dislikes
 │
 ├─ shopping-list/
 │   ├─ shopping-list.service.ts   # Aggregation logic
 │
 ├─ users/
 │   ├─ profiles.service.ts
 │   ├─ preferences.service.ts
 │
 ├─ database/
 │   ├─ migrations/
 │   ├─ seeding/
 │
 └─ common/
     ├─ utils/
     ├─ interceptors/
     ├─ filters/

🧠 AI Orchestration (V1 Logic)
Review Agent

Inputs: user action (swap/modify), reason, meal/day/week context

Output: a structured ReviewInstruction

Use cases:

“Make this lighter”

“Remove this ingredient”

“I want something cheaper”

“I want a drink instead”

Coach Agent

Inputs: profile, daily targets, candidate recipes

Output: weekly plan structure:

{
  days: [
    { day_index: 0, meals: [
      { meal_slot: 'breakfast', recipe_id: 'abc123', portion_multiplier: 1.2 }
    ]}
  ]
}

Must choose from available candidates, not invent recipes

Backend still recalculates macros & costs deterministically

🧮 Deterministic Domain Engine

Even when LLM is used, backend handles:

Exact calorie targets

Protein prioritisation

Portion multiplier calculation

Budget logic (upcoming)

Difficulty filtering

Allergen safety

Recipe → ingredient → macro breakdown

Shopping list aggregation

This ensures accuracy + consistency, not dependent on model creativity.

📊 PostgreSQL Schema (Simplified)

users
user_profile
ingredients
user_ingredient_price
pantry_items
recipes
recipe_ingredients
weekly_plans
plan_days
plan_meals
shopping_list_items
user_recipe_score
user_ingredient_score
🧪 Development Status
✔ Backend foundations: Complete
✔ LLM agent wrappers: Implemented
✔ Weekly plan generator: Working (AI + heuristics)
✔ Shopping list: Working
✔ Preference learning: Working
✔ Ingredient/Recipe schema: Operational
△ Budget-aware selection: Next phase
△ Frontend UI: To be built
△ Figma prototype: Needs update
🚀 Next Milestones
1. Frontend MVP

Profile page

Generate Week page

Current week plan view

Meal swap modal

Groceries view

2. Enhanced Coach Agent

Add calorie/parsing/cost metadata to candidates

Teach the model to respect daily targets

3. Plan Settings (Per Week)

Instead of reading from profile, add a modal when generating a new week:

breakfast/snack/lunch/dinner toggles

difficulty

weekly budget

4. Improved Review Agent Schema

Add structured action + params:

regenerate_day, swap_ingredient, change_portion, etc.

5. Recipe expansion

Seed more recipes for each:

diet type

meal slot

difficulty range

🛠️ Getting Started
1. Install Dependencies

npm install

2. Configure Environment

DATABASE_URL=postgres://...
LLM_BASE_URL=http://localhost:11434/v1
LLM_MODEL_REVIEW=llama3
LLM_MODEL_COACH=llama3

3. Start Postgres
docker-compose up -d

4. Run DB Migrations & Seeders

npm run typeorm:migration:run
npm run seed

5. Start Backend

npm run start:dev


🧩 Contributing

This system is designed with:

full modularity

future agent expansion

clean domain-driven boundaries

multiple integration points for UI or mobile clients

Pull requests and architectural enhancements are welcome.

📄 License

MIT (Working on it)