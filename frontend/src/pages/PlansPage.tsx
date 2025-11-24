import { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Card } from '../components/shared/Card';
import { Skeleton } from '../components/shared/Skeleton';
import { useActivePlan } from '../hooks/usePlan';
import { DEMO_USER_ID } from '../lib/config';
import { SwapDialog } from '../components/plans/SwapDialog';
import { fetchActivePlan, setMealRecipe } from '../api/plans';

const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const pillClass = 'rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600 border border-slate-200';

export function PlansPage() {
  const queryClient = useQueryClient();
  const { data: plan, isLoading, generatePlan, isGenerating } = useActivePlan(DEMO_USER_ID);
  const days = useMemo(() => plan?.days || [], [plan]);
  const [swapMealId, setSwapMealId] = useState<string | null>(null);
  const [swapMealSlot, setSwapMealSlot] = useState<string | undefined>(undefined);
  const [note, setNote] = useState('');
  const [activeTab, setActiveTab] = useState<'current' | 'history'>('current');
  const [expandedDays, setExpandedDays] = useState<Record<string, boolean>>({});
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  const formatCurrency = (val?: number | null) => (val || val === 0 ? `£${Number(val).toFixed(2)}` : '—');
  const formatKcal = (val?: number | null) => (val || val === 0 ? `${Math.round(Number(val))} kcal` : '—');
  const formatProtein = (val?: number | null) => (val || val === 0 ? `P: ${Math.round(Number(val))}g` : 'P: —');
  const formatMacros = (meal: any) => {
    const p = meal.meal_protein ?? meal.recipe?.base_protein;
    const c = meal.meal_carbs ?? meal.recipe?.base_carbs;
    const f = meal.meal_fat ?? meal.recipe?.base_fat;
    return `P: ${p ? Math.round(Number(p)) : '—'}g  C: ${c ? Math.round(Number(c)) : '—'}g  F: ${f ? Math.round(
      Number(f),
    ) : '—'}g`;
  };

  const totalMeals = useMemo(() => days.reduce((acc, d) => acc + (d.meals?.length || 0), 0), [days]);
  const avgKcal = plan && days.length ? (plan.total_kcal ? Math.round(Number(plan.total_kcal) / days.length) : null) : null;

  const openSwap = (mealId: string, slot?: string) => {
    setSwapMealId(mealId);
    setSwapMealSlot(slot);
    setMenuOpen(null);
  };

  const closeSwap = () => {
    setSwapMealId(null);
    setSwapMealSlot(undefined);
  };

  const handleSwapSelect = async (recipeId: string) => {
    if (!swapMealId) return;
    await setMealRecipe({ planMealId: swapMealId, newRecipeId: recipeId });
    closeSwap();
    queryClient.invalidateQueries({ queryKey: ['plan', 'active', DEMO_USER_ID] });
    await queryClient.fetchQuery({
      queryKey: ['plan', 'active', DEMO_USER_ID],
      queryFn: () => fetchActivePlan(DEMO_USER_ID),
    });
  };

  const toggleDay = (id: string) => {
    setExpandedDays((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Plans</h1>
          <p className="text-sm text-slate-600">Generate and refine your week.</p>
        </div>
      </div>

      <Card>
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <button
            className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-50"
            disabled={isGenerating}
            onClick={() => generatePlan({ useAgent: false })}
          >
            {isGenerating ? 'Generating...' : 'Generate New Week'}
          </button>
          <button className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100">
            Advanced settings
          </button>
        </div>
        <div className="mt-3">
          <label className="text-xs text-slate-600">Tell the AI what to prioritize this week (optional)</label>
          <textarea
            className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-300"
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Higher protein lunches, simpler dinners; keep cost under £35; more drinkable breakfasts..."
          />
          <div className="mt-1 text-[11px] text-slate-500">AI will use this along with your profile defaults.</div>
        </div>
      </Card>

      <Card>
        <div className="flex flex-wrap items-center gap-3 text-sm text-slate-700">
          <div>
            <div className="text-xs uppercase text-slate-500">Week of</div>
            {isLoading ? <Skeleton className="mt-1 h-4 w-24" /> : <div className="font-semibold text-slate-900">{plan?.week_start_date || '—'}</div>}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {isLoading ? (
              <>
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </>
            ) : (
              <>
                <span className={pillClass}>{formatCurrency(plan?.total_estimated_cost_gbp)} total</span>
                <span className={pillClass}>{avgKcal ? `${avgKcal} kcal avg` : '—'}</span>
                <span className={pillClass}>{totalMeals} meals</span>
              </>
            )}
          </div>
        </div>
      </Card>

      <div className="flex items-center gap-6 border-b border-slate-200 text-sm">
        <button
          className={`pb-2 ${activeTab === 'current' ? 'border-b-2 border-emerald-700 font-semibold text-emerald-700' : 'text-slate-600'}`}
          onClick={() => setActiveTab('current')}
        >
          Current Week
        </button>
        <button
          className={`pb-2 ${activeTab === 'history' ? 'border-b-2 border-emerald-700 font-semibold text-emerald-700' : 'text-slate-600'}`}
          onClick={() => setActiveTab('history')}
        >
          History
        </button>
      </div>

      {activeTab === 'current' && (
        <div className="grid grid-cols-1 gap-3">
          {isLoading &&
            [...Array(3)].map((_, idx) => (
              <Card key={idx}>
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-24" />
                </div>
                <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {[...Array(3)].map((__, i) => (
                    <div key={i} className="rounded-lg border border-slate-200 p-3">
                      <Skeleton className="h-3 w-16" />
                      <Skeleton className="mt-2 h-4 w-32" />
                      <Skeleton className="mt-2 h-3 w-24" />
                    </div>
                  ))}
                </div>
              </Card>
            ))}

          {!isLoading &&
            plan &&
            days.map((day) => {
              const expanded = expandedDays[day.id] ?? false;
              return (
                <Card key={day.id} className="p-0">
                  <button
                    className="flex w-full items-center justify-between px-4 py-3 text-left"
                    onClick={() => toggleDay(day.id)}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold text-slate-900">
                        {dayNames[day.day_index] || `Day ${day.day_index + 1}`}
                      </span>
                      <span className="text-xs text-slate-500">
                        {formatKcal(day.daily_kcal)} · {formatProtein(day.daily_protein)} · {formatCurrency(day.daily_cost_gbp)}
                      </span>
                    </div>
                    <span className="text-xs text-slate-500">{expanded ? '▴' : '▾'}</span>
                  </button>
                  {expanded && (
                    <div className="space-y-3 px-4 pb-4">
                      {day.meals.map((meal) => (
                        <article
                          key={meal.id}
                          className="flex items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-[1px] hover:shadow-md"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="rounded bg-slate-100 px-2 py-1 text-[11px] font-semibold uppercase text-slate-500">
                                {meal.meal_slot}
                              </span>
                              <span className="rounded bg-slate-100 px-2 py-1 text-[11px] text-slate-600">
                                {meal.recipe?.meal_type || 'solid'}
                              </span>
                            </div>
                            <div className="mt-2 text-sm font-semibold text-slate-900">{meal.recipe?.name || '—'}</div>
                            <div className="mt-1 text-xs text-slate-600">
                              {meal.meal_kcal ? `${Math.round(Number(meal.meal_kcal))} kcal` : '—'} · {formatProtein(meal.meal_protein ?? meal.recipe?.base_protein)} ·{' '}
                              {formatCurrency(meal.meal_cost_gbp)}
                            </div>
                            <div className="mt-1 text-[11px] text-slate-500">{formatMacros(meal)}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                              {formatCurrency(meal.meal_cost_gbp)}
                            </span>
                            <div className="relative">
                              <button
                                className="rounded-full p-2 text-slate-500 hover:bg-slate-100"
                                onClick={() => setMenuOpen(menuOpen === meal.id ? null : meal.id)}
                              >
                                ⋮
                              </button>
                              {menuOpen === meal.id && (
                                <div className="absolute right-0 z-20 mt-2 w-40 rounded-lg border border-slate-200 bg-white shadow-lg">
                                  <button
                                    className="block w-full px-3 py-2 text-left text-sm hover:bg-slate-50"
                                    onClick={() => openSwap(meal.id, meal.meal_slot)}
                                  >
                                    Swap meal
                                  </button>
                                  <button className="block w-full px-3 py-2 text-left text-sm hover:bg-slate-50">Modify</button>
                                </div>
                              )}
                            </div>
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                </Card>
              );
            })}
        </div>
      )}

      <SwapDialog open={Boolean(swapMealId)} mealSlot={swapMealSlot} onClose={closeSwap} onSelect={handleSwapSelect} />
    </div>
  );
}
