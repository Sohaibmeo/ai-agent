# Current Progress – Frontend V2

## Current state
- Scaffolding: Vite + React + TypeScript with Tailwind 3, React Router, React Query, AppShell/Sidebar layout.
- Pages:
  - Profile: loads/saves profile via `/users/:id/profile` with controlled fields (body/goals, diet/allergies, plan defaults).
  - Plans: loads active plan, shows week/day/meal cards, triggers plan generation, basic swap dialog to set a new recipe and refetch plan.
  - Groceries: loads active shopping list and renders items.
- API layer/hooks: profile, plans (generate/action/set-meal), recipe candidates, shopping list; demo user/config set.
- Builds clean (`npm run build`).

## Next steps
- UI polish with shadcn components and Figma-inspired styling; add loading/error states and toasts.
- Plans page: add advanced settings modal, ingredient edit/avoid/change-meal-type flows, and polish swap dialog UI. Proper swap/ingredient edit flows: candidate list UI polish, edit ingredients modal, integrate avoid/change meal type actions.
- Groceries: implement “already have” toggle and “update price” dialog wired to backend endpoints.
- Optional AI/agent UI entry points (adjust with AI, choose-ingredient) behind toggles.
- Improve state handling (optimistic updates) and responsiveness.
