import { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card } from '../components/shared/Card';
import { useActivePlan } from '../hooks/usePlan';
import { DEMO_USER_ID } from '../lib/config';

export function RecipeDetailPage() {
  const { mealId } = useParams<{ mealId: string }>();
  const navigate = useNavigate();
  const { data: plan, isLoading } = useActivePlan(DEMO_USER_ID);
  const [aiNote, setAiNote] = useState('');

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
          onChange={(e) => setAiNote(e.target.value)}
        />
        <div className="mt-1 text-[11px] text-slate-500">AI will use this along with your profile defaults.</div>
        <div className="mt-3 flex justify-end gap-2">
          <button
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
            onClick={() => setAiNote('')}
          >
            Cancel
          </button>
          <button className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800">
            Apply changes
          </button>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card title="Ingredients" subtitle={macrosLine}>
          <ul className="space-y-2 text-sm text-slate-800">
            {[
              'Chicken breast • 200 g',
              'Romaine lettuce • 150 g',
              'Parmesan cheese • 30 g',
              'Caesar dressing • 2 tbsp',
              'Croutons • 25 g',
              'Olive oil • 1 tbsp',
              'Lemon juice • 1 tsp',
              'Black pepper • 1 pinch',
            ].map((row, idx) => {
              const [name, qty] = row.split('•').map((s) => s.trim());
              return (
                <li
                  key={row}
                  className="flex items-center justify-between rounded-xl px-4 py-3 bg-white hover:bg-slate-50 transition"
                >
                  <span>{name}</span>
                  <span className="text-slate-500">{qty}</span>
                </li>
              );
            })}
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
    </div>
  );
}
