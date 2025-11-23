export function ProfilePage() {
  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Profile</h1>
          <p className="text-sm text-slate-600">Body data, diet, allergies, and plan defaults.</p>
        </div>
        <button className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800">
          Save Profile
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section className="card p-4 space-y-3">
          <h2 className="text-sm font-semibold text-slate-800">Body & Goals</h2>
          <div className="grid grid-cols-2 gap-3 text-sm text-slate-700">
            <label className="space-y-1">
              <span>Age</span>
              <input type="number" className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm" placeholder="25" />
            </label>
            <label className="space-y-1">
              <span>Height (cm)</span>
              <input type="number" className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm" placeholder="175" />
            </label>
            <label className="space-y-1">
              <span>Weight (kg)</span>
              <input type="number" className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm" placeholder="70" />
            </label>
            <label className="space-y-1">
              <span>Activity level</span>
              <select className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm">
                <option>Moderate</option>
                <option>Sedentary</option>
                <option>Light</option>
                <option>Active</option>
              </select>
            </label>
            <label className="space-y-1 col-span-2">
              <span>Goal</span>
              <select className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm">
                <option>Maintain weight</option>
                <option>Lose weight</option>
                <option>Gain weight</option>
              </select>
            </label>
          </div>
        </section>

        <section className="card p-4 space-y-3">
          <h2 className="text-sm font-semibold text-slate-800">Diet & Allergies</h2>
          <div className="grid grid-cols-2 gap-3 text-sm text-slate-700">
            <label className="space-y-1 col-span-2">
              <span>Diet type</span>
              <select className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm">
                <option>None</option>
                <option>Halal</option>
                <option>Vegan</option>
                <option>Vegetarian</option>
                <option>Keto</option>
              </select>
            </label>
            <label className="space-y-1 col-span-2">
              <span>Allergies</span>
              <input
                type="text"
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                placeholder="e.g., peanuts, dairy"
              />
            </label>
          </div>
        </section>

        <section className="card p-4 space-y-3">
          <h2 className="text-sm font-semibold text-slate-800">Plan Defaults</h2>
          <div className="grid grid-cols-2 gap-3 text-sm text-slate-700">
            <label className="flex items-center gap-2">
              <input type="checkbox" className="rounded border-slate-300 text-slate-900" defaultChecked />
              Breakfast
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" className="rounded border-slate-300 text-slate-900" defaultChecked />
              Snack
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" className="rounded border-slate-300 text-slate-900" defaultChecked />
              Lunch
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" className="rounded border-slate-300 text-slate-900" defaultChecked />
              Dinner
            </label>
            <label className="space-y-1 col-span-2">
              <span>Weekly budget (GBP)</span>
              <input
                type="number"
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                placeholder="40"
              />
            </label>
          </div>
        </section>
      </div>
    </div>
  );
}
