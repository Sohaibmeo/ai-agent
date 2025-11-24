import { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card } from '../components/shared/Card';
import { useActivePlan } from '../hooks/usePlan';
import { DEMO_USER_ID } from '../lib/config';
import { IngredientSwapModal } from '../components/recipes/IngredientSwapModal';

type IngredientRow = {
  id: string;
  name: string;
  amount: number;
  unit: string;
};

const defaultIngredients: IngredientRow[] = [
  { id: 'ing-1', name: 'Chicken breast', amount: 200, unit: 'g' },
  { id: 'ing-2', name: 'Romaine lettuce', amount: 150, unit: 'g' },
  { id: 'ing-3', name: 'Parmesan cheese', amount: 30, unit: 'g' },
  { id: 'ing-4', name: 'Caesar dressing', amount: 2, unit: 'tbsp' },
  { id: 'ing-5', name: 'Croutons', amount: 25, unit: 'g' },
  { id: 'ing-6', name: 'Olive oil', amount: 1, unit: 'tbsp' },
  { id: 'ing-7', name: 'Lemon juice', amount: 1, unit: 'tsp' },
  { id: 'ing-8', name: 'Black pepper', amount: 1, unit: 'pinch' },
];

export function RecipeDetailPage() {
  const { mealId } = useParams<{ mealId: string }>();
  const navigate = useNavigate();
  const { data: plan, isLoading } = useActivePlan(DEMO_USER_ID);
  const [aiNote, setAiNote] = useState('');
  const [ingredients, setIngredients] = useState<IngredientRow[]>(defaultIngredients);
  const [swapTarget, setSwapTarget] = useState<IngredientRow | null>(null);
  const [dirty, setDirty] = useState(false);
  const [addMode, setAddMode] = useState(false);

  const meal = useMemo(() => {
    if (!plan || !mealId) return undefined;
    for (const day of plan.days || []) {
      const found = day.meals.find((m) => m.id === mealId);
      if (found) return { meal: found, day };
    }
    return undefined;
  }, [plan, mealId]);

  const m = meal?.meal;
  const recipe = m?.recipe;

  const fmt = (val?: number | null, suffix = '') => (val || val === 0 ? `${Math.round(Number(val))}${suffix}` : '—');
  const macrosLine = recipe
    ? `P: ${fmt(m?.meal_protein ?? recipe.base_protein, 'g')} · C: ${fmt(m?.meal_carbs ?? recipe.base_carbs, 'g')} · F: ${fmt(m?.meal_fat ?? recipe.base_fat, 'g')}`
    : 'P: — · C: — · F: —';

  const handleAmountChange = (id: string, value: number) => {
    setIngredients((prev) => prev.map((ing) => (ing.id === id ? { ...ing, amount: value } : ing)));
    setDirty(true);
  };

  const handleSwap = (replacementName: string, amountFromModal: number) => {
    if (!swapTarget) return;
    if (addMode) {
      setIngredients((prev) => [...prev, { id: `ing-${Date.now()}`, name: replacementName, amount: amountFromModal || 100, unit: 'g' }]);
    } else {
      setIngredients((prev) =>
        prev.map((ing) => (ing.id === swapTarget.id ? { ...ing, name: replacementName, amount: amountFromModal || ing.amount } : ing)),
      );
    }
    setSwapTarget(null);
    setAddMode(false);
    setDirty(true);
  };

  const handleSave = () => {
    // Hook up to backend when recipe update endpoint is ready
    setDirty(false);
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
            setAiNote(e.target.value);
            setDirty(true);
          }}
        />
        <div className="mt-1 text-[11px] text-slate-500">AI will use this along with your profile defaults.</div>
        <div className="mt-3 flex justify-end gap-2">
          <button
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
            onClick={() => {
              setAiNote('');
              const hasIngredientChanges =
                JSON.stringify(ingredients) !== JSON.stringify(defaultIngredients);
              setDirty(hasIngredientChanges);
            }}
          >
            Cancel
          </button>
          <button className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800">
            Apply changes
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
                setSwapTarget({ id: 'new', name: '', amount: 100, unit: 'g' });
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
                      setIngredients((prev) => prev.filter((row) => row.id !== ing.id));
                      setDirty(true);
                    }}
                    title="Remove ingredient"
                  >
                    🗑
                  </button>
                </div>
              </li>
            ))}
            <li className="text-xs text-slate-500">Ingredient details would be loaded from the recipe API.</li>
          </ul>
        </Card>
        <Card title="Method">
          <ol className="list-decimal space-y-2 pl-4 text-sm text-slate-800">
            <li>Season and cook the protein as desired.</li>
            <li>Prepare and chop vegetables, combine in a bowl.</li>
            <li>Serve with dressing or sides; adjust seasoning to taste.</li>
            <li className="text-xs text-slate-500">Method steps would be loaded from the recipe instructions.</li>
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
                setIngredients(defaultIngredients);
                setDirty(aiNote.trim().length > 0);
              }}
            >
              Reset
            </button>
            <button
              className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800"
              onClick={handleSave}
            >
              Save recipe
            </button>
          </div>
        </div>
      )}

      <IngredientSwapModal
        open={Boolean(swapTarget)}
        currentName={swapTarget?.name || ''}
        currentAmount={`${swapTarget?.amount || ''} ${swapTarget?.unit || ''}`}
        suggestions={[...new Set([...defaultIngredients.map((i) => i.name), ...ingredients.map((i) => i.name)])]}
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
