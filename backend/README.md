## AI Meal Planning Playground

This repository implements the backend prototype for the UK-focused AI meal coach described in `docs/flow`. The current focus is on scaffolding the LangChain agents, Postgres data model, and Express API so we can iterate on the product flows quickly.

### Stack

- **Runtime**: Node.js + Express + TypeScript.
- **Database**: PostgreSQL with SQL schema & seed scripts (no Prisma).
- **Agents**: LangChain JS + ChatOpenAI, using Zod + StructuredOutputParser to guarantee JSON. Every call logs model + token usage (when provided by the SDK) and surfaces raw output whenever parsing fails so we can trace issues quickly.
- **Validation**: Zod schemas shared across the orchestrator and API.

### Getting Started

```bash
npm install
cp .env.example .env   # update DATABASE_URL + OPENAI_API_KEY
npm run seed           # create tables + mock catalog (40 ingredients, 20+ recipes)
npm run dev            # starts the Express API on http://localhost:3000
```

The backend assumes a single placeholder user id (`00000000-0000-0000-0000-000000000001`) for now. All profile, plan, and shopping list flows operate on this demo user until UI/auth is implemented.

Environment variables (`.env`) include:

```
DATABASE_URL=postgres://postgres:postgres@localhost:5432/ai_agent
OPENAI_API_KEY=your_key_here
LLM_MODEL=gpt-5-mini          # optional global override
COACH_MODEL=gpt-5-mini        # coach agent default
REVIEW_MODEL=gpt-5-nano       # review agent default
PORT=3000
```

Any LangChain-compatible base URL can be set via `LLM_BASE_URL` if you proxy requests to a local OpenAI-compatible server.

### Example CLI Flow (manual smoke test)

```bash
# 0. start the API
cd backend
npm run dev

# 1. Fetch the default profile + preferences
curl -s http://localhost:3000/api/user/profile | jq

# 2. Update profile basics (diet, budget, schedule, etc.)
curl -s -X PUT http://localhost:3000/api/user/profile \
  -H "Content-Type: application/json" \
  -d '{"profile":{"dietaryRequirement":"halal","weeklyBudgetGbp":45,"mealBreakfast":true,"mealSnack":false,"mealLunch":true,"mealDinner":true}}'

# 3. Generate a brand new week (Coach Agent -> WeeklyPlan JSON -> persisted plan + shopping list)
curl -s -X POST http://localhost:3000/api/plan/generate-week | jq '.id,.weekStartDate,.status'

# 4. Retrieve the current plan (to confirm it was saved)
curl -s http://localhost:3000/api/plan/current | jq '.days[0].meals[0]'

# 5. Trigger an action (e.g., regenerate first meal for a cheaper variant)
curl -s -X POST http://localhost:3000/api/plan/action \
  -H "Content-Type: application/json" \
  -d '{
        "weeklyPlanId": "<plan-id-from-step-3>",
        "actionContext": {
          "type": "regenerate_meal",
          "planDayId": "<day-id>",
          "planMealId": "<meal-id>"
        },
        "reasonText": "make it cheaper"
      }' | jq '.days[0].meals[0]'

# 6. Inspect the shopping list generated for that plan
curl -s "http://localhost:3000/api/shopping-list?weeklyPlanId=<plan-id>" | jq '.[0]'

# 7. Add a custom ingredient (manual entry)
curl -s -X POST http://localhost:3000/api/ingredients/custom \
  -H "Content-Type: application/json" \
  -d '{"name":"My Protein Bar","unit":"per_piece","kcalPerUnit":210,"proteinPerUnit":18,"carbsPerUnit":16,"fatPerUnit":8,"estimatedPricePerUnit":1.5,"tags":["halal"]}'
```

During these steps the server logs lines like:

```
LLM usage { agent: 'coach', model: 'gpt-5-mini', inputTokens: 1800, outputTokens: 950 }
```

If Zod parsing fails you will also see the raw LLM output logged before the error bubbles back as HTTP 500.

### API Surface (V1)

- `GET/PUT /api/user/profile` – onboarding, preferences, and “My ingredients/recipes”.
- `POST /api/plan/generate-week` – orchestrator → Coach Agent to create a 7-day plan.
- `POST /api/plan/action` – Review Agent interprets actionContext + reason, Coach Agent regenerates.
- `GET /api/plan/current` – latest persisted plan (LLM-derived).
- `GET/POST /api/shopping-list/*` – shopping list, pantry toggles, price overrides.
- `POST /api/ingredients/custom` & `/custom/enrich` – manual + LLM-assisted ingredient creation.
- `POST /api/recipes/custom` – user-authored recipes integrated back into the catalog.

### Project Layout

```
docs/flow                # Product + data specification
src/
  api/                   # Express routers
  db/                    # Schema, repositories, mock seed data
  llm/                   # Coach + Review agents, schemas, orchestrator, enrichers
  server.ts              # Entry point
```
