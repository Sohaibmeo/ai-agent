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

This repository contains the **full technical blueprint** required for implementation.  
You may now begin building the backend, frontend, or LLM orchestration layer.

---

## 🛠️ Development Phases

### Phase 1: Core System & MVP
- User profile onboarding (diet, allergies, goals, meal schedule, difficulty, budget)
- Recipe/ingredient database setup (with diet tags, allergens, nutrition, cost)
- Weekly meal plan generation (backend logic)
- Simple meal swap and custom recipe creation
- Shopping list generation (pantry tracking, price overrides)
- Local LLM integration (Review Agent, Coach Agent) for plan selection only
- Strict JSON validation (Zod schemas)
- Basic REST API

**Frontend will be built only after backend and agents are complete.**

### Phase 2: Advanced Editing & User Experience
- Plan history and multi-week support
- Enhanced swap/modify flows (LLM-driven suggestions: cheaper, higher protein, etc.)
- Ingredient-level likes/dislikes and preference learning
- Improved UI/UX (modals, feedback, error handling)

### Phase 3: Extensibility & Integrations
- Cloud LLM support (easy migration)
- Workout/gym integration (logging, per-day nutrition tweaks)
- Localization (diet types, recipes, pricing)
- Security and compliance (auth, GDPR, audit logs)

### Phase 4: Analytics & Personalization
- Usage analytics and reporting
- Preference Agent, Explanation Agent, Nutrition Advisor Agent
- Advanced ranking and recommendation logic

