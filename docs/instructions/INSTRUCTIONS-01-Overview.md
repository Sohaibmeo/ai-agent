# 1. Purpose & Product Summary

This document describes the full architecture and behaviour of an enterprise-style **AI-powered meal planning system**, designed for UK-based students and young professionals.

The product’s primary goals are:

- Help users **hit their body composition goals** (lose, maintain, or gain weight, with a focus on retaining or building muscle).
- Respect **dietary rules** (Halal, Vegan, Vegetarian, Keto, etc.).
- Respect **allergies**, using the standard 14 major UK allergen categories.
- Keep meals **simple, realistic, and easy to cook** with common supermarket ingredients.
- Keep plans **budget-aware**, using per-ingredient cost estimates and user price overrides.
- Provide a **smooth editing experience** where users start from a solid plan and then tweak it (swap or modify meals) instead of generating everything from scratch each time.
- Offer a clear **shopping list** derived from the final weekly plan.

The system is built as a modern web application:

- **Frontend**: React + TypeScript (a dashboard with three main tabs: Profile, Plans, Groceries).
- **Backend**: NestJS + TypeScript (modular architecture with controllers, services, and an orchestrator layer).
- **Database**: Postgres (for users, recipes, ingredients, plans, shopping lists, etc.).
- **AI / LLM**: LangChain JS with a **local OpenAI-compatible model** for Version 1. Cloud models (such as GPT-5-mini) can be plugged in later without changing business logic.

The most important design decision is that the **LLM never invents recipes or nutritional data**. Instead:

- All **recipes** live in the database (a curated set plus user-created recipes).
- All **ingredients** have stored macros (kcal, protein, carbs, fat) and price per unit.
- The LLM only acts as a **selector and planner**, choosing from supplied recipes and re-arranging them into a weekly plan according to user goals, diet rules, allergies, and constraints.

Two LLM agents are used:

1. **Review Agent** – interprets user actions (e.g., “swap this meal”, “make it cheaper”, “I don’t want tuna”) into a structured instruction object.
2. **Coach Agent** – given a user profile, candidate recipe lists, and structured instructions, selects recipes and assembles a **WeeklyPlan** JSON (7-day plan with meals referencing recipe IDs).

All nutritional calculations (calories, macros) and cost calculations are performed by the **backend**, based on ingredient data. The LLM is never the source of truth for numbers.

The rest of this document describes the architecture, domain concepts, flows, prompts, and constraints in enough detail to implement the system end-to-end.
