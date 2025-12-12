import { useEffect, useMemo, useState } from 'react';
import { Card } from '../components/shared/Card';
import { useProfile } from '../hooks/useProfile';
import { notify } from '../lib/toast';
import { useAuth } from '../context/AuthContext';
import { calculateTargets } from '../lib/targets';
import { GOALS, INTENSITIES, ACTIVITY_LEVELS } from '../constants/targets';
import { DIET_TYPES, ALLERGENS } from '../constants/dietAllergy';
import { Link } from 'react-router-dom';

const inputClass =
  'w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-300';
const difficultyOptions = ['super_easy', 'easy', 'medium', 'hard'];

export function ProfilePage() {
  const { data, isLoading, isSaving, saveProfile } = useProfile();
  const { logout } = useAuth();
  const [form, setForm] = useState({
    age: '',
    height_cm: '',
    weight_kg: '',
    activity_level: 'moderate',
    goal: 'maintain_weight',
    goal_intensity: 'moderate',
    diet_type: 'none',
    allergies: '',
    breakfast_enabled: true,
    snack_enabled: true,
    lunch_enabled: true,
    dinner_enabled: true,
    weekly_budget_gbp: '',
    max_difficulty: '',
  });

  useEffect(() => {
    if (!data) return;
    setForm({
      age: data.age ? String(data.age) : '',
      height_cm: data.height_cm ? String(data.height_cm) : '',
      weight_kg: data.weight_kg ? String(data.weight_kg) : '',
      activity_level: data.activity_level || 'moderate',
      goal: data.goal || 'maintain_weight',
      goal_intensity: data.goal_intensity || 'moderate',
      diet_type: data.diet_type || 'none',
      allergies: (data.allergy_keys || []).join(', '),
      breakfast_enabled: data.breakfast_enabled ?? true,
      snack_enabled: data.snack_enabled ?? true,
      lunch_enabled: data.lunch_enabled ?? true,
      dinner_enabled: data.dinner_enabled ?? true,
      weekly_budget_gbp: data.weekly_budget_gbp ? String(data.weekly_budget_gbp) : '',
      max_difficulty: data.max_difficulty || 'easy',
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

  const [dirty, setDirty] = useState(false);
  const handleSave = async () => {
    try {
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
        goal_intensity: form.goal_intensity || null,
        max_difficulty: form.max_difficulty || null,
      });
      notify.success('Profile saved');
      setDirty(false);
    } catch (e) {
      notify.error('Could not save profile');
    }
  };
  useEffect(() => {
    if (data) setDirty(false);
  }, [data]);

  useEffect(() => {
    setDirty(true);
  }, [form]);

  const targets = useMemo(
    () =>
      calculateTargets({
        age: form.age ? Number(form.age) : undefined,
        height_cm: form.height_cm ? Number(form.height_cm) : undefined,
        weight_kg: form.weight_kg ? Number(form.weight_kg) : undefined,
        activity_level: form.activity_level || undefined,
        goal: form.goal || undefined,
        goal_intensity: form.goal_intensity || undefined,
      }),
    [form],
  );

  const calorieDeltaLabel =
    targets.calorieDelta === 0
      ? 'Maintain'
      : targets.calorieDelta > 0
        ? `+${targets.calorieDelta} kcal`
        : `${targets.calorieDelta} kcal`;

  const creditBalance = data?.credit ?? 0;
  const creditDisplay = isLoading ? '—' : creditBalance.toString();

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Profile</h1>
          <p className="text-sm text-slate-600">Body data, diet, allergies, and plan defaults.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/auth/set-password"
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            Reset password
          </Link>
          <button
            disabled={!dirty || isSaving}
            onClick={handleSave}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save Profile'}
          </button>
          <button
            onClick={logout}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            Log out
          </button>
        </div>
      </div>

      <Card title="AI Credits" subtitle="Each generation consumes a credit">
        <div className="flex flex-col gap-2">
          <span className="text-4xl font-semibold text-slate-900">{creditDisplay}</span>
          <p className="text-sm text-slate-500">
            {isLoading
              ? 'Loading your balance…'
              : 'Keep an eye on this balance to know how many plan generations are available.'}
          </p>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title="Body & Goals" subtitle="Core data for targets">
          <div className="grid grid-cols-2 gap-3 text-sm text-slate-700">
            <label className="space-y-1">
              <span>Age</span>
              {isLoading ? (
                <div className="h-9 w-full animate-pulse rounded-md bg-slate-200/70" />
              ) : (
                <input
                  type="number"
                  className={inputClass}
                  placeholder="25"
                  value={form.age}
                  onChange={(e) => handleChange('age', e.target.value)}
                />
              )}
            </label>
            <label className="space-y-1">
              <span>Height (cm)</span>
              {isLoading ? (
                <div className="h-9 w-full animate-pulse rounded-md bg-slate-200/70" />
              ) : (
                <input
                  type="number"
                  className={inputClass}
                  placeholder="175"
                  value={form.height_cm}
                  onChange={(e) => handleChange('height_cm', e.target.value)}
                />
              )}
            </label>
            <label className="space-y-1">
              <span>Weight (kg)</span>
              {isLoading ? (
                <div className="h-9 w-full animate-pulse rounded-md bg-slate-200/70" />
              ) : (
                <input
                  type="number"
                  className={inputClass}
                  placeholder="70"
                  value={form.weight_kg}
                  onChange={(e) => handleChange('weight_kg', e.target.value)}
                />
              )}
            </label>
            <label className="space-y-1">
              <span>Activity level</span>
              {isLoading ? (
                <div className="h-9 w-full animate-pulse rounded-md bg-slate-200/70" />
              ) : (
                <select
                  className={inputClass}
                  value={form.activity_level}
                  onChange={(e) => handleChange('activity_level', e.target.value)}
                >
                  {ACTIVITY_LEVELS.map((a) => (
                    <option key={a.value} value={a.value}>
                      {a.label}
                    </option>
                  ))}
                </select>
              )}
            </label>
            <label className="space-y-1 col-span-2">
              <span>Goal</span>
              {isLoading ? (
                <div className="h-9 w-full animate-pulse rounded-md bg-slate-200/70" />
              ) : (
                <select className={inputClass} value={form.goal} onChange={(e) => handleChange('goal', e.target.value)}>
                  {GOALS.map((g) => (
                    <option key={g.value} value={g.value}>
                      {g.label}
                    </option>
                  ))}
                </select>
              )}
            </label>
            <label className="space-y-1 col-span-2">
              <span>Goal intensity</span>
              {isLoading ? (
                <div className="h-9 w-full animate-pulse rounded-md bg-slate-200/70" />
              ) : (
                <select
                  className={inputClass}
                  value={form.goal_intensity}
                  onChange={(e) => handleChange('goal_intensity', e.target.value)}
                >
                  {INTENSITIES.map((i) => (
                    <option key={i.value} value={i.value}>
                      {i.label}
                    </option>
                  ))}
                </select>
              )}
            </label>
          </div>
        </Card>

        <Card title="Diet & Allergies">
          <div className="grid grid-cols-2 gap-3 text-sm text-slate-700">
            <label className="space-y-1 col-span-2">
              <span>Diet type</span>
              {isLoading ? (
                <div className="h-9 w-full animate-pulse rounded-md bg-slate-200/70" />
              ) : (
                <select className={inputClass} value={form.diet_type} onChange={(e) => handleChange('diet_type', e.target.value)}>
                  <option value="none">None</option>
                  {DIET_TYPES.map((d) => (
                    <option key={d.value} value={d.value}>
                      {d.label}
                    </option>
                  ))}
                </select>
              )}
            </label>
            <div className="space-y-2 col-span-2">
              <span className="text-sm text-slate-700">Allergens to avoid</span>
              {isLoading ? (
                <div className="h-9 w-full animate-pulse rounded-md bg-slate-200/70" />
              ) : (
                <div className="flex flex-wrap gap-2">
                  {ALLERGENS.map((al) => {
                    const selected = parsedAllergies.includes(al.value);
                    return (
                      <button
                        key={al.value}
                        type="button"
                        onClick={() => {
                          const next = selected
                            ? parsedAllergies.filter((a) => a !== al.value)
                            : [...parsedAllergies, al.value];
                          handleChange('allergies', next.join(', '));
                        }}
                        className={[
                          'rounded-full border px-3 py-1 text-xs',
                          selected
                            ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
                        ].join(' ')}
                      >
                        {al.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
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
                  />
                  {label}
                </label>
              );
            })}
            <label className="space-y-1 col-span-2">
              <span>Weekly budget (GBP)</span>
              {isLoading ? (
                <div className="h-9 w-full animate-pulse rounded-md bg-slate-200/70" />
              ) : (
                <input
                  type="number"
                  className={inputClass}
                  placeholder="40"
                  value={form.weekly_budget_gbp}
                  onChange={(e) => handleChange('weekly_budget_gbp', e.target.value)}
                />
              )}
            </label>
            <label className="space-y-1 col-span-2">
              <span>Max recipe difficulty</span>
              {isLoading ? (
                <div className="h-9 w-full animate-pulse rounded-md bg-slate-200/70" />
              ) : (
                <select
                  className={inputClass}
                  value={form.max_difficulty}
                  onChange={(e) => handleChange('max_difficulty', e.target.value)}
                >
                  {difficultyOptions.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              )}
            </label>
          </div>
        </Card>

        <Card title="Daily Targets (preview)">
          {isLoading ? (
            <div className="h-32 animate-pulse rounded-xl bg-slate-100" />
          ) : (
            <div className="space-y-3 text-sm text-slate-700">
              <p className="text-xs text-slate-500">
                Based on your current inputs. OverCooked will aim your weekly plan around these numbers.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                  <p className="text-[10px] uppercase tracking-[0.14em] text-slate-500">Calories</p>
                  <p className="mt-1 text-xl font-semibold text-slate-900">
                    {targets.dailyCalories}
                    <span className="ml-1 text-xs text-slate-500">kcal</span>
                  </p>
                  <p className="text-[11px] text-slate-500">Daily target</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                  <p className="text-[10px] uppercase tracking-[0.14em] text-slate-500">Protein</p>
                  <p className="mt-1 text-xl font-semibold text-slate-900">
                    {targets.dailyProtein}
                    <span className="ml-1 text-xs text-slate-500">g</span>
                  </p>
                  <p className="text-[11px] text-slate-500">Approx 1.9g/kg</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                  <p className="text-[10px] uppercase tracking-[0.14em] text-slate-500">Maintenance</p>
                  <p className="mt-1 text-xl font-semibold text-slate-900">
                    {targets.maintenanceCalories}
                    <span className="ml-1 text-xs text-slate-500">kcal</span>
                  </p>
                  <p className="text-[11px] text-slate-500">{calorieDeltaLabel}</p>
                </div>
              </div>
              <p className="text-[11px] text-slate-500">
                You can tweak these later in your profile settings. For now, this is enough for the AI coach to start planning.
              </p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
