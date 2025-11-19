# 2. High-Level Architecture

## 2.1 Components

The system has four main layers:

1. **Frontend (React + TypeScript)**
   - A single-page dashboard application with three main tabs:
     - **Profile** – user onboarding and settings.
     - **Plans** – weekly meal plans: generation, viewing, and editing.
     - **Groceries** – shopping list derived from the current plan.
   - Communicates with the backend via a REST API.

2. **Backend (Node.js + TypeScript)**
   - Exposes REST endpoints for:
     - User profile management.
     - Recipe retrieval and management (including user-created recipes).
     - Plan generation, plan retrieval, and plan editing actions.
     - Shopping list retrieval and updates (pantry and price overrides).
   - Contains domain services:
     - `ProfileService`
     - `RecipeService`
     - `PlanEngine`
     - `ShoppingListService`
   - Contains an **Orchestrator** responsible for calling the LLM agents (via LangChain) and applying their outputs.

3. **LLM Agents (LangChain + Local OpenAI-Compatible Model)**
   - **Review Agent**: interprets user actions and text reasons into a `ReviewInstruction` JSON.
   - **Coach Agent**: given candidate recipe lists, user profile, and optional instructions, selects recipes and outputs a `WeeklyPlan` JSON.

4. **Database (Postgres)**
   - Stores users, profiles, ingredients, allergen tags, recipes, plans, and shopping lists.
   - Acts as the single source of truth for recipes, ingredient nutrition and pricing, and historical plans.

## 2.2 Data Flow (Simplified)

```text
[React Frontend]
   Profile Tab / Plans Tab / Groceries Tab
          │
          ▼
[Backend REST API]
  - ProfileService
  - RecipeService
  - PlanEngine
  - ShoppingListService
          │
          ▼
[Orchestrator]
  - Calls Review Agent (LLM)
  - Calls Coach Agent (LLM)
          │
          ▼
[Local LLM via LangChain]
  - Review Agent Chain
  - Coach Agent Chain
          │
          ▼
[Postgres DB]
  - users, user_profile, ingredients, recipes, weekly_plans, shopping_list_items, etc.
```

## 2.3 Responsibilities

### Frontend
- Renders the UI and collects user inputs.
- Shows the current weekly plan and allows editing via:
  - **Swap Meal** – choose an alternative recipe from a list.
  - **Modify Meal** – edit ingredients and save as a new custom recipe.
- Shows the shopping list with pantry and price overrides.
- Calls appropriate backend endpoints.

### Backend
- Validates and stores user profile and preferences.
- Maintains the ingredient and recipe catalogs (including user-created recipes).
- Enforces diet types and allergen constraints when selecting candidate recipes.
- Builds candidate recipe lists for each day and meal slot.
- Calls LLM agents through the orchestrator to build or update weekly plans.
- Computes nutritional values and cost from ingredient data.
- Derives shopping lists from finalized plans and handles pantry & price overrides.

### LLM Agents
- **Review Agent**: Converts UI actions + optional free-text reasons into a structured `ReviewInstruction` object for the orchestrator.
- **Coach Agent**: Given `ReviewInstruction`, user profile, and candidate recipes, assembles a full `WeeklyPlan` by picking recipes from a list. It never creates new recipes or nutritional values.

### Database
- Holds all persistent data:
  - Users and profiles.
  - Ingredients and their nutritional and pricing information.
  - Allergen tags per ingredient.
  - Recipes and their ingredient breakdown.
  - Weekly plans and their meals.
  - Shopping list items.
  - User-specific ingredient price overrides and pantry contents.

## 2.4 Local LLM First, Cloud Later

Version 1 is designed to run entirely on a **local OpenAI-compatible LLM** (e.g. via Ollama, LM Studio, or another local model server). All LangChain calls should point to this local endpoint.

The design must, however, make the model name and base URL configurable so that later the system can seamlessly switch to OpenAI cloud models (e.g. `gpt-5-mini`) for production use, without changing any business logic or data structures.
