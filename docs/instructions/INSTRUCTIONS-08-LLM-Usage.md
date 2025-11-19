# 8. LLM Usage & Local-First Strategy

This system is designed to be **LLM-light** and **cost-efficient**, with a clear separation of responsibilities between AI and traditional backend logic.

## 8.1 Principles

1. **LLM is a selector, not a generator of data.**
   - It selects recipes from candidate lists.
   - It **does not** invent new recipes or ingredients.
   - It **does not** compute nutrition or prices.

2. **Backend is the source of truth for:**
   - Recipes and their ingredients.
   - Nutrition and cost values (from ingredient data).
   - Diet and allergen validation.

3. **LLM usage is optional in some flows.**
   - Simple “Swap” actions can be done entirely in the backend with a UI that lets users choose from recipe lists.
   - LLM is most useful for:
     - More complex swaps (e.g. “make this cheaper”, “higher protein”).
     - Intelligent weekly planning from candidates.
     - Natural language feedback interpretation.

## 8.2 Local LLM First

Version 1 should run on a **local OpenAI-compatible LLM** server, such as:

- Ollama
- LM Studio
- A self-hosted vLLM server

The LangChain `ChatOpenAI` client can be configured with:

- `baseURL` pointing to the local server.
- `model` name corresponding to the local model.

The code should **not** hard-code OpenAI cloud endpoints, but should make them configurable via environment variables, for example:

- `LLM_BASE_URL`
- `LLM_MODEL_REVIEW`
- `LLM_MODEL_COACH`

This makes it easy to switch to OpenAI-hosted models (e.g. `gpt-5-mini`) later if desired, particularly for production or heavy workloads.

## 8.3 Token & Cost Control

Even on local models, it’s good practice to keep prompts compact and deterministic:

- Avoid sending full detailed ingredients and instructions when only recipe IDs and basic macros are needed for selection.
- For the Coach Agent:
  - Send a compact candidate list per meal slot with only necessary fields (ID, name, macros, tags).
- For the Review Agent:
  - Send a truncated plan (only relevant part of the plan), not the entire weekly plan in full detail.

Set reasonable `maxTokens` for responses, e.g. 1,000–3,000, depending on WeeklyPlan JSON size. The WeeklyPlan is structured and predictable, so you can keep outputs limited.

## 8.4 Error Handling & Validation

All LLM outputs must be passed through Zod schemas:

- `ReviewInstructionSchema` for Review Agent output.
- `WeeklyPlanSchema` for Coach Agent output.

If validation fails:

- Log the raw LLM output (for debugging).
- Return an error to the frontend explaining that the plan could not be updated at this moment.
- For some flows, you can fall back to simpler behaviour (e.g., ignore complex preference flags and allow manual swap selection).

## 8.5 Future: Migration to OpenAI Cloud

To migrate to OpenAI cloud models in the future:

1. Change `LLM_BASE_URL` to OpenAI’s endpoint.
2. Change `LLM_MODEL_REVIEW` and `LLM_MODEL_COACH` to, for example, `gpt-5-mini`.
3. Consider adding caching strategies (e.g. input caching or partial reuse of candidate lists).
4. Monitor token usage and latency.

The business logic and data model should remain unchanged; only environment configuration and possibly minor prompt tuning would be necessary.
