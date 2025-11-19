## AI Meal Planning Playground

This repository implements the backend prototype for the UK-focused AI meal coach described in `docs/flow`. The current focus is on scaffolding the LangChain agents, Postgres data model, and Express API so we can iterate on the product flows quickly.

### Stack

- **Runtime**: Node.js + Express + TypeScript.
- **Database**: PostgreSQL with SQL schema & seed scripts (no Prisma).
- **Agents**: LangChain JS + ChatOpenAI, using Zod + StructuredOutputParser to guarantee JSON.
- **Validation**: Zod schemas shared across the orchestrator and API.

### Getting Started

```bash
npm install
cp .env.example .env   # update DATABASE_URL + OPENAI_API_KEY
npm run seed           # create tables + mock catalog (40 ingredients, 20+ recipes)
npm run dev            # starts the Express API on http://localhost:3000
```

The backend assumes a single placeholder user id (`00000000-0000-0000-0000-000000000001`) for now. All profile, plan, and shopping list flows operate on this demo user until UI/auth is implemented.

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
