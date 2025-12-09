import { useMemo, useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card } from '../components/shared/Card';
import { useActivePlan } from '../hooks/usePlan';
import { IngredientSwapModal } from '../components/recipes/IngredientSwapModal';
import { notify } from '../lib/toast';
import { saveCustomRecipe, aiPlanSwap } from '../api/plans';
import { fetchIngredients } from '../api/ingredients';
import { fetchRecipeById, updateRecipe, adjustRecipeAi, createRecipe } from '../api/recipes';
import type { Ingredient, RecipeWithIngredients } from '../api/types';
import { useLlmAction } from '../hooks/useLlmAction';
import { useAuth } from '../context/AuthContext';

type IngredientRow = {
  id: string; // recipe_ingredient id
  ingredientId: string;
  name: string;
  amount: number;
  unit: string;
  unitType?: string | null;
  kcalPerUnit?: number | null;
  proteinPerUnit?: number | null;
  carbsPerUnit?: number | null;
  fatPerUnit?: number | null;
  pricePerUnit?: number | null;
};

const toIngredientRows = (ris: any[] | undefined): IngredientRow[] =>
  (ris || []).map((ri) => ({
    id: ri.id || ri.ingredient?.id,
    ingredientId: ri.ingredient?.id,
    name: ri.ingredient?.name || 'Ingredient',
    amount: Number(ri.quantity || 0),
    unit: ri.unit || 'g',
    unitType: ri.ingredient?.unit_type,
    kcalPerUnit: ri.ingredient?.kcal_per_unit,
    proteinPerUnit: ri.ingredient?.protein_per_unit,
    carbsPerUnit: ri.ingredient?.carbs_per_unit,
    fatPerUnit: ri.ingredient?.fat_per_unit,
    pricePerUnit: ri.ingredient?.estimated_price_per_unit_gbp,
  }));

