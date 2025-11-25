import { useMemo, useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card } from '../components/shared/Card';
import { useActivePlan } from '../hooks/usePlan';
import { DEMO_USER_ID } from '../lib/config';
import { IngredientSwapModal } from '../components/recipes/IngredientSwapModal';
import { notify } from '../lib/toast';
import { saveCustomRecipe, aiAdjustMeal } from '../api/plans';
import { fetchIngredients } from '../api/ingredients';
import { fetchRecipeById } from '../api/recipes';
import type { Ingredient, Recipe, RecipeWithIngredients } from '../api/types';

type IngredientRow = {
  id: string; // recipe_ingredient id
  ingredientId: string;
  name: string;
  amount: number;
  unit: string;
};

const toIngredientRows = (ris: any[] | undefined): IngredientRow[] =>
  (ris || []).map((ri) => ({
    id: ri.id || ri.ingredient?.id,
    ingredientId: ri.ingredient?.id,
    name: ri.ingredient?.name || 'Ingredient',
    amount: Number(ri.quantity || 0),
    unit: ri.unit || 'g',
  }));

export function RecipeDetailPage() {
  const { mealId } = useParams<{ mealId: string }>();
  const navigate = useNavigate();
  const { data: plan, isLoading } = useActivePlan(DEMO_USER_ID);
  const [aiNote, setAiNote] = useState('');
  const [ingredients, setIngredients] = useState<IngredientRow[]>([]);
  const [initialIngredients, setInitialIngredients] = useState<IngredientRow[]>([]);
  const [swapTarget, setSwapTarget] = useState<IngredientRow | null>(null);
  const [dirty, setDirty] = useState(false);
  const [addMode, setAddMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const { data: allIngredients } = useQuery<Ingredient[]>({
    queryKey: ['ingredients'],
    queryFn: fetchIngredients,
  });

  const meal = useMemo(() => {
    if (!plan || !mealId) return undefined;
    for (const day of plan.days || []) {
      const found = day.meals.find((m) => m.id === mealId);
      if (found) return { meal: found, day };
    }
    return undefined;
  }, [plan, mealId]);

  const recipeId = meal?.meal.recipe?.id;
  const { data: recipeDetail } = useQuery<RecipeWithIngredients>({
    queryKey: ['recipe', recipeId],
    queryFn: () => fetchRecipeById(recipeId as string),
    enabled: Boolean(recipeId),
  });

  const m = meal?.meal;
  const [localRecipe, setLocalRecipe] = useState<RecipeWithIngredients | null>(null);
  const recipe = localRecipe || recipeDetail || m?.recipe;
  const recipeIngredients = recipe?.ingredients || [];

  useEffect(() => {
    if (recipeIngredients.length) {
      const rows = toIngredientRows(recipeIngredients);
      setIngredients(rows);
      setInitialIngredients(rows);
    }
  }, [recipeIngredients]);

  const fmt = (val?: number | null, suffix = '') => (val || val === 0 ? `${Math.round(Number(val))}${suffix}` : '—');
  const macrosLine = recipe
    ? `P: ${fmt(m?.meal_protein ?? recipe.base_protein, 'g')} · C: ${fmt(m?.meal_carbs ?? recipe.base_carbs, 'g')} · F: ${fmt(m?.meal_fat ?? recipe.base_fat, 'g')}`
    : 'P: — · C: — · F: —';

  const markDirty = (nextIngredients: IngredientRow[], nextNote: string) => {
    setDirty(
      JSON.stringify(nextIngredients) !== JSON.stringify(initialIngredients) ||
        nextNote.trim().length > 0,
    );
  };

  const handleAmountChange = (id: string, value: number) => {
    setIngredients((prev) => {
      const next = prev.map((ing) => (ing.id === id ? { ...ing, amount: value } : ing));
      markDirty(next, aiNote);
      return next;
    });
  };

  const handleSwap = (replacement: Ingredient, amountFromModal: number, unitFromModal: string) => {
    if (!swapTarget) return;
    const payload = {
      id: addMode ? `${replacement.id}-${Date.now()}` : swapTarget.id,
      ingredientId: replacement.id,
      name: replacement.name,
      amount: amountFromModal || swapTarget.amount,
      unit: unitFromModal || swapTarget.unit,
    };
    if (addMode) {
      setIngredients((prev) => {
        const next = [...prev, payload];
        markDirty(next, aiNote);
        return next;
      });
    } else {
      setIngredients((prev) => {
        const next = prev.map((ing) => (ing.id === swapTarget.id ? payload : ing));
        markDirty(next, aiNote);
        return next;
      });
    }
    setSwapTarget(null);
    setAddMode(false);
    setDirty(true);
    notify.success(addMode ? 'Ingredient added' : 'Ingredient swapped');
  };

  const handleSave = async () => {
    if (!m?.id || !recipe?.id) return;
    const missingId = ingredients.find((ing) => !ing.ingredientId);
    if (missingId) {
      notify.error('One or more ingredients are missing an ID; please pick from the list.');
      return;
    }
    try {
      setIsSaving(true);
      await saveCustomRecipe({
        planMealId: m.id,
        newName: recipe.name,
        ingredientItems: ingredients.map((ing) => ({
          ingredientId: ing.ingredientId,
          quantity: ing.amount,
          unit: ing.unit,
        })),
      });
      setInitialIngredients(ingredients);
      setDirty(false);
      notify.success('Recipe saved');
    } catch (e) {
      notify.error('Could not save recipe');
    } finally {
      setIsSaving(false);
    }
  };

  const handleApplyAI = async () => {
    if (!m?.id) return;
    if (!aiNote.trim()) {
      notify.error('Please describe what you want changed.');
      return;
    }
    try {
      setIsApplying(true);
      const updated: any = await aiAdjustMeal(m.id, DEMO_USER_ID, aiNote);
      if (updated?.recipe?.ingredients) {
        const rows = toIngredientRows(updated.recipe.ingredients);
        setIngredients(rows);
        setInitialIngredients(rows);
      }
      if (updated?.recipe) {
        setLocalRecipe(updated.recipe);
      }
      setDirty(false);
      notify.success('AI applied changes');
    } catch (e) {
      notify.error('Could not apply AI changes');
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div className="min-h-screen p-6 space-y-4">
      <button className="text-sm text-emerald-700 hover:underline" onClick={() => navigate(-1)}>
        ← Back to plans
      </button>

      <div className="flex flex-wrap items-center gap-3">
        <div>
          <div className="text-xs uppercase text-slate-500">
            {meal?.day ? `Plans / ${meal.day.day_index + 1}` : 'Plan meal'}
          </div>
          <h1 className="text-2xl font-semibold text-slate-900">{recipe?.name || 'Recipe'}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded bg-slate-100 px-2 py-1 text-slate-600">{m?.meal_slot || '—'}</span>
          <span className="rounded bg-slate-100 px-2 py-1 text-slate-600">{recipe?.meal_type || 'solid'}</span>
          <span className="rounded bg-slate-100 px-2 py-1 text-slate-600">{fmt(recipe?.base_kcal ?? m?.meal_kcal, ' kcal')}</span>
          <span className="rounded bg-amber-50 px-2 py-1 font-semibold text-amber-700">{m ? `£${fmt(m.meal_cost_gbp, '')}` : '£—'}</span>
        </div>
      </div>

      <Card title="Adjust this recipe with AI">
        <div className="text-xs text-slate-600 mb-2">What would you like changed?</div>
        <textarea
          className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-300 min-h-[140px] max-h-[280px] resize-y overflow-auto"
          rows={4}
          placeholder="Make it lower calories; swap chicken for a halal alternative; remove dairy..."
          value={aiNote}
          onChange={(e) => {
            const next = e.target.value;
            setAiNote(next);
            markDirty(ingredients, next);
          }}
        />
        <div className="mt-1 text-[11px] text-slate-500">AI will use this along with your profile defaults.</div>
        <div className="mt-3 flex justify-end gap-2">
          <button
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
            onClick={() => {
              setAiNote('');
              setIngredients(initialIngredients);
              setDirty(false);
            }}
          >
            Cancel
          </button>
          <button
            className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-50"
            onClick={handleApplyAI}
            disabled={isApplying}
          >
            {isApplying ? 'Applying...' : 'Apply changes'}
          </button>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card
          title="Ingredients"
          subtitle={macrosLine}
              action={
                <button
                  className="flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                  onClick={() => {
                    setSwapTarget({ id: 'new', ingredientId: '', name: '', amount: 100, unit: 'g' });
                    setAddMode(true);
                  }}
                >
                  <span className="text-lg leading-none">＋</span> Add
                </button>
          }
        >
          <ul className="space-y-2 text-sm text-slate-800">
            {ingredients.map((ing) => (
              <li
                key={ing.id}
                className="flex items-center justify-between gap-3 rounded-xl px-4 py-3 bg-white hover:bg-slate-50 transition"
                onClick={() => setSwapTarget(ing)}
              >
                <div className="flex-1">
                  <div className="font-medium text-slate-900">{ing.name}</div>
                  <div className="text-[11px] text-slate-500">Click to replace</div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    step="0.5"
                    value={ing.amount}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => handleAmountChange(ing.id, Number(e.target.value))}
                    className="w-20 rounded-lg border border-slate-200 px-2 py-1 text-right text-sm text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-200"
                  />
                  <span className="text-slate-500 whitespace-nowrap">{ing.unit}</span>
                  <button
                    className="text-red-500 text-lg px-2"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIngredients((prev) => {
                      const next = prev.filter((row) => row.id !== ing.id);
                      markDirty(next, aiNote);
                      return next;
                    });
                    notify.success('Ingredient removed');
                  }}
                  title="Remove ingredient"
                >
                    🗑
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </Card>
        <Card title="Method">
          <ol className="list-decimal space-y-2 pl-4 text-sm text-slate-800">
            {recipe?.instructions
              ? recipe.instructions
                  .split('\n')
                  .filter((line) => line.trim().length)
                  .map((line, idx) => <li key={idx}>{line}</li>)
              : [<li key="placeholder" className="text-xs text-slate-500">No instructions provided.</li>]}
          </ol>
        </Card>
      </div>

      {isLoading && <div className="text-sm text-slate-500">Loading meal details...</div>}
      {!isLoading && !meal && <div className="text-sm text-slate-500">Meal not found in the active plan.</div>}

      {dirty && (
        <div className="sticky bottom-4 left-0 right-0 flex justify-end">
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-lg">
            <span className="text-sm text-slate-600">You have unsaved changes</span>
            <button
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
              onClick={() => {
                setIngredients(initialIngredients);
                setDirty(aiNote.trim().length > 0);
              }}
            >
              Reset
            </button>
            <button
              className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800"
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? 'Saving...' : 'Save recipe'}
            </button>
          </div>
        </div>
      )}

      <IngredientSwapModal
        open={Boolean(swapTarget)}
        currentName={swapTarget?.name || ''}
        currentIngredientId={swapTarget?.ingredientId}
        currentAmount={`${swapTarget?.amount || ''} ${swapTarget?.unit || ''}`}
        currentUnit={swapTarget?.unit || 'g'}
        suggestions={[...(allIngredients || [])].map((i) => i.name)}
        onSelect={handleSwap}
        onClose={() => {
          setSwapTarget(null);
          setAddMode(false);
          notify.info('No ingredient selected');
        }}
        mode={addMode ? 'add' : 'replace'}
      />
    </div>
  );
}
