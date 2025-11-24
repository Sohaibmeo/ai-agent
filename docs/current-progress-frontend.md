# Current Progress – Frontend V2

## Current state
- Scaffolding: Vite + React + TypeScript with Tailwind 3, React Router, React Query, AppShell/Sidebar layout.
- Pages:
  - Profile: loads/saves profile via `/users/:id/profile` with controlled fields (body/goals, diet/allergies, plan defaults).
  - Plans: redesigned per mock (always-visible AI note, primary Generate CTA, day headers with kcal/protein/cost, pill-style meal cards with hover + cost badge + stable kebab menu, swap dialog refetches).
  - Groceries: loads active shopping list and renders items.
- Recipe detail: polished UI with slot/type/kcal/cost tags, AI note textarea (cancel clears), ingredient list styled like mock, method placeholder.
- API layer/hooks: profile, plans (generate/action/set-meal), recipe candidates, shopping list; demo user/config set.
- Builds clean (`npm run build`).

## Next steps
- Wire recipe detail to real meal/recipe data and hook “Apply changes” (toast or backend call).
- Add ingredient swap modal on recipe detail and tie into resolve/swap flow.
- Plans page polish: outside-click close for kebab menu, history tab, better empty/error states.
- Groceries: implement “already have” toggle and “update price” dialog wired to backend endpoints.
- Global polish: toasts for errors/success, loading/error states, responsiveness.

## New UX guidance
- Always show the “Tell the AI what to prioritize this week (optional)” textarea (not gated by Advanced).
- Keep “Generate New Week” as a primary CTA; “Advanced settings” as secondary.
- Days should default to collapsed with clean headers showing kcal/protein/cost.
- Meal cards should be pill/bubble style with rounded borders, a cost badge, and a kebab menu that opens a floating dropdown without shifting layout; hover/active states should be clear.
- Day layout should match the reference: each day header shows kcal/protein/cost, and expanded meals are rendered as rounded inset cards with light borders/shadows, cost pill on the right, subtle meal slot + meal_type tags, and macros (P/C/F) displayed. Cards should have a hover state to signal interactivity and menus should not distort the layout.
