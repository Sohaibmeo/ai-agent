# 🧠 AI-Powered Meal Planning Platform
### Enterprise-Grade Nutrition, Cost Optimization & Preference-Learning System  
Built with **NestJS**, **Postgres**, **Local LLM Agents**, **TypeScript**, and **Structured AI Orchestration**

---

## 📌 Overview

This repository contains a **production-ready AI-Assisted Meal Planning System**, designed for the UK market.  
It generates **7-day meal plans** tailored to:

- Body composition goals (lose / maintain / gain)  
- Diet requirements (Halal, Vegan, Vegetarian, Keto, etc.)  
- UK’s 14 allergen categories  
- Weekly budget constraints  
- Recipe difficulty  
- Meal schedule preferences  
- User behaviour (likes, dislikes, swaps, custom recipes)

The system combines:

- **Local LLM agents** (Review Agent + Coach Agent)  
- **Strong deterministic backend logic** (macro/cost engine, filtering, targets)  
- **Preference learning**  
- **Recipe + Ingredient catalogs with cost estimation**  
- **Shopping list generation with price overrides + pantry tracking**

This architecture prioritises **reliability**, **explainability**, and **cost efficiency** while still benefiting from AI reasoning where helpful.

---

## 🧩 System Flow (Figma Diagram)

Prototype Workflow:  
👉 https://github.com/Sohaibmeo/ai-agent/raw/adv-fitness-agent/docs/Figma.png

This illustrates user navigation: **Profile → Plans → Groceries**, including swaps, modifications, price overrides, and ingredient interactions.

---

## 🏗️ Core Architecture

### **Backend**
- **NestJS + TypeScript**
- **PostgreSQL (TypeORM)**
- **Modular domain architecture**
- **Zod validation for all AI structured outputs**
- **Local compatible LLM endpoints** for agents
- **Deterministic domain logic** for macros and cost calculations

### **AI Layer**
- **Review Agent** – interprets user intent into structured instructions  
- **Coach Agent** – selects recipes per day/meal slot using ranked candidates  
- **Structured JSON I/O with Zod validation**  
- **Fallback logic** ensures reliability if AI fails validation  

---

## 📦 Features Implemented

### ✅ **User Profile**
- Age, height, weight, activity level  
- Goal (lose/maintain/gain)  
- Diet type (Halal, Vegan, etc.)  
- Allergens (14 UK categories)  
- Default plan settings (optional)
- Meal schedule defaults

### ✅ **Recipe & Ingredient Catalog**
- Ingredient macros, allergens, cost per unit  
- Recipes with difficulty, diet tags, base macros & cost  
- Linking via RecipeIngredient with quantities and units  

### ✅ **User Preferences & Learning**
- Recipe-level likes/dislikes  
- Ingredient-level scoring  
- Automatic learning when swapping meals  

### ✅ **Weekly Plan Generation**
- 7-day plan  
- Daily meal slots  
- Portion scaling toward calorie/protein targets  
- Diet, allergen, difficulty filtering  
- Optional LLM-assisted selection  
- Deterministic fallback generation  

### ✅ **Shopping List Engine**
- Aggregates ingredients across the week  
- Applies user price overrides  
- Pantry tracking (“already have this”)  

### ✅ **LLM Agents**
- Structured-review instructions  
- Recipe selection  
- Nutrition insights  
- Error handling + JSON schema enforcement  

---

## 🔧 Backend Structure

```
src/
 ├─ agents/
 ├─ plans/
 ├─ recipes/
 ├─ ingredients/
 ├─ preferences/
 ├─ shopping-list/
 ├─ users/
 ├─ database/
 └─ common/
```

---

## 🧠 AI Orchestration

### **Review Agent**
Inputs:
- Action (swap/modify)
- Reason  
- Plan context  

Outputs:  
- `ReviewInstruction` with actionable structure  

### **Coach Agent**
Inputs:
- Profile  
- Targets  
- Candidate recipes  

Outputs:  
- `{ days: [ { day_index, meals: [ { recipe_id, portion_multiplier } ] } ] }`  

Backend recalculates macros & cost deterministically.

---

## 🧮 Deterministic Engine

The backend—not the LLM—handles:

- Calorie targets  
- Protein targets  
- Portion scaling  
- Budget logic (upcoming)  
- Difficulty filtering  
- Allergen filtering  
- Macro calculations  
- Shopping list generation  

This ensures **accuracy** and **consistency**.

---

## 📊 Database Schema (Summary)

```
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
```

---

## 🧪 Development Status

### ✔ Backend foundations  
### ✔ AI agent wrappers  
### ✔ Weekly plan generator  
### ✔ Shopping list engine  
### ✔ Preference learning  
### ✔ Ingredients/recipes schema  
### △ Budget-aware AI selection (upcoming)  
### △ Frontend UI (next phase)  
### △ Figma update needed  

---

## 🚀 Next Milestones

### **1. Frontend MVP**
- Profile  
- Generate Week  
- Current Plan  
- Swap Recipe  
- Groceries  

### **2. Improved Coach Agent**
Include metadata for calorie/cost-awareness.

### **3. Weekly Plan Settings Modal**
Replace reliance on profile-only settings.

### **4. Enhanced Review Agent Schema**
Add structured action parameters.

### **5. Recipe expansion**
Improve coverage across diets and meal slots.

---

## 🛠️ Getting Started

### Install
```bash
npm install
```

### Environment variables
```env
DATABASE_URL=postgres://...
LLM_BASE_URL=http://localhost:11434/v1
LLM_MODEL_REVIEW=llama3
LLM_MODEL_COACH=llama3
```

### Start Postgres
```bash
docker-compose up -d
```

### Run migrations & seeds
```bash
npm run typeorm:migration:run
npm run seed
```

### Start backend
```bash
npm run start:dev
```

---

## 📄 License
[MIT License](https://github.com/Sohaibmeo/ai-agent/blob/main/LICENSE)

