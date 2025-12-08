import { useMemo, useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/shared/Card';
import { Skeleton } from '../components/shared/Skeleton';
import { useActivePlan } from '../hooks/usePlan';
import { usePlansList } from '../hooks/usePlansList';
import { useProfile } from '../hooks/useProfile';
import { DEMO_USER_ID } from '../lib/config';
import { SwapDialog } from '../components/plans/SwapDialog';
import { activatePlan, aiPlanSwap, fetchActivePlan, setMealRecipe, setPlanStatus } from '../api/plans';
import { notify } from '../lib/toast';
import { useLlmAction } from '../hooks/useLlmAction';

const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const pillClass = 'rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600 border border-slate-200';
const mealOrder = ['breakfast', 'lunch', 'snack', 'dinner'];

export function PlansPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { data: plan, isLoading, isError, refetchPlan, generatePlan, isGenerating } = useActivePlan(DEMO_USER_ID);
  const { data: plansList } = usePlansList();
  const { data: profile, saveProfile } = useProfile();
  const { runWithLlmLoader: runPlanGeneration } = useLlmAction({
    kind: 'generate-week',
    title: 'Generating your weekly plan...',
    subtitle: 'Your AI coach is planning meals around your macros and budget.',
  });
  const { runWithLlmLoader: runPlanAdjustment } = useLlmAction({
    kind: 'review-plan',
    title: 'Adjusting your plan with AI...',
    subtitle: 'We will plan safe changes for your meals while keeping targets in mind.',
  });
  const days = useMemo(() => {
    const d = plan?.days || [];
    return [...d].sort((a, b) => a.day_index - b.day_index);
  }, [plan]);
  const [swapMealId, setSwapMealId] = useState<string | null>(null);
  const [swapMealSlot, setSwapMealSlot] = useState<string | undefined>(undefined);
  const [note, setNote] = useState('');
  const [activeTab, setActiveTab] = useState<'current' | 'history'>('current');
  const [expandedDays, setExpandedDays] = useState<Record<string, boolean>>({});
  const [isActivating, setIsActivating] = useState(false);
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [weekStart, setWeekStart] = useState<string>(new Date().toISOString().slice(0, 10));
  const [weeklyBudget, setWeeklyBudget] = useState<string>('');
  const [slots, setSlots] = useState({
    breakfast_enabled: true,
    snack_enabled: true,
    lunch_enabled: true,
    dinner_enabled: true,
    max_difficulty: 'easy',
    save_settings: false,
  });
  const [appliedSlots, setAppliedSlots] = useState({
    breakfast_enabled: true,
    snack_enabled: true,
    lunch_enabled: true,
    dinner_enabled: true,
    max_difficulty: 'easy',
  });
  const [appliedBudget, setAppliedBudget] = useState<string>('');
  const [sameMealsAllWeek, setSameMealsAllWeek] = useState(false);
  const [appliedSameMealsAllWeek, setAppliedSameMealsAllWeek] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [isModifyMode, setIsModifyMode] = useState(false);
  const [selectedDayIds, setSelectedDayIds] = useState<string[]>([]);
  const mealSlotRank = (slot?: string | null) => {
    const idx = slot ? mealOrder.indexOf(slot.toLowerCase()) : -1;
    return idx === -1 ? mealOrder.length + 1 : idx;
  };
  const resetAdvanced = () => {
    setSlots((prev) => ({
      ...prev,
      breakfast_enabled: appliedSlots.breakfast_enabled,
      snack_enabled: appliedSlots.snack_enabled,
      lunch_enabled: appliedSlots.lunch_enabled,
      dinner_enabled: appliedSlots.dinner_enabled,
      max_difficulty: appliedSlots.max_difficulty,
      save_settings: false,
    }));
    setWeeklyBudget(appliedBudget);
    setSameMealsAllWeek(appliedSameMealsAllWeek);
  };

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
  const sortedPlans = useMemo(() => {
    if (!plansList) return [];
    return [...plansList].sort((a, b) => (a.week_start_date > b.week_start_date ? -1 : 1));
  }, [plansList]);
  const selectAllChecked = useMemo(() => !!days.length && selectedDayIds.length === days.length, [days.length, selectedDayIds.length]);

  const avgKcal = plan && days.length ? (plan.total_kcal ? Math.round(Number(plan.total_kcal) / days.length) : null) : null;
  const avgProtein = plan && days.length ? (plan.total_protein ? Math.round(Number(plan.total_protein) / days.length) : null) : null;

  // Initialize advanced defaults from profile once
  useEffect(() => {
    if (initialized || !profile) return;
    const initialSlots = {
      breakfast_enabled: profile.breakfast_enabled ?? true,
      snack_enabled: profile.snack_enabled ?? true,
      lunch_enabled: profile.lunch_enabled ?? true,
      dinner_enabled: profile.dinner_enabled ?? true,
      max_difficulty: profile.max_difficulty || 'easy',
      save_settings: false,
    };
    setSlots(initialSlots);
    setAppliedSlots({
      breakfast_enabled: initialSlots.breakfast_enabled,
      snack_enabled: initialSlots.snack_enabled,
      lunch_enabled: initialSlots.lunch_enabled,
      dinner_enabled: initialSlots.dinner_enabled,
      max_difficulty: initialSlots.max_difficulty,
    });
    const budgetString = profile.weekly_budget_gbp ? String(profile.weekly_budget_gbp) : '';
    setWeeklyBudget(budgetString);
    setAppliedBudget(budgetString);
    setInitialized(true);
  }, [initialized, profile]);

  useEffect(() => {
    setIsModifyMode(false);
    setSelectedDayIds([]);
  }, [plan?.id, days.length]);

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

  const refreshActivePlan = async () => {
    await queryClient.invalidateQueries({ queryKey: ['plan', 'active', DEMO_USER_ID] });
    await queryClient.fetchQuery({
      queryKey: ['plan', 'active', DEMO_USER_ID],
      queryFn: () => fetchActivePlan(DEMO_USER_ID),
    });
  };

  const handleSwapSelect = async (recipeId: string) => {
    if (!swapMealId) return;
    try {
      await setMealRecipe({ planMealId: swapMealId, newRecipeId: recipeId });
      notify.success('Meal swapped');
      closeSwap();
      await refreshActivePlan();
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

  const runAgentPlanGeneration = async () => {
    try {
      await runPlanGeneration(async () => {
        const result = await generatePlan({
          useAgent: true,
          useLlmRecipes: false,
          sameMealsAllWeek,
          weekStartDate: weekStart,
          weeklyBudgetGbp: weeklyBudget ? Number(weeklyBudget) : undefined,
          breakfast_enabled: slots.breakfast_enabled,
          snack_enabled: slots.snack_enabled,
          lunch_enabled: slots.lunch_enabled,
          dinner_enabled: slots.dinner_enabled,
          maxDifficulty: slots.max_difficulty,
        });
        notify.success('New plan generated');
        return result;
      });
    } catch (e) {
      console.error(e);
      notify.error('Could not generate plan');
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
        <div className="flex flex-wrap items-center justify-between gap-4 text-sm">
          <div className="flex flex-wrap items-center gap-3">
            <button
              className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-50"
              disabled={isGenerating}
              onClick={runAgentPlanGeneration}
            >
              {isGenerating ? 'Generating...' : 'Generate New Week'}
            </button>
            <button
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
              onClick={() => {
                resetAdvanced();
                setIsAdvancedOpen(true);
              }}
            >
              Advanced settings
            </button>
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-700" aria-label="applied-plan-settings">
              {appliedBudget && (
                <span className="rounded-full border border-slate-200 bg-white px-2 py-1 font-semibold">£{appliedBudget}</span>
              )}
              {(['breakfast_enabled', 'snack_enabled', 'lunch_enabled', 'dinner_enabled'] as const)
                .filter((k) => appliedSlots[k])
                .map((k) => (
                  <span key={k} className="rounded-full border border-slate-200 bg-white px-2 py-1">
                    {k.split('_')[0]}
                  </span>
                ))}
              <span className="rounded-full border border-slate-200 bg-white px-2 py-1">
                Max {appliedSlots.max_difficulty || 'easy'}
              </span>
            </div>
          </div>
          <button
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-100 disabled:opacity-50"
            disabled={!plan || !days.length}
            onClick={() => {
              setIsModifyMode((prev) => !prev);
              setSelectedDayIds([]);
            }}
          >
            {isModifyMode ? 'Close Modify Mode' : 'Modify'}
          </button>
        </div>
        {isModifyMode && selectedDayIds.length > 0 && (
          <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
            <label className="text-xs text-slate-600">Tell the AI what to prioritize for selected days</label>
            <textarea
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-300"
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Higher protein lunches, simpler dinners; keep cost under £35; more drinkable breakfasts..."
            />
            <div className="mt-1 text-[11px] text-slate-500">AI will use this along with your profile defaults.</div>
            <div className="mt-3 flex justify-end">
              <button
                className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
                disabled={!plan?.id || selectedDayIds.length === 0}
                onClick={async () => {
                  if (!plan?.id) return;
                  try {
                    await runPlanAdjustment(async () => {
                      const result = await aiPlanSwap({
                        type: 'swap-with-days-selected',
                        userId: DEMO_USER_ID,
                        weeklyPlanId: plan.id,
                        planDayIds: selectedDayIds,
                        note: note.trim() || undefined,
                        context: { source: 'plans-page' },
                      });
                      notify.success('Request sent');
                      await refreshActivePlan();
                      return result;
                    });
                  } catch (e) {
                    console.error(e);
                    notify.error('Could not send request');
                  }
                }}
              >
                Generate Changes
              </button>
            </div>
          </div>
        )}
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
          <div className="flex items-center gap-2">
            {plan.status !== 'archived' && (
              <button
                className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800"
                onClick={() =>
                  plan.id &&
                  setPlanStatus(plan.id, 'draft').then(() => {
                    notify.success('Plan stored as draft');
                    queryClient.invalidateQueries({ queryKey: ['plans', 'all'] });
                  })
                }
              >
                Store draft
              </button>
            )}
            <button
              className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
              onClick={markAsActive}
              disabled={isActivating}
              title="Mark this plan as active"
            >
              {isActivating ? 'Activating...' : 'Mark as active'}
            </button>
          </div>
        )}
      </div>

      {activeTab === 'current' && (
        <div className="grid grid-cols-1 gap-3">
          {isModifyMode && plan && days.length > 0 && (
            <div className="flex items-center justify-between rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selectAllChecked}
                  onChange={(e) => setSelectedDayIds(e.target.checked ? days.map((d) => d.id) : [])}
                />
                Select all days
              </label>
              {selectedDayIds.length > 0 && <span className="text-xs text-emerald-700">{selectedDayIds.length} selected</span>}
            </div>
          )}
          {isError && !plan && (
            <Card>
              <div className="flex items-center justify-between text-sm text-red-600">
                <div>Could not load the plan.</div>
                <button
                  className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100"
                  onClick={() => refetchPlan()}
                >
                  Retry
                </button>
              </div>
            </Card>
          )}
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

          {!isLoading && (!plan || days.length === 0) && (
            <Card>
              <div className="flex flex-col items-center justify-center gap-2 py-6 text-center text-sm text-slate-600">
                <div>No plan found.</div>
                <button
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
                  onClick={runAgentPlanGeneration}
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
                const selected = selectedDayIds.includes(day.id);
                return (
                  <div key={day.id} className="flex items-start gap-3">
                    {isModifyMode && (
                      <input
                        type="checkbox"
                        className="mt-4"
                        checked={selected}
                        onChange={(e) => {
                          setSelectedDayIds((prev) => {
                            if (e.target.checked) {
                              return prev.includes(day.id) ? prev : [...prev, day.id];
                            }
                            return prev.filter((id) => id !== day.id);
                          });
                        }}
                      />
                    )}
                    <Card className="w-full p-0">
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
                          {[...(day.meals || [])]
                            .sort((a, b) => mealSlotRank(a.meal_slot) - mealSlotRank(b.meal_slot))
                            .map((meal) => (
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
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      <SwapDialog
        open={Boolean(swapMealId)}
        mealSlot={swapMealSlot}
        planMealId={swapMealId}
        weeklyPlanId={plan?.id || null}
        onClose={closeSwap}
        onSelect={handleSwapSelect}
        onPlanUpdated={refreshActivePlan}
      />

      {isAdvancedOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={() => { resetAdvanced(); setIsAdvancedOpen(false); }}>
          <div
            className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="text-lg font-semibold text-slate-900">Advanced settings</div>
            <div className="mt-4 space-y-4 text-sm text-slate-700">
              <label className="block space-y-1">
                <span className="text-xs uppercase text-slate-500">Week start date</span>
                <input
                  type="date"
                  value={weekStart}
                  onChange={(e) => setWeekStart(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-200"
                />
              </label>

              <label className="block space-y-1">
                <span className="text-xs uppercase text-slate-500">Weekly budget (£)</span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={weeklyBudget}
                  onChange={(e) => setWeeklyBudget(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-200"
                  placeholder="Optional"
                />
              </label>

              <div>
                <span className="text-xs uppercase text-slate-500">Meals enabled</span>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {(['breakfast_enabled', 'snack_enabled', 'lunch_enabled', 'dinner_enabled'] as const).map((key) => (
                    <label
                      key={key}
                      className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50"
                    >
                      <span className="capitalize">{key.split('_')[0]}</span>
                      <input
                        type="checkbox"
                        checked={slots[key]}
                        onChange={() => setSlots((prev) => ({ ...prev, [key]: !prev[key] }))}
                      />
                    </label>
                  ))}
                </div>
              </div>

              <label className="block space-y-1">
                <span className="text-xs uppercase text-slate-500">Max difficulty</span>
                <select
                  value={slots.max_difficulty}
                  onChange={(e) => setSlots((prev) => ({ ...prev, max_difficulty: e.target.value }))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-200"
                >
                  <option value="super_easy">Super easy</option>
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </label>
            </div>

            <div className="mt-6 flex justify-between items-center">
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={slots.save_settings || false}
                  onChange={(e) => setSlots((prev) => ({ ...prev, save_settings: e.target.checked }))}
                />
                Save these settings as defaults
              </label>
              <div className="flex gap-2">
                <label className="flex items-center gap-2 text-sm text-slate-700 mr-4">
                  <input
                    type="checkbox"
                    checked={sameMealsAllWeek}
                    onChange={(e) => setSameMealsAllWeek(e.target.checked)}
                  />
                  Same meals all week
                </label>
                <button
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
                  onClick={() => {
                    resetAdvanced();
                    setIsAdvancedOpen(false);
                  }}
                >
                  Cancel
                </button>
                <button
                  className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800"
                  onClick={() => {
                    setIsAdvancedOpen(false);
                    setAppliedSlots({
                      breakfast_enabled: slots.breakfast_enabled,
                      snack_enabled: slots.snack_enabled,
                      lunch_enabled: slots.lunch_enabled,
                      dinner_enabled: slots.dinner_enabled,
                      max_difficulty: slots.max_difficulty,
                    });
                    setAppliedBudget(weeklyBudget);
                    setAppliedSameMealsAllWeek(sameMealsAllWeek);
                    if (slots.save_settings) {
                      saveProfile({
                        weekly_budget_gbp: weeklyBudget ? Number(weeklyBudget) : null,
                        breakfast_enabled: slots.breakfast_enabled,
                        snack_enabled: slots.snack_enabled,
                        lunch_enabled: slots.lunch_enabled,
                        dinner_enabled: slots.dinner_enabled,
                        max_difficulty: slots.max_difficulty,
                      })
                        .then(() => notify.success('Settings saved'))
                        .catch(() => notify.error('Could not save settings'));
                    }
                    // Clear the save-settings toggle after applying
                    setSlots((prev) => ({ ...prev, save_settings: false }));
                  }}
                >
                  Apply
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <Card>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">Previous plans</h3>
            <button
              className="text-xs text-slate-600 hover:underline"
              onClick={() => queryClient.invalidateQueries({ queryKey: ['plans', 'all'] })}
            >
              Refresh
            </button>
          </div>
          <div className="mt-3 space-y-2 text-sm">
            {sortedPlans?.length
              ? sortedPlans.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-slate-900">{p.week_start_date}</span>
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] text-slate-600">{p.status}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {p.status !== 'active' && (
                        <>
                          <button
                            className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                            onClick={() =>
                              activatePlan(p.id).then(() => {
                                notify.success('Plan activated from history');
                                queryClient.invalidateQueries({ queryKey: ['plan', 'active', DEMO_USER_ID] });
                              })
                            }
                          >
                            Activate
                          </button>
                          <button
                            className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-semibold text-red-600 hover:bg-red-50"
                            onClick={() =>
                              setPlanStatus(p.id, 'systemdraft').then(() => {
                                notify.success('Plan removed from history');
                                queryClient.invalidateQueries({ queryKey: ['plans', 'all'] });
                              })
                            }
                            title="Remove plan"
                          >
                            🗑
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))
              : 'No past plans yet.'}
          </div>
        </Card>
      )}
    </div>
  );
}
