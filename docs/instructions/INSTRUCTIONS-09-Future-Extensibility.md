# 9. Future Extensibility & Enhancements

The design described so far focuses on a solid, enterprise-style Version 1. This section outlines natural extensions that can be added later without changing the core architecture.

## 9.1 Preference Learning

Currently, the Profile does not explicitly collect “liked/disliked ingredients” beyond diet types and allergies. Future enhancements can include:

- Recording user actions such as:
  - Meals frequently swapped out.
  - Recipes that are consistently kept or repeated.
  - Ingredients repeatedly removed during modifications.
- Deriving:
  - A list of **preferred ingredients**.
  - A list of **disliked ingredients**.
  - **Preferred cuisines**.

This information could be stored in a new table, e.g. `user_preferences`, and used to:

- Filter out recipes containing strongly disliked ingredients.
- Boost recipes that match preferred patterns when building candidate lists.
- Provide a better ranking input to the Coach Agent.

## 9.2 Additional Agents

In future versions, additional LLM agents could be added:

1. **Preference Agent**
   - Reads interaction history and incrementally maintains a preference profile (e.g. liked cuisines, disliked textures, etc.).

2. **Explanation Agent**
   - Answers “Why did you choose this meal?” or “Why is my protein low on Thursday?”

3. **Nutrition Advisor Agent**
   - Provides structured suggestions about diet improvements, hydration, or timing around workouts.

These can be built on top of the existing plan data, with no changes to the database schema.

## 9.3 Workout Integration

Since the target audience often trains at the gym, the system could integrate:

- Logging of gym days and intensity.
- Per-day calorie and protein tweaks (e.g. slight increase on workout days).
- Timed recommendations (e.g. pre-workout or post-workout meals).

This would require:

- Additional fields in `user_profile` or a new table for schedule/log.
- Slight extensions to the Coach Agent prompt to consider workout days when selecting meals.

## 9.4 Multi-Week Planning

Currently, plans are generated one week at a time. In future versions, you might:

- Allow users to schedule multiple weeks ahead.
- Store multi-week plans with cycles (e.g. 2-week rotation).
- Let the Coach Agent consider longer-term variety and re-use or avoid repeating recipes too soon across weeks.

## 9.5 More Diet Types & Localization

Over time, new diet tags and regional variations may be added:

- Culturally specific diets (e.g. Mediterranean, South Asian vegetarian patterns).
- Country-specific recipes and pricing.
- Localization of recipe names and instructions.

The current design with diet tags and recipe/ingredient tables is flexible enough to support this.

## 9.6 Security & Compliance (Later Stage)

Although Version 1 is focused on functionality and not security compliance, an enterprise-ready system would later consider:

- Proper authentication and authorization (e.g. OAuth, JWT, or external identity providers).
- Data privacy, retention, and deletion policies.
- Encryption at rest and in transit.
- Audit logs for changes to profile and critical data.
- Compliance with local regulations (e.g. GDPR).

These concerns can be layered on top of the existing architecture, with minimal impact on the core meal planning logic.

---

This concludes the instruction set for the initial version of the system.  
The preceding sections together form a comprehensive blueprint for implementing an enterprise-style, AI-assisted meal planning product with:

- A clear separation between LLM responsibilities and backend logic.
- Strong, explicit rules for diets and allergens.
- A predictable, editable weekly plan structure.
- Local LLM usage by default, with optional migration to cloud in future.
