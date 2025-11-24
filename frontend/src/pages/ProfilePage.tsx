import { useEffect, useMemo, useState } from 'react';
import { Card } from '../components/shared/Card';
import { useProfile } from '../hooks/useProfile';

const inputClass =
  'w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-300';

export function ProfilePage() {
  const { data, isLoading, isSaving, saveProfile } = useProfile();
  const [form, setForm] = useState({
    age: '',
    height_cm: '',
    weight_kg: '',
    activity_level: '',
    goal: '',
    diet_type: '',
    allergies: '',
    breakfast_enabled: true,
    snack_enabled: true,
    lunch_enabled: true,
    dinner_enabled: true,
    weekly_budget_gbp: '',
  });

  useEffect(() => {
    if (!data) return;
    setForm({
      age: data.age ? String(data.age) : '',
      height_cm: data.height_cm ? String(data.height_cm) : '',
      weight_kg: data.weight_kg ? String(data.weight_kg) : '',
      activity_level: data.activity_level || 'moderate',
      goal: data.goal || 'maintain_weight',
      diet_type: data.diet_type || 'none',
      allergies: (data.allergy_keys || []).join(', '),
      breakfast_enabled: data.breakfast_enabled ?? true,
      snack_enabled: data.snack_enabled ?? true,
      lunch_enabled: data.lunch_enabled ?? true,
      dinner_enabled: data.dinner_enabled ?? true,
      weekly_budget_gbp: data.weekly_budget_gbp ? String(data.weekly_budget_gbp) : '',
    });
  }, [data]);

  const handleChange = (key: string, value: any) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const parsedAllergies = useMemo(
    () =>
      form.allergies
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    [form.allergies],
  );

  const handleSave = async () => {
    await saveProfile({
      age: form.age ? Number(form.age) : null,
      height_cm: form.height_cm ? Number(form.height_cm) : null,
      weight_kg: form.weight_kg ? Number(form.weight_kg) : null,
      activity_level: form.activity_level || null,
      goal: form.goal || null,
      diet_type: form.diet_type || null,
      allergy_keys: parsedAllergies,
      breakfast_enabled: form.breakfast_enabled,
      snack_enabled: form.snack_enabled,
      lunch_enabled: form.lunch_enabled,
      dinner_enabled: form.dinner_enabled,
      weekly_budget_gbp: form.weekly_budget_gbp ? Number(form.weekly_budget_gbp) : null,
    });
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Profile</h1>
          <p className="text-sm text-slate-600">Body data, diet, allergies, and plan defaults.</p>
        </div>
        <button
          disabled={isSaving}
          onClick={handleSave}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {isSaving ? 'Saving...' : 'Save Profile'}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title="Body & Goals">
          <div className="grid grid-cols-2 gap-3 text-sm text-slate-700">
            <label className="space-y-1">
              <span>Age</span>
              <input
                type="number"
                className={inputClass}
                placeholder="25"
                value={form.age}
                onChange={(e) => handleChange('age', e.target.value)}
                disabled={isLoading}
              />
            </label>
            <label className="space-y-1">
              <span>Height (cm)</span>
              <input
                type="number"
                className={inputClass}
                placeholder="175"
                value={form.height_cm}
                onChange={(e) => handleChange('height_cm', e.target.value)}
                disabled={isLoading}
              />
            </label>
            <label className="space-y-1">
              <span>Weight (kg)</span>
              <input
                type="number"
                className={inputClass}
                placeholder="70"
                value={form.weight_kg}
                onChange={(e) => handleChange('weight_kg', e.target.value)}
                disabled={isLoading}
              />
            </label>
            <label className="space-y-1">
              <span>Activity level</span>
              <select
                className={inputClass}
                value={form.activity_level}
                onChange={(e) => handleChange('activity_level', e.target.value)}
                disabled={isLoading}
              >
                <option value="moderate">Moderate</option>
                <option value="sedentary">Sedentary</option>
                <option value="light">Light</option>
                <option value="active">Active</option>
              </select>
            </label>
            <label className="space-y-1 col-span-2">
              <span>Goal</span>
              <select
                className={inputClass}
                value={form.goal}
                onChange={(e) => handleChange('goal', e.target.value)}
                disabled={isLoading}
              >
                <option value="maintain_weight">Maintain weight</option>
                <option value="lose_weight">Lose weight</option>
                <option value="gain_weight">Gain weight</option>
              </select>
            </label>
          </div>
        </Card>

        <Card title="Diet & Allergies">
          <div className="grid grid-cols-2 gap-3 text-sm text-slate-700">
            <label className="space-y-1 col-span-2">
              <span>Diet type</span>
              <select
                className={inputClass}
                value={form.diet_type}
                onChange={(e) => handleChange('diet_type', e.target.value)}
                disabled={isLoading}
              >
                <option value="none">None</option>
                <option value="halal">Halal</option>
                <option value="vegan">Vegan</option>
                <option value="vegetarian">Vegetarian</option>
                <option value="keto">Keto</option>
              </select>
            </label>
            <label className="space-y-1 col-span-2">
              <span>Allergies</span>
              <input
                type="text"
                className={inputClass}
                placeholder="e.g., peanuts, dairy"
                value={form.allergies}
                onChange={(e) => handleChange('allergies', e.target.value)}
                disabled={isLoading}
              />
            </label>
          </div>
        </Card>

        <Card title="Plan Defaults">
          <div className="grid grid-cols-2 gap-3 text-sm text-slate-700">
            {['Breakfast', 'Snack', 'Lunch', 'Dinner'].map((label) => {
              const key = label.toLowerCase() + '_enabled';
              const checked = (form as any)[key];
              return (
                <label key={label} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="rounded border-slate-300 text-slate-900"
                    checked={checked}
                    onChange={(e) => handleChange(key, e.target.checked)}
                    disabled={isLoading}
                  />
                  {label}
                </label>
              );
            })}
            <label className="space-y-1 col-span-2">
              <span>Weekly budget (GBP)</span>
              <input
                type="number"
                className={inputClass}
                placeholder="40"
                value={form.weekly_budget_gbp}
                onChange={(e) => handleChange('weekly_budget_gbp', e.target.value)}
                disabled={isLoading}
              />
            </label>
          </div>
        </Card>
      </div>
    </div>
  );
}
