# AI-Assisted Meal Planning System (UK-Focused)

This repository contains an enterprise-grade AI-powered meal planning system built with:

- **React + TypeScript** (Frontend)
- **Node.js + TypeScript + Express** (Backend)
- **Postgres** (Database)
- **LangChain JS + Local LLM** (AI Orchestration)
- **Zod** (Validation)

The system generates **7-day meal plans** tailored to UK users, respecting:

- Body composition goals (lose/maintain/gain)
- Diet types (Halal, Vegan, Vegetarian, Keto, etc.)
- **14 major UK allergens**
- Weekly budgets
- Recipe difficulty
- Meal schedules (breakfast/snacks/lunch/dinner)

Meals are selected—not generated—by the AI from a curated recipe database.  
All nutrition and cost calculations are backend-driven.

---

## 📁 Documentation

Complete system documentation is split into structured sections:

- `INSTRUCTIONS-01-Overview.md`
- `INSTRUCTIONS-02-Architecture.md`
- `INSTRUCTIONS-03-Domain-Rules.md`
- `INSTRUCTIONS-04-Frontend.md`
- `INSTRUCTIONS-05-Data-Model.md`
- `INSTRUCTIONS-06-Agents-Orchestrator.md`
- `INSTRUCTIONS-07-Flows.md`
- `INSTRUCTIONS-08-LLM-Usage.md`
- `INSTRUCTIONS-09-Future-Extensibility.md`

These documents describe the full blueprint: architecture, flows, DB schema, agents, and future roadmap.

---

## 🧠 Core Features (V1)

- User profile with diet & allergy constraints  
- Weekly meal plan generation  
- Meal swapping & ingredient-level modifications  
- Custom recipe creation  
- Grocery list with:
  - pantry tracking  
  - price overrides  
- Local LLM orchestration (Review + Coach Agents)  
- Strict JSON validation using Zod  
- Backend-calculated macros & cost  

---

## 🏗️ Tech Stack

- **Frontend:** React, TypeScript  
- **Backend:** Node.js, Express, TypeScript  
- **Database:** Postgres  
- **AI:** LangChain JS + Local OpenAI-Compatible LLM  
- **Validation:** Zod  

---

## 🚀 Getting Started

### 1. Install dependencies
```bash
npm install
```

### 2. Start Postgres (via Docker)
```bash
docker-compose up -d
```

### 3. Run migrations
```bash
npm run migrate
```

### 4. Start development servers
Frontend:
```bash
npm run dev
```
Backend:
```bash
npm run dev:server
```

Local LLM (example: Ollama):
```bash
ollama run your-model
```

---

## 📦 Suggested Folder Structure

```
/frontend
/backend
/docs
  INSTRUCTIONS-01-Overview.md
  INSTRUCTIONS-02-Architecture.md
  ...
```

---

## 📌 Status

### Progress so far
- Backend scaffold running (NestJS + TypeORM + Postgres via Docker); migrations and UUID-safe seed data in place.
- Modules/services for users, recipes, plans, shopping list; filters for diet/allergen/difficulty and budget/protein-aware plan generation.
- Swaps and custom recipes recompute macros/cost and rebuild shopping lists; shopping lists apply pantry flags and user price overrides.
- Agents wired to local Ollama models (review/coach/explain/nutrition) with Zod validation stubs; env-driven model config.
- Preference scaffolding added (`user_preferences` entity + service) for future like/dislike learning.

### Next goals (project)
- Generate/run migration for `user_preferences`; start recording swap/keep/remove signals into preferences and use them in candidate selection.
- Harden plan endpoints (error handling, active plan lifecycle), and expose clean GETs for current plan/list.
- Add minimal tests/fixtures for filters, plan generation, and shopping list aggregation.
- Frontend scaffold (later): hook up Profile/Plans/Groceries tabs to the REST API.

### Next goals (agents)
1) **Review/Coach Agents**: integrate into plan generation/edit flows; ensure JSON validation and fallbacks on failure.
2) **Preference Agent**: consume interaction history to update `user_preferences`.
3) **Explanation Agent**: answer “why this meal/protein is low” using plan/profile context (API endpoint to expose).
4) **Nutrition Advisor**: serve structured tips; expose an endpoint for the frontend to call.

---