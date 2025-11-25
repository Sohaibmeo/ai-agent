import { useEffect, useMemo, useState } from 'react';
import { Card } from '../components/shared/Card';
import { useShoppingList } from '../hooks/useShoppingList';
import { DEMO_USER_ID } from '../lib/config';
import { Skeleton } from '../components/shared/Skeleton';
import { useNavigate } from 'react-router-dom';
import { UpdatePriceModal } from '../components/groceries/UpdatePriceModal';
import type { ShoppingListItem } from '../api/types';
import { notify } from '../lib/toast';
import { updatePantry, updatePrice } from '../api/shoppingList';
import { useActivePlan } from '../hooks/usePlan';
import { usePlansList } from '../hooks/usePlansList';

export function GroceriesPage() {
  const { data: plan } = useActivePlan(DEMO_USER_ID);
  const { data: plansList } = usePlansList();
  const [selectedPlanId, setSelectedPlanId] = useState<string | undefined>(undefined);
  const { data: list, isLoading } = useShoppingList(selectedPlanId, DEMO_USER_ID);
  const navigate = useNavigate();
  const [items, setItems] = useState(list?.items || []);
  const [priceTarget, setPriceTarget] = useState<ShoppingListItem | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setItems(list?.items || []);
    setError(null);
  }, [list]);

  useEffect(() => {
    if (!selectedPlanId) {
      const activeId = list?.weekly_plan_id || plan?.id;
      if (activeId) setSelectedPlanId(activeId);
    }
  }, [selectedPlanId, list?.weekly_plan_id, plan?.id]);

  const estimatedTotal = useMemo(() => {
    return items
      .filter((i) => !i.has_item)
      .reduce((sum, i) => sum + (i.estimated_cost_gbp ? Number(i.estimated_cost_gbp) : 0), 0);
  }, [items]);

  const toggleItem = (id: string) => {
    const target = items.find((i) => i.id === id);
    if (!target) return;
    const next = !target.has_item;
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, has_item: next } : item)));
    updatePantry({
      userId: DEMO_USER_ID,
      ingredientId: target.ingredient.id,
      hasItem: next,
      planId: list?.weekly_plan_id,
    })
      .then((res) => {
        setItems(res.items || []);
        notify.success('Pantry status updated');
      })
      .catch(() => {
        setError('Could not update pantry');
        notify.error('Could not update pantry');
      });
  };

  const copyList = async () => {
    const header = 'Ingredient,Quantity,Unit,Estimated Cost (GBP),Have\n';
    const lines = items.map((i) => {
      const cost = i.estimated_cost_gbp ? Number(i.estimated_cost_gbp).toFixed(2) : '';
      return `"${i.ingredient?.name || ''}",${i.total_quantity},${i.unit},${cost},${i.has_item ? 'yes' : 'no'}`;
    });
    const csv = header + lines.join('\n');
    try {
      await navigator.clipboard.writeText(csv);
      notify.success('Shopping list copied');
    } catch {
      notify.error('Could not copy list');
    }
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Groceries</h1>
          <p className="text-sm text-slate-600">Shopping list for the current plan.</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-700">
          <select
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 pr-8 text-sm text-slate-700 hover:bg-slate-100"
            value={selectedPlanId || ''}
            onChange={(e) => setSelectedPlanId(e.target.value)}
          >
            <option value="" disabled>
              Select week
            </option>
            {(plansList || []).map((p) => (
              <option key={p.id} value={p.id}>
                Week of {p.week_start_date} ({p.status})
              </option>
            ))}
          </select>
          <span className="rounded-lg bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">
            Estimated total £{estimatedTotal.toFixed(2)}
          </span>
          {items.length > 0 && (
            <button
              className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
              onClick={copyList}
              title="Copy shopping list (CSV)"
            >
              📋 Copy list
            </button>
          )}
        </div>
      </div>

      <Card className="p-0">
        {isLoading && (
          <div className="space-y-3 p-4">
            {[...Array(4)].map((_, idx) => (
              <div key={idx} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 p-3">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-20" />
                </div>
                <Skeleton className="h-8 w-32 rounded-full" />
              </div>
            ))}
          </div>
        )}

        {!isLoading && !error && (items?.length || 0) === 0 && (
          <div className="flex flex-col items-center justify-center gap-3 px-6 py-12 text-center">
            <div className="text-base font-semibold text-slate-900">No shopping list yet</div>
            <div className="text-sm text-slate-500">Generate a plan to see your groceries here.</div>
            <button
              className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800"
              onClick={() => navigate('/plans')}
            >
              Go to Plans
            </button>
          </div>
        )}

        {!isLoading && error && (
          <div className="flex flex-col items-center justify-center gap-3 px-6 py-12 text-center">
            <div className="text-base font-semibold text-red-600">Could not load groceries</div>
            <div className="text-sm text-slate-500">Please try again.</div>
            <button
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
              onClick={() => {
                setError(null);
                // Reload by navigating back or refetch hook; easiest is to refresh
                window.location.reload();
              }}
            >
              Retry
            </button>
          </div>
        )}

        {!isLoading && (items?.length || 0) > 0 && (
          <div className="space-y-2 p-4">
            {items.map((item) => (
              <div
                key={item.id}
                className={`flex items-center justify-between gap-3 rounded-2xl border border-slate-200 px-4 py-3 text-sm shadow-sm cursor-pointer hover:-translate-y-[1px] hover:shadow-md transition ${
                  item.has_item ? 'bg-slate-50' : 'bg-white'
                }`}
                onClick={() => toggleItem(item.id)}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    className="rounded border-slate-300 text-slate-900"
                    checked={Boolean(item.has_item)}
                    onChange={() => toggleItem(item.id)}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <div>
                    <div className={`font-semibold ${item.has_item ? 'text-slate-500 line-through' : 'text-slate-900'}`}>
                      {item.ingredient?.name || '—'}
                    </div>
                    <div className={`text-xs ${item.has_item ? 'text-slate-400 line-through' : 'text-slate-600'}`}>
                      {Number(item.total_quantity)} {item.unit}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                    {item.estimated_cost_gbp ? `£${Number(item.estimated_cost_gbp).toFixed(2)}` : '£—'}
                  </span>
                  <button
                    className="rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-700 hover:bg-slate-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPriceTarget(item);
                    }}
                  >
                    Update price
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <UpdatePriceModal
        open={Boolean(priceTarget)}
        item={priceTarget || undefined}
        onClose={() => setPriceTarget(null)}
        onSave={(payload) => {
          updatePrice({
            userId: DEMO_USER_ID,
            ingredientId: priceTarget?.ingredient.id || '',
            pricePaid: payload.pricePaid,
            quantity: payload.quantity,
            unit: payload.unit,
            planId: list?.weekly_plan_id,
          })
            .then((res) => {
              setItems(res.items || []);
              notify.success('Price saved');
            })
            .catch(() => notify.error('Could not save price'))
            .finally(() => setPriceTarget(null));
        }}
      />
    </div>
  );
}
