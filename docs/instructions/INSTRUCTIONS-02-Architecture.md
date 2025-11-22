# 2. High-Level Architecture

## 2.1 Components

The system has four main layers:

1. **Frontend (React + TypeScript)**
   - A single-page dashboard application with three main tabs:
     - **Profile** – user onboarding and settings.
     - **Plans** – weekly meal plans: generation, viewing, and editing.
     - **Groceries** – shopping list derived from the current plan.
   - Communicates with the backend via a REST API.

2. **Backend (NestJS + TypeScript)**
   - Modular architecture organized into feature modules:
     - **UsersModule**: User profile management (controller + service).
     - **RecipesModule**: Recipe retrieval and management including user-created recipes (controller + service).
     - **PlansModule**: Plan generation, retrieval, and editing actions (controller + service).
     - **ShoppingListModule**: Shopping list retrieval and updates, pantry tracking (controller + service).
     - **AgentsModule**: LLM agent orchestration (Review Agent, Coach Agent via LangChain).
   - Uses **Dependency Injection** for clean separation of concerns.
   - Contains domain services:
     - `ProfileService`
     - `RecipeService`
     - `PlanEngineService`
     - `ShoppingListService`
     - `AgentOrchestratorService`
   - Contains an **AgentOrchestratorService** responsible for calling the LLM agents (via LangChain) and applying their outputs.

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
[NestJS Backend - REST API]
  Controllers:
    - ProfileController
    - RecipeController
    - PlanController
    - ShoppingListController
          │
          ▼
  Services:
    - ProfileService
    - RecipeService
    - PlanEngineService
    - ShoppingListService
          │
          ▼
[AgentOrchestratorService]
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
- Validates and stores user profile and preferences via **NestJS controllers and services**.
- Maintains the ingredient and recipe catalogs (including user-created recipes) using **RecipeService**.
- Enforces diet types and allergen constraints when selecting candidate recipes via **PlanEngineService**.
- Builds candidate recipe lists for each day and meal slot.
- Calls LLM agents through the **AgentOrchestratorService** to build or update weekly plans.
- Computes nutritional values and cost from ingredient data in **domain services**.
- Derives shopping lists from finalized plans and handles pantry & price overrides via **ShoppingListService**.
- Uses **dependency injection** for clean testability and modularity.

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
