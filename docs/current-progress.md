# Unfinished items

## Backend

Structured logs/metrics (agent success/failure, per-action audit).
Budget/variety heuristics: richer day-level budget handling and variety constraints

## Frontend

Recipe detail still uses stub data; needs real recipe/ingredient/method data and a save endpoint to persist ingredient edits/add/remove and AI notes.
Swap dialog: show real macros/prices, add esc/outside-click close, and hook “auto decide” to backend/LLM when ready.
Plans page: History tab and stronger empty/error/toast states; advanced settings flow is not implemented.
Groceries: week selector/history not implemented; need derived estimated total from backend (now UI-only) and better grouping.
Design system gaps: shadcn/ui not integrated; unit dropdown in ingredient modal still TODO; responsive tweaks still pending.