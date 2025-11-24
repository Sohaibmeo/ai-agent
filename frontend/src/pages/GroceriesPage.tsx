import { Card } from '../components/shared/Card';
import { useActiveShoppingList } from '../hooks/useShoppingList';
import { DEMO_USER_ID } from '../lib/config';
import { Skeleton } from '../components/shared/Skeleton';
import { useNavigate } from 'react-router-dom';

export function GroceriesPage() {
  const { data: list, isLoading } = useActiveShoppingList(DEMO_USER_ID);
  const navigate = useNavigate();

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Groceries</h1>
          <p className="text-sm text-slate-600">Shopping list for the current plan.</p>
        </div>
        <div className="text-xs text-slate-500">Plan: {list?.weekly_plan_id || '—'}</div>
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

        {!isLoading && (list?.items?.length || 0) === 0 && (
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

        {!isLoading && (list?.items?.length || 0) > 0 && (
          <div className="space-y-2 p-4">
            {list?.items.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm"
              >
                <div>
                  <div className="font-semibold text-slate-900">{item.ingredient?.name || '—'}</div>
                  <div className="text-xs text-slate-600">
                    {Number(item.total_quantity)} {item.unit}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                    {item.estimated_cost_gbp ? `£${Number(item.estimated_cost_gbp).toFixed(2)}` : '£—'}
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
