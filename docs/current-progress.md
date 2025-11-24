# Unfinished items

## Backend

Structured logs/metrics (agent success/failure, per-action audit).
Budget/variety heuristics: richer day-level budget handling and variety constraints

## Frontend

Recipe detail still uses stub data; needs real recipe/ingredient/method data and a save endpoint to persist ingredient edits/add/remove and AI notes.
Swap dialog: show real macros/prices, add esc/outside-click close, and hook “auto decide” to backend/LLM when ready.
Plans page: History tab and stronger empty/error/toast states; advanced settings flow is not implemented.
Groceries: week selector/history not implemented; need derived estimated total from backend (now UI-only) and better grouping.
unit dropdown in ingredient modal still TODO; responsive tweaks still pending.


# Suggestions for next changes : 
## Backend

Add a lightweight audit trail on plan actions (who/when/what) to help debugging and support future history UI.
Cache recipe candidates by slot/diet/difficulty to speed swaps, with short TTL and cache-busting on recipe updates.
Add simple rate limiting or request shaping for LLM calls to avoid runaway retries.

## Frontend

Add a small plan history list (date + status) to the Plans page to let users re-open past plans, even if the full history tab isn’t built yet.
Add empty/error states with inline retry for plan load, candidates, and shopping list (beyond toasts).
Quick “copy shopping list” or “export to CSV” from Groceries for sharing.