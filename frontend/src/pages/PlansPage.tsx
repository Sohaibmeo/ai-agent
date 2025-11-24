import { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/shared/Card';
import { Skeleton } from '../components/shared/Skeleton';
import { useActivePlan } from '../hooks/usePlan';
import { DEMO_USER_ID } from '../lib/config';
import { SwapDialog } from '../components/plans/SwapDialog';
import { activatePlan, fetchActivePlan, setMealRecipe } from '../api/plans';
import { notify } from '../lib/toast';

const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const pillClass = 'rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600 border border-slate-200';

export function PlansPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { data: plan, isLoading, generatePlan, isGenerating } = useActivePlan(DEMO_USER_ID);
  const days = useMemo(() => plan?.days || [], [plan]);
  const [swapMealId, setSwapMealId] = useState<string | null>(null);
  const [swapMealSlot, setSwapMealSlot] = useState<string | undefined>(undefined);
  const [note, setNote] = useState('');
  const [activeTab, setActiveTab] = useState<'current' | 'history'>('current');
  const [expandedDays, setExpandedDays] = useState<Record<string, boolean>>({});
  const [isActivating, setIsActivating] = useState(false);

  const formatCurrency = (val?: number | null) => (val || val === 0 ? `£${Number(val).toFixed(2)}` : '—');
  const formatKcal = (val?: number | null) => (val || val === 0 ? `${Math.round(Number(val))} kcal` : '—');
  const formatProtein = (val?: number | null) => (val || val === 0 ? `Protein: ${Math.round(Number(val))}g` : 'Protein: —');
  const formatMacros = (meal: any) => {
    const p = meal.meal_protein ?? meal.recipe?.base_protein;
    const c = meal.meal_carbs ?? meal.recipe?.base_carbs;
    const f = meal.meal_fat ?? meal.recipe?.base_fat;
    return `Protein: ${p ? Math.round(Number(p)) : '—'}g  Carbs: ${c ? Math.round(Number(c)) : '—'}g  Fats: ${f ? Math.round(
      Number(f),
    ) : '—'}g`;
  };

  const totalMeals = useMemo(() => days.reduce((acc, d) => acc + (d.meals?.length || 0), 0), [days]);
  const avgKcal = plan && days.length ? (plan.total_kcal ? Math.round(Number(plan.total_kcal) / days.length) : null) : null;
  const avgProtein = plan && days.length ? (plan.total_protein ? Math.round(Number(plan.total_protein) / days.length) : null) : null;

  const goToRecipe = (mealId: string) => {
    navigate(`/plans/meal/${mealId}`);
  };

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
    try {
      await setMealRecipe({ planMealId: swapMealId, newRecipeId: recipeId });
      notify.success('Meal swapped');
      closeSwap();
      queryClient.invalidateQueries({ queryKey: ['plan', 'active', DEMO_USER_ID] });
      await queryClient.fetchQuery({
        queryKey: ['plan', 'active', DEMO_USER_ID],
        queryFn: () => fetchActivePlan(DEMO_USER_ID),
      });
    } catch (e) {
      notify.error('Could not swap meal');
    }
  };

  const toggleDay = (id: string) => {
    setExpandedDays((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const markAsActive = async () => {
    if (!plan?.id || plan.status === 'active') return;
    try {
      setIsActivating(true);
      await activatePlan(plan.id);
      notify.success('Plan marked as active');
      await queryClient.invalidateQueries({ queryKey: ['plan', 'active', DEMO_USER_ID] });
      await queryClient.fetchQuery({
        queryKey: ['plan', 'active', DEMO_USER_ID],
        queryFn: () => fetchActivePlan(DEMO_USER_ID),
      });
      await queryClient.invalidateQueries({ queryKey: ['shopping-list', 'active', DEMO_USER_ID] });
      notify.success('Groceries updated for active plan');
    } catch (e) {
      notify.error('Could not mark plan as active');
    } finally {
      setIsActivating(false);
    }
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
            onClick={async () => {
              try {
                notify.info('Generating plan...');
                await generatePlan({ useAgent: false });
                notify.success('New plan generated');
              } catch (e) {
                notify.error('Could not generate plan');
              }
            }}
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
                <Skeleton className="h-5 w-16 rounded-full" />
              </>
            ) : (
              <>
                <span className={pillClass}>{formatCurrency(plan?.total_estimated_cost_gbp)} total</span>
                <span className={pillClass}>
                  {plan?.total_kcal ? `${Math.round(Number(plan.total_kcal))} kcal` : '—'} {avgKcal ? `(${avgKcal} avg)` : ''}
                </span>
                <span className={pillClass}>
                  {plan?.total_protein ? `${Math.round(Number(plan.total_protein))}g protein` : '—'} {avgProtein ? `(${avgProtein} avg)` : ''}
                </span>
                <span className={pillClass}>{totalMeals} meals</span>
              </>
            )}
          </div>
        </div>
      </Card>

      <div className="flex items-center justify-between border-b border-slate-200 text-sm">
        <div className="flex items-center gap-6">
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
        {plan && plan.status !== 'active' && (
          <button
            className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
            onClick={markAsActive}
            disabled={isActivating}
            title="Mark this plan as active"
          >
            {isActivating ? 'Activating...' : 'Mark as active'}
          </button>
        )}
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

          {!isLoading && plan && days.length === 0 && (
            <Card>
              <div className="flex flex-col items-center justify-center gap-2 py-6 text-center text-sm text-slate-600">
                <div>No plan found.</div>
                <button
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
                  onClick={() => generatePlan({ useAgent: false })}
                >
                  Generate a plan
                </button>
              </div>
            </Card>
          )}

          {!isLoading && plan && days.length > 0 && (
            <div className="grid grid-cols-1 gap-3">
              {days.map((day) => {
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
                            onClick={() => goToRecipe(meal.id)}
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
                              <div className="mt-1 text-[11px] text-slate-500">{formatMacros(meal)}</div>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                              <div className="flex items-center gap-2">
                                <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                                  {formatCurrency(meal.meal_cost_gbp)}
                                </span>
                                <button
                                  className="rounded-full border border-slate-200 bg-white px-3 py-2 text-[11px] font-semibold text-slate-600 hover:bg-slate-100"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openSwap(meal.id, meal.meal_slot);
                                  }}
                                  title="Swap this meal"
                                >
                                  ⇄ Swap
                                </button>
                              </div>
                              <div className="text-xs text-slate-600 text-right">
                                {meal.meal_kcal ? `${Math.round(Number(meal.meal_kcal))} kcal` : '—'}
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
        </div>
      )}

      <SwapDialog open={Boolean(swapMealId)} mealSlot={swapMealSlot} onClose={closeSwap} onSelect={handleSwapSelect} />
    </div>
  );
}
