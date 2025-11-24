import { Card } from '../components/shared/Card';

const inputClass = 'w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-300';

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
        <Card title="Body & Goals">
          <div className="grid grid-cols-2 gap-3 text-sm text-slate-700">
            <label className="space-y-1">
              <span>Age</span>
              <input type="number" className={inputClass} placeholder="25" />
            </label>
            <label className="space-y-1">
              <span>Height (cm)</span>
              <input type="number" className={inputClass} placeholder="175" />
            </label>
            <label className="space-y-1">
              <span>Weight (kg)</span>
              <input type="number" className={inputClass} placeholder="70" />
            </label>
            <label className="space-y-1">
              <span>Activity level</span>
              <select className={inputClass}>
                <option>Moderate</option>
                <option>Sedentary</option>
                <option>Light</option>
                <option>Active</option>
              </select>
            </label>
            <label className="space-y-1 col-span-2">
              <span>Goal</span>
              <select className={inputClass}>
                <option>Maintain weight</option>
                <option>Lose weight</option>
                <option>Gain weight</option>
              </select>
            </label>
          </div>
        </Card>

        <Card title="Diet & Allergies">
          <div className="grid grid-cols-2 gap-3 text-sm text-slate-700">
            <label className="space-y-1 col-span-2">
              <span>Diet type</span>
              <select className={inputClass}>
                <option>None</option>
                <option>Halal</option>
                <option>Vegan</option>
                <option>Vegetarian</option>
                <option>Keto</option>
              </select>
            </label>
            <label className="space-y-1 col-span-2">
              <span>Allergies</span>
              <input type="text" className={inputClass} placeholder="e.g., peanuts, dairy" />
            </label>
          </div>
        </Card>

        <Card title="Plan Defaults">
          <div className="grid grid-cols-2 gap-3 text-sm text-slate-700">
            {['Breakfast', 'Snack', 'Lunch', 'Dinner'].map((label) => (
              <label key={label} className="flex items-center gap-2">
                <input type="checkbox" className="rounded border-slate-300 text-slate-900" defaultChecked />
                {label}
              </label>
            ))}
            <label className="space-y-1 col-span-2">
              <span>Weekly budget (GBP)</span>
              <input type="number" className={inputClass} placeholder="40" />
            </label>
          </div>
        </Card>
      </div>
    </div>
  );
}
