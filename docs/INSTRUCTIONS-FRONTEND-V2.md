# INSTRUCTIONS-FRONTEND-V2.md
## AI-Powered Meal Planning Platform – Frontend V2 Plan

This document defines the **Frontend V2 scope and design** for the AI-powered meal planning system.

V2 goals for frontend:

- Implement a **portfolio-grade dashboard UI** using:
  - **React + Vite**
  - **TypeScript**
  - **Tailwind CSS**
  - **shadcn/ui**
- Support the core flows:
  - Profile management
  - Week generation (with optional advanced settings)
  - Viewing and interacting with weekly plans
  - Swapping recipes from a deterministic list
  - Modifying ingredients (simple swaps)
  - Viewing and managing the grocery list
- Apply a **Notion-like neutral palette** that still feels suitable for fitness/nutrition.
- Integrate cleanly with the existing backend V1/V2 APIs.
- No auth in V2 (assume a single demo user).

---

## 1. Tech Stack & Project Structure

### 1.1. Stack

- **React 18+** with **Vite**
- **TypeScript**
- **Tailwind CSS**
- **shadcn/ui** (for consistent components)
- Optional: **React Query (TanStack Query)** for API data fetching/caching

### 1.2. Directory layout

```txt
/frontend
  /src
    /components
      /layout
      /profile
      /plans
      /groceries
      /shared
    /pages (or /routes if using React Router)
    /hooks
    /lib
    /types
    /api
```

---

## 2. Design System & Theme

### 2.1. Visual style

Target: **Neutral / Notion-like**

- Backgrounds:
  - `#f5f5f5` / `#fafafa` for main background
  - White cards (`#ffffff`) with soft shadows
- Text:
  - Dark grey (`#111827`, `#374151`)
- Accents:
  - Use a **single primary accent color** (e.g. soft blue or soft green) for buttons and highlights.
- Borders:
  - 1px subtle neutral borders for cards and inputs.

### 2.2. Layout system

- Global layout = **sidebar + content**:
  - Left: fixed-width vertical sidebar
  - Right: scrollable main content
- Use shadcn/ui components where appropriate:
  - `Button`, `Card`, `Input`, `Select`, `Dialog`, `Sheet`, `Tabs`, `Switch`, `Badge`, etc.

### 2.3. Responsiveness

- Design primarily for **desktop** (since it’s portfolio-focused), but ensure:
  - Sidebar can collapse on small screens.
  - Pages are readable on tablet sizes.

---

## 3. Core Screens & Flows

V2 should implement three main screens:

1. **Profile**
2. **Plans**
3. **Groceries**

Accessible via sidebar navigation.

---

## 3.1. Layout: `AppShell`

Create a top-level `AppShell` component:

- Sidebar on the left with nav items:
  - Profile
  - Plans
  - Groceries
- Main area on the right for the selected page.

Example structure:

```tsx
// src/components/layout/AppShell.tsx
export function AppShell() {
  return (
    <div className="flex min-h-screen bg-neutral-50">
      <Sidebar />
      <main className="flex-1 p-6">
        {/* Route outlet or conditional rendering of pages */}
      </main>
    </div>
  );
}
```

The sidebar can include:

- App logo / name at top
- Nav links (Profile, Plans, Groceries)
- Later: a theme toggle (light/dark) if desired

---

## 3.2. Profile Page

### 3.2.1. Purpose

- Collect and edit user profile & baseline preferences:
  - Age, height, weight, activity level, goal
  - Diet type
  - Allergies
  - Default meal schedule (which meals exist in a typical day)
  - Weekly budget (default)

### 3.2.2. UI Structure

Use a **two-column layout** for desktop:

- Left column: User info / body data
- Right column: Diet, allergies, defaults

Components:

- Cards (`<Card>`) for logical sections:
  - “Body & Goals”
  - “Diet & Allergies”
  - “Plan Defaults”

Fields (example):

- Body & Goals:
  - Age (number input)
  - Height (cm)
  - Weight (kg)
  - Activity level (select)
  - Goal (select: lose, maintain, gain)

- Diet & Allergies:
  - Diet type (select: none, halal, vegan, vegetarian, keto, etc.)
  - Allergies (multi-select of the 14 UK allergens)

