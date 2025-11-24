import { Card } from '../components/shared/Card';

const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const mealSlots = ['Breakfast', 'Snack', 'Lunch', 'Dinner'];

export function PlansPage() {
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
          <button className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800">
            Generate New Week
          </button>
        </div>
      </div>

      <Card>
        <div className="flex flex-wrap items-center gap-6 text-sm text-slate-700">
          <div>
            <div className="text-xs uppercase text-slate-500">Week start</div>
            <div className="font-semibold text-slate-900">2025-11-24</div>
          </div>
          <div>
            <div className="text-xs uppercase text-slate-500">Total kcal</div>
            <div className="font-semibold text-slate-900">~14,000</div>
          </div>
          <div>
            <div className="text-xs uppercase text-slate-500">Est. cost</div>
            <div className="font-semibold text-slate-900">£38.50</div>
          </div>
          <div>
            <div className="text-xs uppercase text-slate-500">Plan status</div>
            <div className="inline-flex items-center rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
              Active
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4">
        {days.map((day) => (
          <Card key={day}>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900">{day}</h2>
              <span className="text-xs text-slate-500">~2000 kcal · £5.50</span>
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
              {mealSlots.map((slot) => (
                <article key={slot} className="rounded-lg border border-slate-200 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase text-slate-500">{slot}</span>
                    <span className="text-[10px] rounded bg-slate-100 px-2 py-1 text-slate-600">solid</span>
                  </div>
                  <div className="mt-2 text-sm font-semibold text-slate-900">Sample recipe</div>
                  <div className="mt-1 text-xs text-slate-600">420 kcal · £1.80</div>
                  <div className="mt-3 flex items-center gap-2">
                    <button className="rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-700 hover:bg-slate-100">
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
    </div>
  );
}