export function RecipeDetailPage() {
  const { mealId, recipeId: recipeIdParam } = useParams<{ mealId?: string; recipeId?: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data: plan, isLoading } = useActivePlan();
  const { runWithLlmLoader } = useLlmAction({
    kind: 'adjust-recipe',
    title: 'Adjusting your recipe with AI...',
    subtitle: 'We will tweak ingredients while keeping macros and budget in mind.',
  });
  const [aiNote, setAiNote] = useState('');
  const [recipeName, setRecipeName] = useState('');
  const [initialRecipeName, setInitialRecipeName] = useState('');
  const [instructionsText, setInstructionsText] = useState('');
  const [initialInstructions, setInitialInstructions] = useState('');
  const [ingredients, setIngredients] = useState<IngredientRow[]>([]);
  const [initialIngredients, setInitialIngredients] = useState<IngredientRow[]>([]);
  const [swapTarget, setSwapTarget] = useState<IngredientRow | null>(null);
  const [dirty, setDirty] = useState(false);
  const [addMode, setAddMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [isEditingInstructions, setIsEditingInstructions] = useState(false);
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

  const recipeId = recipeIdParam || meal?.meal.recipe?.id;
  const isCreateMode = !mealId && !recipeIdParam;
  const { data: recipeDetail } = useQuery<RecipeWithIngredients>({
    queryKey: ['recipe', recipeId],
    queryFn: () => fetchRecipeById(recipeId as string),
    enabled: Boolean(recipeId),
  });

  const m = meal?.meal;
  const recipe = recipeDetail || m?.recipe;
  const recipeIngredients = recipe?.ingredients || [];

  useEffect(() => {
    if (recipeIngredients.length) {
      const rows = toIngredientRows(recipeIngredients);
      setIngredients(rows);
      setInitialIngredients(rows);
      setDirty(false);
    }
  }, [recipeIngredients]);

  useEffect(() => {
    if (!recipe) return;
    const nextName = recipe.name || '';
    const nextInstructions = recipe.instructions || '';
    setRecipeName(nextName);
    setInitialRecipeName(nextName);
    setInstructionsText(nextInstructions);
    setInitialInstructions(nextInstructions);
    setIsEditingName(false);
    setIsEditingInstructions(false);
    setDirty(false);
  }, [recipe?.id]);

  useEffect(() => {
    if (isCreateMode) {
      setRecipeName('New recipe');
      setInitialRecipeName('New recipe');
      setInstructionsText('');
      setInitialInstructions('');
      setIngredients([]);
      setInitialIngredients([]);
      setAiNote('');
      setDirty(false);
      setIsEditingName(true);
    }
  }, [isCreateMode]);

  const fmt = (val?: number | null, suffix = '') => (val || val === 0 ? `${Math.round(Number(val))}${suffix}` : '—');
  const fmtCost = (val?: number | null) => (val || val === 0 ? `£${Number(val).toFixed(2)}` : '—');
  const ingredientTotals = (ing: IngredientRow) => {
    const baseUnit = (ing.unitType || '').toLowerCase();
    const divisor = baseUnit === 'per_ml' ? 100 : baseUnit === 'per_100g' ? 100 : 100;
    const factor = ing.amount / divisor;
    const kcal = (Number(ing.kcalPerUnit) || 0) * factor;
    const protein = (Number(ing.proteinPerUnit) || 0) * factor;
    const carbs = (Number(ing.carbsPerUnit) || 0) * factor;
    const fat = (Number(ing.fatPerUnit) || 0) * factor;
    const cost = (Number(ing.pricePerUnit) || 0) * factor;
    return { kcal, protein, carbs, fat, cost };
  };
  const macrosLine = recipe
    ? `P: ${fmt(m?.meal_protein ?? recipe.base_protein, 'g')} · C: ${fmt(m?.meal_carbs ?? recipe.base_carbs, 'g')} · F: ${fmt(m?.meal_fat ?? recipe.base_fat, 'g')}`
    : 'P: — · C: — · F: —';

  const markDirty = (
    nextIngredients: IngredientRow[] = ingredients,
    nextName = recipeName,
    nextInstructions = instructionsText,
  ) => {
    setDirty(
      JSON.stringify(nextIngredients) !== JSON.stringify(initialIngredients) ||
        nextName.trim() !== initialRecipeName.trim() ||
        (nextInstructions || '').trim() !== (initialInstructions || '').trim(),
    );
  };

  const handleAmountChange = (id: string, value: number) => {
    setIngredients((prev) => {
      const next = prev.map((ing) => (ing.id === id ? { ...ing, amount: value } : ing));
      markDirty(next);
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
      unitType: replacement.unit_type,
      kcalPerUnit: replacement.kcal_per_unit,
      proteinPerUnit: replacement.protein_per_unit,
      carbsPerUnit: replacement.carbs_per_unit,
      fatPerUnit: replacement.fat_per_unit,
      pricePerUnit: replacement.estimated_price_per_unit_gbp,
    };
    if (addMode) {
      setIngredients((prev) => {
        const next = [...prev, payload];
        markDirty(next);
        return next;
      });
    } else {
      setIngredients((prev) => {
        const next = prev.map((ing) => (ing.id === swapTarget.id ? payload : ing));
        markDirty(next);
        return next;
      });
    }
    setSwapTarget(null);
    setAddMode(false);
    setDirty(true);
    notify.success(addMode ? 'Ingredient added' : 'Ingredient swapped');
  };

  const handleSave = async () => {
    if (!m?.id && !recipeId) return;
    const missingId = ingredients.find((ing) => !ing.ingredientId);
    if (missingId) {
      notify.error('One or more ingredients are missing an ID; please pick from the list.');
      return;
    }
    try {
      setIsSaving(true);
      const nameToSave = (recipeName || recipe?.name || 'Recipe').trim() || 'Recipe';
      if (m?.id) {
        await saveCustomRecipe({
          planMealId: m.id,
          newName: nameToSave,
          ingredientItems: ingredients.map((ing) => ({
            ingredientId: ing.ingredientId,
            quantity: ing.amount,
            unit: ing.unit,
          })),
          instructions: instructionsText,
        });
        setInitialIngredients(ingredients);
        setInitialRecipeName(nameToSave);
        setInitialInstructions(instructionsText);
      } else if (recipeId) {
        const updated = await updateRecipe(recipeId, {
          name: nameToSave,
          instructions: instructionsText,
          ingredients: ingredients.map((ing) => ({
            ingredientId: ing.ingredientId,
            quantity: ing.amount,
            unit: ing.unit,
          })),
          mealSlot: recipe?.meal_slot || undefined,
          difficulty: recipe?.difficulty ?? undefined,
        });
        const updatedIngredients = toIngredientRows(updated.ingredients);
        setIngredients(updatedIngredients);
        setInitialIngredients(updatedIngredients);
        setRecipeName(updated.name || nameToSave);
        setInitialRecipeName(updated.name || nameToSave);
        setInstructionsText(updated.instructions || '');
        setInitialInstructions(updated.instructions || '');
        queryClient.invalidateQueries({ queryKey: ['recipe', recipeId] });
      }
      setIsEditingName(false);
      setIsEditingInstructions(false);
      setDirty(false);
      notify.success('Recipe saved');
    } catch (e) {
      notify.error('Could not save recipe');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreate = async () => {
    const missingId = ingredients.find((ing) => !ing.ingredientId);
    if (missingId) {
      notify.error('One or more ingredients are missing an ID; please pick from the list.');
      return;
    }
    try {
      setIsSaving(true);
      const nameToSave = recipeName.trim() || 'New recipe';
      const created = await createRecipe({
        name: nameToSave,
        instructions: instructionsText,
        ingredients: ingredients.map((ing) => ({
          ingredientId: ing.ingredientId,
          quantity: ing.amount,
          unit: ing.unit,
        })),
        mealSlot: 'meal',
        difficulty: 'easy',
      });
      notify.success('Recipe created');
      navigate(`/recipes/${created.id}`);
    } catch (e) {
      notify.error('Could not create recipe');
    } finally {
      setIsSaving(false);
    }
  };

  const handleApplyAI = async () => {
    const note = aiNote.trim() || undefined;
    try {
      setIsApplying(true);
      if (m?.id && plan?.id) {
        await runWithLlmLoader(async () => {
          const result = await aiPlanSwap({
            type: 'swap-inside-recipe',
            weeklyPlanId: plan.id,
            planMealId: m.id,
            recipeId: recipe?.id,
            note,
            context: { source: 'recipe-detail' },
          });
          notify.success('Request sent');
          return result;
        });
      } else if (recipeId) {
        const updated = await runWithLlmLoader(async () =>
          adjustRecipeAi(recipeId, { note }),
        );
        const updatedIngredients = toIngredientRows(updated.ingredients);
        setIngredients(updatedIngredients);
        setInitialIngredients(updatedIngredients);
        setRecipeName(updated.name || recipeName);
        setInitialRecipeName(updated.name || recipeName);
        setInstructionsText(updated.instructions || '');
        setInitialInstructions(updated.instructions || '');
        setDirty(false);
        queryClient.invalidateQueries({ queryKey: ['recipe', recipeId] });
        notify.success('Recipe adjusted');
      } else {
        notify.error('Missing recipe context for AI changes.');
      }
    } catch (e) {
      console.error(e);
      notify.error('Could not send request');
    } finally {
      setIsApplying(false);
    }
  };

  const handleResetChanges = () => {
    setRecipeName(initialRecipeName);
    setInstructionsText(initialInstructions);
    setIngredients(initialIngredients);
    setDirty(false);
    setIsEditingName(false);
    setIsEditingInstructions(false);
  };

  return (
    <div className="min-h-screen p-6 space-y-4">
      <button className="text-sm text-emerald-700 hover:underline" onClick={() => navigate(-1)}>
        ← Back to plans
      </button>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <div className="text-xs uppercase text-slate-500">
            {meal?.day ? `Plans / ${meal.day.day_index + 1}` : 'Recipe'}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {isEditingName ? (
              <>
                <input
                  value={recipeName}
                  onChange={(e) => {
                    const next = e.target.value;
                    setRecipeName(next);
                    markDirty(ingredients, next);
                  }}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-lg font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-200"
                />
                <button
                  className="rounded-full bg-slate-100 px-2 py-1 text-sm text-slate-700 hover:bg-slate-200"
                  title="Discard name edit"
                  onClick={() => {
                    setRecipeName(initialRecipeName);
                    setIsEditingName(false);
                    markDirty(ingredients, initialRecipeName);
                  }}
                >
                  ✕
                </button>
                <button
                  className="rounded-full bg-emerald-700 px-2 py-1 text-sm text-white hover:bg-emerald-800"
                  title="Save name edit"
                  onClick={() => {
                    const trimmed = recipeName.trim();
                    const next = trimmed || initialRecipeName;
                    setRecipeName(next);
                    setIsEditingName(false);
                    markDirty(ingredients, next);
                  }}
                >
                  ✓
                </button>
              </>
            ) : (
              <>
                <h1 className="text-2xl font-semibold text-slate-900">{recipeName || 'Recipe'}</h1>
                <button
                  className="rounded-full bg-slate-100 px-2 py-1 text-sm text-slate-700 hover:bg-slate-200"
                  title="Edit name"
                  onClick={() => setIsEditingName(true)}
                >
                  ✏️
                </button>
              </>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded bg-slate-100 px-2 py-1 text-slate-600">{m?.meal_slot || '—'}</span>
            <span className="rounded bg-slate-100 px-2 py-1 text-slate-600">{recipe?.meal_type || 'solid'}</span>
            <span className="rounded bg-slate-100 px-2 py-1 text-slate-600">{fmt(recipe?.base_kcal ?? m?.meal_kcal, ' kcal')}</span>
            <span className="rounded bg-amber-50 px-2 py-1 font-semibold text-amber-700">{`£${fmt(m?.meal_cost_gbp ?? recipe?.base_cost_gbp, '')}`}</span>
          </div>
        </div>
        {isCreateMode ? (
          <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm">
            <span className="rounded-full bg-emerald-50 px-3 py-1 font-semibold text-emerald-700">Create new recipe</span>
            <button
              className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
              onClick={() => navigate(-1)}
            >
              Cancel
            </button>
            <button
              className="rounded-lg bg-emerald-700 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
              onClick={handleCreate}
              disabled={isSaving}
            >
              {isSaving ? 'Creating...' : 'Create'}
            </button>
          </div>
        ) : (
          dirty && (
            <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm">
              <span className="rounded-full bg-amber-50 px-3 py-1 font-semibold text-amber-700">You have unsaved changes</span>
              <button
                className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                onClick={handleResetChanges}
              >
                Undo
              </button>
              <button
                className="rounded-lg bg-emerald-700 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
                onClick={handleSave}
                disabled={!(m?.id || recipeId) || isSaving}
              >
                {isSaving ? 'Saving...' : 'Save'}
              </button>
            </div>
          )
        )}
      </div>

      {!isCreateMode && (
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
            }}
          />
          <div className="mt-1 text-[11px] text-slate-500">AI will use this along with your profile defaults.</div>
          <div className="mt-3 flex justify-end gap-2">
            <button
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
              onClick={() => {
                setAiNote('');
              }}
            >
              Cancel
            </button>
            <button
              className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-50"
              onClick={handleApplyAI}
              disabled={(!m?.id && !recipeId) || isApplying}
            >
              {isApplying ? 'Applying...' : 'Apply changes'}
            </button>
          </div>
        </Card>
      )}

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
                  <div className="text-[11px] text-slate-500">
                    {(() => {
                      const totals = ingredientTotals(ing);
                      return `P: ${fmt(totals.protein, 'g')} · C: ${fmt(totals.carbs, 'g')} · F: ${fmt(
                        totals.fat,
                        'g',
                      )} · kcal: ${fmt(totals.kcal)} · Cost: ${fmtCost(totals.cost)}`;
                    })()}
                  </div>
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
                      markDirty(next);
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
        <Card
          title="Method"
          action={
            isEditingInstructions ? (
              <div className="flex items-center gap-2">
                <button
                  className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-700 hover:bg-slate-200"
                  title="Discard instructions edit"
                  onClick={() => {
                    setInstructionsText(initialInstructions);
                    setIsEditingInstructions(false);
                    markDirty(ingredients, recipeName, initialInstructions);
                  }}
                >
                  ✕
                </button>
                <button
                  className="rounded-full bg-emerald-700 px-2 py-1 text-xs font-semibold text-white hover:bg-emerald-800"
                  title="Save instructions edit"
                  onClick={() => {
                    setIsEditingInstructions(false);
                    markDirty(ingredients, recipeName, instructionsText);
                  }}
                >
                  ✓
                </button>
              </div>
            ) : (
              <button
                className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-700 hover:bg-slate-200"
                title="Edit instructions"
                onClick={() => setIsEditingInstructions(true)}
              >
                ✏️
              </button>
            )
          }
        >
          {isEditingInstructions ? (
            <textarea
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-200 min-h-[180px]"
              value={instructionsText}
              onChange={(e) => {
                const next = e.target.value;
                setInstructionsText(next);
                markDirty(ingredients, recipeName, next);
              }}
              placeholder="Add step-by-step instructions here..."
            />
          ) : (
            <ol className="list-decimal space-y-2 pl-4 text-sm text-slate-800">
              {instructionsText
                ? instructionsText
                    .split('\n')
                    .filter((line) => line.trim().length)
                    .map((line, idx) => <li key={idx}>{line}</li>)
                : [<li key="placeholder" className="text-xs text-slate-500">No instructions provided.</li>]}
            </ol>
          )}
        </Card>
      </div>

      {mealId && isLoading && <div className="text-sm text-slate-500">Loading meal details...</div>}
      {mealId && !isLoading && !meal && <div className="text-sm text-slate-500">Meal not found in the active plan.</div>}

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
        }}
        mode={addMode ? 'add' : 'replace'}
      />
    </div>
  );
}