- Plan Defaults:
  - Toggles: breakfast/snacks/lunch/dinner
  - Default weekly budget (GBP)

Buttons:

- “Save Profile” (primary)
- Show toasts on success/error.

### 3.2.3. API Integration

- GET `/api/user/profile` on load.
- PUT `/api/user/profile` on save.

Use React Query or custom hooks to manage loading / error / success states.

---

## 3.3. Plans Page

This is the **heart** of the UI.

### 3.3.1. High-level layout

Sections:

1. **Generate New Week** (top area)
2. **Current Plan** (main area)
3. **Plan History** (below current plan or in a secondary tab)

### 3.3.2. Generate New Week section

- Primary action button: **“Generate New Week”**
- Next to it, a subtle **“Advanced settings”** text button or icon.

When user clicks “Generate New Week”:

- Call the backend with profile defaults.
- Optionally, allow advanced settings via a **Sheet or Dialog**:

  Advanced settings may include:
  - Specific week start date
  - Override weekly budget
  - Override meal toggles

Backend endpoint:

- `POST /api/plan/generate-week`  
  - Body can be `{ useAgent: true/false, overrides: {...} }`.

Show a loading state (skeletons or spinner) while generating.

### 3.3.3. Current Plan detail view

For the current plan:

- Show a **summary card** at top:
  - Week start date
  - Total estimated cost
  - Total calories
  - Note: “Values are estimates”

- Below, render the week in a **column of day cards**:
  - Each day card shows:
    - Day name (Monday, Tuesday, etc.)
    - Daily calories & cost
  - Inside each day card:
    - Meal cards in order (Breakfast, Snack, Lunch, Dinner).

Each meal card shows:

- Recipe name
- Estimated calories & macros (if available)
- Estimated cost
- Meal type (solid/drinkable) as a small badge
- A small **“…” menu** or icon for actions:
  - Swap meal
  - Regenerate meal (if you wire it to the Review Agent later)
  - Modify ingredients

### 3.3.4. Swap meal flow (deterministic)

User clicks “Swap” on a meal:

- Open a **Dialog** with:
  - Title: “Swap Meal – [Meal Slot] on [Day]”
  - List of candidate recipes returned by:
    - `GET /api/recipes/candidates?slot=...&dayIndex=...` (or similar)

Candidate list item shows:

- Recipe name
- Macros summary
- Difficulty badge
- Cost estimate

User selects a new recipe and confirms:

- Call `POST /api/plans/:planId/set-meal-recipe` or similar endpoint.
- On success:
  - Close modal.
  - Invalidate plan query & refetch / optimistically update.

Also, the backend updates preferences (recipe score, ingredient scores) deterministically.

### 3.3.5. Modify ingredient flow (simple V2)

User clicks an ingredient inside a meal:

- Show a small popup or Dialog:
  - Current ingredient name
  - A search input (typeahead) to find a replacement ingredient.
- On selection of a new ingredient:
  - Call backend endpoint to create a **custom recipe** or apply a one-off ingredient substitution to that plan meal.
  - In V2, only persist as custom recipe if user explicitly clicks “Save this as my recipe”.

UI:

- Use shadcn/ui `Command` or `Combobox` style component for ingredient search.

---

## 3.4. Groceries Page

### 3.4.1. Purpose

- Display the shopping list for the **currently active plan**.
- Let the user:
  - Mark items as “already have this”.
  - Override ingredient prices.

### 3.4.2. Layout

- At the top: a dropdown or selector:
  - “Week of [date]” (default to current plan).
- Below: shopping list grouped by category, or simple list for V2.

For each ingredient row:

- Name
- Required quantity & unit
- Estimated cost
- Checkbox: `[ ] Already have`
- Text link: `Update price`

Clicking `Already have`:

- POST `/api/pantry/mark-have` with `{ ingredientId, hasItem: true/false }`.
- Update UI.

Clicking `Update price`:

- Open a small Dialog asking:
  - “How much did you pay and for what quantity?”
- On submit:
  - `POST /api/ingredients/user-price` with `{ ingredientId, quantity, pricePaid }`.
  - Backend updates `user_ingredient_price` table and updates cost calculations.

---

