import { useEffect, useMemo, useState } from 'react';
import './App.css';
import { useMealPlanner } from './hooks/useMealPlanner';
import {
  PlanDay,
  PlanMeal,
  ReviewInstruction,
  UserPreferences,
  UserProfile
} from './types';

const DEMO_USER_ID = 'demo-user';
const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const arrayToText = (values: string[]) => values.join(', ');
const textToArray = (value: string) =>
  value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

const getDayLabel = (day: PlanDay) =>
  `${dayLabels[day.dayIndex]} ${day.dayIndex + 1}`;

function App() {
  const {
    user,
    plan,
    shoppingList,
    loading,
    error,
    validationIssues,
    lastInstruction,
    generateWeek,
    saveProfile,
    savePreferences,
    applyInstruction,
    interpretFeedback
  } = useMealPlanner(DEMO_USER_ID);

  const [profileDraft, setProfileDraft] = useState<UserProfile | null>(null);
  const [preferencesDraft, setPreferencesDraft] = useState<UserPreferences | null>(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [instructionPreview, setInstructionPreview] =
    useState<ReviewInstruction | null>(null);

  useEffect(() => {
    if (user) {
      setProfileDraft(user.profile);
      setPreferencesDraft(user.preferences);
    }
  }, [user]);

  const planSummary = useMemo(() => {
    if (!plan) return null;
    return {
      totalCost: plan.totalEstimatedCost?.toFixed(2),
      totalKcal: plan.totalKcal?.toFixed(0)
    };
  }, [plan]);

  const handleProfileChange = <K extends keyof UserProfile>(key: K, value: UserProfile[K]) => {
    setProfileDraft((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const handlePreferenceChange = <K extends keyof UserPreferences>(
    key: K,
    value: string
  ) => {
    setPreferencesDraft((prev) =>
      prev
        ? {
            ...prev,
            [key]: textToArray(value)
          }
        : prev
    );
  };

  const onSaveProfile = () => {
    if (profileDraft) {
      saveProfile(profileDraft);
    }
  };

  const onSavePreferences = () => {
    if (preferencesDraft) {
      savePreferences(preferencesDraft);
    }
  };

  const handleRegenerateDay = (day: PlanDay) => {
    if (!plan) return;
    applyInstruction({
      targetLevel: 'day',
      targetIds: { weeklyPlanId: plan.id, planDayId: day.id },
      action: 'regenerate_day'
    });
  };

  const handleRegenerateMeal = (day: PlanDay, meal: PlanMeal) => {
    if (!plan) return;
    applyInstruction({
      targetLevel: 'meal',
      targetIds: { weeklyPlanId: plan.id, planDayId: day.id, planMealId: meal.id },
      action: 'regenerate_meal'
    });
  };

  const handleRemoveIngredient = (meal: PlanMeal, ingredientName: string) => {
    if (!plan) return;
    applyInstruction({
      targetLevel: 'ingredient',
      targetIds: { weeklyPlanId: plan.id, planMealId: meal.id },
      action: 'remove_ingredient',
      params: { ingredientToRemove: ingredientName.toLowerCase() }
    });
  };

  const handleSwapIngredient = (meal: PlanMeal, ingredientName: string) => {
    if (!plan) return;
    const replacement = window.prompt('Replace with (ingredient name):');
    if (!replacement) return;
    applyInstruction({
      targetLevel: 'ingredient',
      targetIds: { weeklyPlanId: plan.id, planMealId: meal.id },
      action: 'swap_ingredient',
      params: {
        ingredientToRemove: ingredientName.toLowerCase(),
        ingredientToAdd: replacement
      }
    });
  };

  const onInterpretFeedback = async () => {
    if (!feedbackText.trim()) return;
    const instruction = await interpretFeedback(feedbackText);
    setInstructionPreview(instruction);
  };

  const onApplyPreview = () => {
    if (instructionPreview) {
      applyInstruction({
        ...instructionPreview,
        targetIds: {
          ...instructionPreview.targetIds,
          weeklyPlanId: plan?.id ?? instructionPreview.targetIds?.weeklyPlanId
        }
      });
      setInstructionPreview(null);
      setFeedbackText('');
    }
  };

  const renderMeal = (day: PlanDay, meal: PlanMeal) => (
    <div className="meal-card" key={meal.id}>
      <div className="meal-header">
        <div>
          <strong>{meal.recipeName}</strong>
          <span className="meal-meta">
            {meal.mealType} · {meal.kcal?.toFixed(0) ?? 0} kcal · £
            {meal.estimatedCost?.toFixed(2) ?? '0.00'}
          </span>
        </div>
        <button onClick={() => handleRegenerateMeal(day, meal)}>Regenerate meal</button>
      </div>
      <ul className="ingredient-list">
        {meal.ingredients.map((ingredient) => (
          <li key={ingredient.id}>
            <span>
              {ingredient.name} – {ingredient.quantity} {ingredient.quantityUnit}
            </span>
            <div className="ingredient-actions">
              <button onClick={() => handleRemoveIngredient(meal, ingredient.name)}>
                Remove
              </button>
              <button onClick={() => handleSwapIngredient(meal, ingredient.name)}>
                Swap
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );

  return (
    <div className="app-shell">
      <header>
        <div>
          <h1>AI Meal Coach</h1>
          <p>UK weekly plan with budget + dietary controls</p>
        </div>
        <div className="header-actions">
          <button disabled={loading || !user} onClick={generateWeek}>
            Generate my week
          </button>
          <button disabled={loading || !plan} onClick={() => plan && applyInstruction({
            targetLevel: 'week',
            targetIds: { weeklyPlanId: plan.id },
            action: 'regenerate_week'
          })}>
            Regenerate week
          </button>
        </div>
      </header>

      {error && <div className="alert error">Error: {error}</div>}
      {validationIssues.length > 0 && (
        <div className="alert warning">
          <strong>Validation</strong>
          <ul>
            {validationIssues.map((issue) => (
              <li key={issue}>{issue}</li>
            ))}
          </ul>
        </div>
      )}

      <section className="grid two-column">
        <div className="panel">
          <h2>Body & Budget</h2>
          {!profileDraft && <p>Loading profile…</p>}
          {profileDraft && (
            <div className="form-grid">
              <label>
                Age
                <input
                  type="number"
                  value={profileDraft.age ?? ''}
                  onChange={(event) => handleProfileChange('age', Number(event.target.value))}
                />
              </label>
              <label>
                Height (cm)
                <input
                  type="number"
                  value={profileDraft.heightCm ?? ''}
                  onChange={(event) =>
                    handleProfileChange('heightCm', Number(event.target.value))
                  }
                />
              </label>
              <label>
                Weight (kg)
                <input
                  type="number"
                  value={profileDraft.weightKg ?? ''}
                  onChange={(event) =>
                    handleProfileChange('weightKg', Number(event.target.value))
                  }
                />
              </label>
              <label>
                Weekly budget (£)
                <input
                  type="number"
                  value={profileDraft.weeklyBudgetGbp ?? ''}
                  onChange={(event) =>
                    handleProfileChange('weeklyBudgetGbp', Number(event.target.value))
                  }
                />
              </label>
              <label>
                Activity
                <select
                  value={profileDraft.activityLevel}
                  onChange={(event) =>
                    handleProfileChange('activityLevel', event.target.value as UserProfile['activityLevel'])
                  }
                >
                  <option value="sedentary">Sedentary</option>
                  <option value="light">Light</option>
                  <option value="moderate">Moderate</option>
                  <option value="active">Active</option>
                </select>
              </label>
              <label>
                Diet
                <select
                  value={profileDraft.dietType}
                  onChange={(event) =>
                    handleProfileChange('dietType', event.target.value as UserProfile['dietType'])
                  }
                >
                  <option value="none">None</option>
                  <option value="halal">Halal</option>
                  <option value="vegan">Vegan</option>
                  <option value="vegetarian">Vegetarian</option>
                  <option value="keto">Keto</option>
                  <option value="gluten_free">Gluten free</option>
                  <option value="lactose_free">Lactose free</option>
                </select>
              </label>
              <label>
                Difficulty
                <select
                  value={profileDraft.recipeDifficulty}
                  onChange={(event) =>
                    handleProfileChange(
                      'recipeDifficulty',
                      event.target.value as UserProfile['recipeDifficulty']
                    )
                  }
                >
                  <option value="super_easy">Super easy</option>
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </label>
              <label>
                Portion mode
                <select
                  value={profileDraft.portionMode}
                  onChange={(event) =>
                    handleProfileChange('portionMode', event.target.value as UserProfile['portionMode'])
                  }
                >
                  <option value="cutting">Cutting</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="bulking">Bulking</option>
                </select>
              </label>
              <div className="toggle-grid">
                {(['enableBreakfast', 'enableSnacks', 'enableLunch', 'enableDinner'] as const).map(
                  (field) => (
                    <label key={field} className="checkbox">
                      <input
                        type="checkbox"
                        checked={Boolean(profileDraft[field])}
                        onChange={(event) => handleProfileChange(field, event.target.checked as never)}
                      />
                      {field.replace('enable', '')}
                    </label>
                  )
                )}
              </div>
              <div className="form-actions">
                <button disabled={loading} onClick={onSaveProfile}>
                  Save Profile
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="panel">
          <h2>Preferences</h2>
          {!preferencesDraft && <p>Loading preferences…</p>}
          {preferencesDraft && (
            <div className="form-grid">
              {(
                [
                  { key: 'ingredientsPreferred', label: 'Preferred ingredients' },
                  { key: 'mustHaveIngredients', label: 'Must-have ingredients' },
                  { key: 'ingredientsAvoid', label: 'Avoid ingredients' },
                  { key: 'recipesPreferred', label: 'Preferred recipes' },
                  { key: 'cuisinesLiked', label: 'Liked cuisines' },
                  { key: 'cuisinesDisliked', label: 'Disliked cuisines' }
                ] as const
              ).map((field) => (
                <label key={field.key}>
                  {field.label}
                  <input
                    type="text"
                    value={arrayToText(preferencesDraft[field.key])}
                    placeholder="Comma separated"
                    onChange={(event) => handlePreferenceChange(field.key, event.target.value)}
                  />
                </label>
              ))}
              <div className="form-actions">
                <button disabled={loading} onClick={onSavePreferences}>
                  Save Preferences
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Weekly plan</h2>
            {planSummary && (
              <p>
                Total cost £{planSummary.totalCost} · {planSummary.totalKcal} kcal
              </p>
            )}
          </div>
          {plan && (
            <button
              onClick={() =>
                applyInstruction({
                  targetLevel: 'week',
                  targetIds: { weeklyPlanId: plan.id },
                  action: 'regenerate_week',
                  params: { makeCheaper: true }
                })
              }
            >
              Make cheaper week
            </button>
          )}
        </div>

        {!plan && <p>No plan generated yet.</p>}
        {plan && (
          <div className="day-grid">
            {plan.days.map((day) => (
              <div className="day-card" key={day.id}>
                <div className="day-header">
                  <div>
                    <strong>{getDayLabel(day)}</strong>
                    <p>
                      £{day.dailyEstimatedCost?.toFixed(2) ?? '0.00'} ·{' '}
                      {day.dailyKcal?.toFixed(0) ?? 0} kcal
                    </p>
                  </div>
                  <button onClick={() => handleRegenerateDay(day)}>Regenerate day</button>
                </div>
                {day.meals.map((meal) => renderMeal(day, meal))}
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="grid two-column">
        <div className="panel">
          <h2>Shopping list</h2>
          {!shoppingList && <p>Generate a plan to see your grocery list.</p>}
          {shoppingList && (
            <>
              <p>Total estimated spend £{shoppingList.totalEstimatedCost?.toFixed(2)}</p>
              <ul className="shopping-list">
                {shoppingList.items.map((item) => (
                  <li key={item.id}>
                    <span>
                      {item.name} – {item.requiredQuantity} {item.quantityUnit}
                    </span>
                    <span>£{item.estimatedCost?.toFixed(2) ?? '—'}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
        <div className="panel">
          <h2>Coach feedback</h2>
          <textarea
            rows={4}
            value={feedbackText}
            placeholder="E.g. make Tuesday cheaper, remove mayo…"
            onChange={(event) => setFeedbackText(event.target.value)}
          />
          <div className="form-actions">
            <button disabled={!feedbackText} onClick={onInterpretFeedback}>
              Interpret feedback
            </button>
            <button disabled={!instructionPreview} onClick={onApplyPreview}>
              Apply interpreted instruction
            </button>
          </div>
          {instructionPreview && (
            <pre className="instruction-preview">
              {JSON.stringify(instructionPreview, null, 2)}
            </pre>
          )}
          {lastInstruction && !instructionPreview && (
            <p className="last-instruction">
              Last applied instruction: <code>{lastInstruction.action}</code>
            </p>
          )}
        </div>
      </section>

      {loading && <div className="loading-overlay">Thinking…</div>}
    </div>
  );
}

export default App;
