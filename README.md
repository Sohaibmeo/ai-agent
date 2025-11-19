## AI Meal Planning Playground

This repo prototypes the UK-focused AI meal coach described in `docs/flow`.

### Stack

- **Backend** – Node.js + Express + TypeScript, LangChain-style agent orchestration stubs, Zod validation.
- **Frontend** – React + TypeScript (Vite) with an end-to-end weekly planner dashboard.

### Getting Started

```bash
npm install
npm run dev:server    # http://localhost:4000
npm run dev:web       # http://localhost:5173
```

The default demo user id is `demo-user`. The web app loads this user automatically.

### Flows Implemented

- Profile, dietary, and preference editing.
- Week generation + regeneration by day, meal, or ingredient swap/remove.
- Free-form feedback → Review agent instruction → Coach agent apply.
- Consolidated shopping list with estimated costs.

### Project Layout

```
apps/
  server/   # Express API + coach/review/price agents
  web/      # React dashboard
docs/
  flow      # Product + data specification
```