## 4. State Management & API Layer

### 4.1. Recommended approach

Use **React Query** for:
- Profile data
- Current plan
- Plan history
- Shopping list
- Recipe candidates

Create `/src/api` helpers to wrap fetch calls, for example:

```ts
export async function fetchProfile() { ... }
export async function updateProfile(data) { ... }
export async function generateWeek(input) { ... }
export async function fetchCurrentPlan() { ... }
export async function fetchShoppingList(planId) { ... }
export async function fetchRecipeCandidates(params) { ... }
```

Hooks:

```ts
function useProfile() { ... }
function useCurrentPlan() { ... }
function useShoppingList(planId) { ... }
```

These hooks can handle `isLoading`, `isError`, etc.

### 4.2. Error & loading states

- Show skeletons in cards while data is loading.
- Use shadcn `Toast` for errors:
  - E.g., “Failed to generate plan. Please try again.”

---

## 5. Interaction with Review Agent (Optional in V2 UI)

In V2, most flows can be fully deterministic.  
However, we can optionally expose a **“Explain / Adjust”** entry point:

On a meal card:

- Action: “Adjust with AI” (optional, for later V2 stage).
- Opens Dialog with a textarea:
  - “What would you like to change about this meal?”
- On submit:
  - POST to `/plans/:planId/actions` with:
    - `actionContext` (type: `regenerate_meal`, target IDs)
    - `reasonText` from the user
- Backend will:
  - Use Review Agent to create a `ReviewInstruction`
  - Orchestrator applies changes

Initially, keep this **behind a feature flag** or simply not visible until backend is ready.

---

## 6. UX Polish for Portfolio

To make the app feel **interview-ready**:

- Add subtle transitions on cards and buttons.
- Use consistent spacing and typography.
- Add a simple **app name and logo text** in the sidebar (e.g. “NutriCoach” / “PlanFuel” / etc.).
- Provide a **default demo state**:
  - Seed DB with a demo user + sample plan so the UI is not empty.
- Optional: light/dark mode toggle using Tailwind + shadcn theme controls.

---

## 7. Frontend V2 Task Checklist

### 7.1. Setup & Design System

- [ ] Initialize React + Vite + TypeScript project.
- [ ] Set up Tailwind CSS.
- [ ] Integrate shadcn/ui and generate basic components (Button, Card, Dialog, Input, Select).
- [ ] Implement global `AppShell` with sidebar layout.
- [ ] Establish color palette and typography.

### 7.2. Profile Page

- [ ] Create `ProfilePage` with sections: Body & Goals, Diet & Allergies, Plan Defaults.
- [ ] Implement form with controlled inputs and validation hints.
- [ ] Implement hooks to:
  - [ ] Load profile from backend.
  - [ ] Save profile to backend.
- [ ] Add success/error toasts.

### 7.3. Plans Page

- [ ] Create `PlansPage` layout.
- [ ] Add “Generate New Week” button.
- [ ] Add optional “Advanced settings” modal (basic for V2).
- [ ] Render current plan summary (week start, total kcal, cost).
- [ ] Render per-day cards with meals.
- [ ] Implement “Swap” action:
  - [ ] Fetch candidates via API.
  - [ ] Show list in Dialog.
  - [ ] Call backend to set chosen recipe.
- [ ] Implement “Modify ingredient” basic flow:
  - [ ] Ingredient click → search + select replacement.
  - [ ] Call backend endpoint for substitution.
  - [ ] Optionally offer “Save this as my recipe” checkbox if backend supports it.

### 7.4. Groceries Page

- [ ] Create `GroceriesPage` layout.
- [ ] Load shopping list for current plan.
- [ ] Render list of ingredients with quantity & cost.
- [ ] Implement “Already have” toggle.
- [ ] Implement “Update price” dialog and API call.

### 7.5. Integration & Polish

- [ ] Ensure navigation between tabs persists state.
- [ ] Handle backend errors gracefully with toasts.
- [ ] Add loading skeletons where necessary.
- [ ] Check responsiveness on smaller screens.

---

This completes the **Frontend V2 instruction spec**.  
Use it as a blueprint to build a clean, professional UI that showcases the backend capabilities in a way that looks strong in a portfolio or interview demo.
