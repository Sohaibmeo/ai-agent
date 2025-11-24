import { Card } from '../components/shared/Card';
import { useActiveShoppingList } from '../hooks/useShoppingList';
import { DEMO_USER_ID } from '../lib/config';

export function GroceriesPage() {
  const { data: list, isLoading } = useActiveShoppingList(DEMO_USER_ID);

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Groceries</h1>
          <p className="text-sm text-slate-600">Shopping list for the current plan.</p>
        </div>
        <div className="text-xs text-slate-500">Plan: {list?.weekly_plan_id || '—'}</div>
      </div>

      <Card>
        {isLoading && <div className="text-sm text-slate-500">Loading shopping list...</div>}
        {!isLoading && (
          <div className="grid grid-cols-1 gap-3">
            {(list?.items || []).map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm"
              >
                <div>
                  <div className="font-semibold text-slate-900">{item.ingredient?.name || '—'}</div>
                  <div className="text-xs text-slate-600">
                    {Number(item.total_quantity)} {item.unit}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold text-slate-800">
                    {item.estimated_cost_gbp ? `£${Number(item.estimated_cost_gbp).toFixed(2)}` : '—'}
                  </span>
                  <label className="flex items-center gap-2 text-xs text-slate-700">
                    <input type="checkbox" className="rounded border-slate-300 text-slate-900" defaultChecked={item.has_item} /> Already have
                  </label>
                  <button className="rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-700 hover:bg-slate-100">
                    Update price
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
