const sampleItems = [
  { name: 'Chicken Breast', quantity: '500 g', cost: '£4.00' },
  { name: 'Oats', quantity: '1 kg', cost: '£1.50' },
  { name: 'Greek Yogurt', quantity: '400 g', cost: '£2.20' },
];

export function GroceriesPage() {
  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Groceries</h1>
          <p className="text-sm text-slate-600">Shopping list for the current plan.</p>
        </div>
        <div className="text-xs text-slate-500">Week of 2025-11-24</div>
      </div>

      <section className="card p-4">
        <div className="grid grid-cols-1 gap-3">
          {sampleItems.map((item) => (
            <div
              key={item.name}
              className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm"
            >
              <div>
                <div className="font-semibold text-slate-900">{item.name}</div>
                <div className="text-xs text-slate-600">{item.quantity}</div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold text-slate-800">{item.cost}</span>
                <label className="flex items-center gap-2 text-xs text-slate-700">
                  <input type="checkbox" className="rounded border-slate-300 text-slate-900" /> Already have
                </label>
                <button className="rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-700 hover:bg-slate-100">
                  Update price
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
