# 🧠 Overcooked AI – Multi-Agent Meal Planning Platform
### AI-Driven Meal Planning Engine Powered by Multi-Agent Precision, Real Nutrition Intelligence, and Automated Weekly Planning.

A high-performance multi-agent orchestration system that generates personalised, budget-aware weekly meal plans with clean, structured outputs. Built for real users. Engineered like a developer-grade AI product.

**Live App:** https://overcooked-ai.vercel.app/

---

## 🚀 Overview

Overcooked AI is a next-generation meal-planning platform powered by coordinated LLM agents and a robust validation pipeline. Unlike typical recipe generators, Overcooked AI produces strictly structured, nutritionally accurate, budget-aligned weekly plans tailored to each user’s goals and ties every AI call into the enterprise-grade credit system (see `/current-plan` payment console).

The platform combines:

- Multi-agent LLM reasoning  
- Nutrition science  
- Price-aware ingredient modelling  
- Schema-enforced plan generation  
- Vision-based macro estimation  
- A modern, serverless architecture (Next.js + NestJS + Vercel + Neon)

The new Vite + React client now includes a billing/payment experience (`frontend/src/pages/PaymentPage.tsx`) with credit bundles, plan tiers, and a CTA that always redirects to `/current-plan`.

The result: AI-generated plans that are consistent, correct, and actually usable in real life.

---

## 🧩 Key Capabilities

### 1. Multi-Agent Pipeline (Developer-Grade Reliability)
Each day of the meal plan is generated through a controlled sequence of agents:

1. **Coach Agent** – drafts initial meal structures aligned to user goals and macros  
2. **Review Agent** – enforces Zod schemas (DayMeal, PlanDay, WeeklyPlan) and self-corrects invalid outputs  
3. **Nutrition Agent** – balances calories, protein, carbs, and fats  
4. **Vision Macros Agent** – extracts macros from food images  
5. **Orchestrator (PlansService)** – ensures weekly consistency, regeneration, and budget compliance

Every stage includes fallback logic, validation, and retry mechanisms.

---

## 🧭 Figma Workflow Diagram (Placeholder)

*(Space reserved — image link will be inserted here later)*  


---

## 🏗 Architecture

```
                ┌─────────────────────────────────┐
                │       Vite + React Frontend     │
                │   - Auth (JWT)                  │
                │   - Profile setup               │
                │   - Weekly plan UI              │
                │   - Current-plan billing UI     │
                └───────────────┬─────────────────┘
                                │ HTTPS
                                ▼
        ┌─────────────────────────────────────────────────────┐
        │                     NestJS Backend                  │
        │                                                     │
        │   ┌───────────────────────────────┐                 │
        │   │        PlansService           │                 │
        │   │  - generateWeek()             │                 │
        │   │  - regenerateDay()            │                 │
        │   └───────────┬───────────────────┘                 │
        │               │ calls AgentsService                 │
        │               ▼                                     │
        │   ┌───────────────────────────────┐                 │
        │   │        AgentsService          │                 │
        │   │  Coach → Review → Nutrition   │                 │
        │   │  → Vision → Finalise Output   │                 │
        │   └───────────────────────────────┘                 │
        │                                                     │
        │  Neon Postgres (TypeORM Entities)                   │
        │  - Users                                            │
        │  - Profiles                                         │
        │  - Plans / Days / Meals                             │
        │  - Action Logs                                      │
        └─────────────────────────────────────────────────────┘
```

---

## ⚙️ Core Backend Components

### 1. AgentsService
Implements the entire multi-agent orchestration pipeline:

- Coach → Review → Nutrition sequencing  
- Prompt construction  
- Schema enforcement using Zod  
- Retry logic for malformed outputs  
- Vision macro extraction  
- Supports cloud + local LLMs (Ollama / OpenAI)

Environment-driven configuration:

```
LLM_MODEL_REVIEW=gpt-5-mini
LLM_MODEL_COACH=gpt-5-mini
LLM_MODEL_NUTRITION=gpt-5-nano
LLM_MODEL_VISION=gpt-4.1-mini
LLM_MODE=cloud | local
LLM_BASE_URL=<ollama-url-if-local>
```

---

### 2. PlansService
Handles complete weekly plan generation:

- `generateWeek()` – builds seven fully validated days  
- `regenerateDay()` – replaces a single day without breaking the plan  
- Profile-driven macro + calorie calculations  
- Budget enforcement  
- Delegation to AgentsService with validation  
- Final plan persistence

Ensures stable, deterministic generation even under partial agent failures.

---

### 3. Strict Zod Schemas
These schemas guarantee compatibility and stability:

- `DayMealSchema`  
- `PlanDaySchema`  
- `WeeklyPlanSchema`  

Invalid responses are corrected before proceeding.

---

## 🔐 Authentication Flow

- JWT-based login  
- `POST /auth/register`  
- `POST /auth/login`  
- `GET /auth/me`  
- Profiles stored separately for cleaner domain separation  
 - `/auth/register` kicks off the user onboarding flow `/onboarding` → `/plans`.

Credit limits or usage controls can be added without enabling open public signups.

---

## 📡 API Endpoints

### Auth
```
POST /auth/register
POST /auth/login
GET  /auth/me
```

### Profile
```
GET  /profile/me
PUT  /profile/me
```

### Plans
```
POST /plans/week/generate
POST /plans/:id/day/:dayIndex/regenerate
GET  /plans/week/current
```

### Vision
```
POST /agents/vision/recognize
```

---

## 🛠 Local Development

```
git clone <repo-url>
cd backend
npm install
```

### Environment Setup
```
cp .env.example .env
```
Add Postgres + LLM credentials.

### Database Migrations
```
npm run typeorm:migration:run
```

### Start Backend
```
npm run start:dev
```

---

## 🧭 Roadmap

- Pantry View and manual updates (UI )
- Live supermarket price scraping (UK market)  
- Multi-item vision recognition  
- Subscription tiers with usage credits  
- Multi-culture recipe intelligence  
- Insights dashboard  
- Learning user preference and using it for future plans
- Implementing full meal planner based on proper professional level contraints as recorded in the docs/current-progress

---

## 📄 License

Licensed under the MIT License.  
See `LICENSE` in this repository.
