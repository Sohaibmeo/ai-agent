import { useMemo, useState } from 'react';
import { Card } from '../components/shared/Card';
import { useActivePlan } from '../hooks/usePlan';
import { DEMO_USER_ID } from '../lib/config';
import { SwapDialog } from '../components/plans/SwapDialog';
import { setMealRecipe, fetchActivePlan } from '../api/plans';
import { useQueryClient } from '@tanstack/react-query';

const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export function PlansPage() {
  const queryClient = useQueryClient();
  const { data: plan, isLoading, generatePlan, isGenerating } = useActivePlan(DEMO_USER_ID);
  const days = useMemo(() => plan?.days || [], [plan]);
  const [swapMealId, setSwapMealId] = useState<string | null>(null);
  const [swapMealSlot, setSwapMealSlot] = useState<string | undefined>(undefined);

  const formatCurrency = (val?: number | null) => (val || val === 0 ? `£${Number(val).toFixed(2)}` : '—');
  const formatKcal = (val?: number | null) => (val || val === 0 ? `${Math.round(Number(val))} kcal` : '—');

  const openSwap = (mealId: string, slot?: string) => {
    setSwapMealId(mealId);
    setSwapMealSlot(slot);
  };

  const closeSwap = () => {
    setSwapMealId(null);
    setSwapMealSlot(undefined);
  };

  const handleSwapSelect = async (recipeId: string) => {
    if (!swapMealId) return;
    await setMealRecipe({ planMealId: swapMealId, newRecipeId: recipeId });
    closeSwap();
    // Refresh active plan without regenerating
    queryClient.invalidateQueries({ queryKey: ['plan', 'active', DEMO_USER_ID] });
    await queryClient.fetchQuery({
      queryKey: ['plan', 'active', DEMO_USER_ID],
      queryFn: () => fetchActivePlan(DEMO_USER_ID),
    });
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Plans</h1>
          <p className="text-sm text-slate-600">Generate and manage this week&apos;s meals.</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100">
            Advanced Settings
          </button>
          <button
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
            disabled={isGenerating}
            onClick={() => generatePlan({ useAgent: false })}
          >
            {isGenerating ? 'Generating...' : 'Generate New Week'}
          </button>
        </div>
      </div>

      <Card>
        <div className="flex flex-wrap items-center gap-6 text-sm text-slate-700">
          <div>
            <div className="text-xs uppercase text-slate-500">Week start</div>
            <div className="font-semibold text-slate-900">{plan?.week_start_date || '—'}</div>
          </div>
          <div>
            <div className="text-xs uppercase text-slate-500">Total kcal</div>
            <div className="font-semibold text-slate-900">{formatKcal(plan?.total_kcal)}</div>
          </div>
          <div>
            <div className="text-xs uppercase text-slate-500">Est. cost</div>
            <div className="font-semibold text-slate-900">{formatCurrency(plan?.total_estimated_cost_gbp)}</div>
          </div>
          <div>
            <div className="text-xs uppercase text-slate-500">Plan status</div>
            <div className="inline-flex items-center rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
              {plan?.status || '—'}
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4">
        {isLoading && <div className="text-sm text-slate-500">Loading plan...</div>}
        {!isLoading &&
          days.map((day) => (
            <Card key={day.id}>
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-900">
                  {dayNames[day.day_index] || `Day ${day.day_index + 1}`}
                </h2>
                <span className="text-xs text-slate-500">
                  {formatKcal(day.daily_kcal)} · {formatCurrency(day.daily_cost_gbp)}
                </span>
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                {day.meals.map((meal) => (
                  <article key={meal.id} className="rounded-lg border border-slate-200 p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold uppercase text-slate-500">{meal.meal_slot}</span>
                      <span className="text-[10px] rounded bg-slate-100 px-2 py-1 text-slate-600">
                        {meal.recipe?.meal_type || 'solid'}
                      </span>
                    </div>
                    <div className="mt-2 text-sm font-semibold text-slate-900">{meal.recipe?.name || '—'}</div>
                    <div className="mt-1 text-xs text-slate-600">
                      {meal.meal_kcal ? `${Math.round(Number(meal.meal_kcal))} kcal` : '—'} ·{' '}
                      {formatCurrency(meal.meal_cost_gbp)}
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      <button
                        className="rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-700 hover:bg-slate-100"
                        onClick={() => openSwap(meal.id, meal.meal_slot)}
                      >
                        Swap
                      </button>
                      <button className="rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-700 hover:bg-slate-100">
                        Edit
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </Card>
          ))}
      </div>
      <SwapDialog open={Boolean(swapMealId)} mealSlot={swapMealSlot} onClose={closeSwap} onSelect={handleSwapSelect} />
    </div>
  );
}
