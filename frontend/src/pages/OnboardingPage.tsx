import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { calculateTargets, type ProfileInputs } from '../lib/targets';
import { updateProfile, fetchProfileMe } from '../api/profile';
import { DIET_TYPES, ALLERGENS } from '../constants/dietAllergy';
import { GOALS, INTENSITIES, ACTIVITY_LEVELS } from '../constants/targets';

type Step = 0 | 1 | 2 | 3;

const goals = GOALS;
const intensities = INTENSITIES;
const activityLevels = ACTIVITY_LEVELS;

export function OnboardingPage() {
  const { user, token, setAuth } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [profile, setProfile] = useState<
    ProfileInputs & {
      diet_type?: string;
      allergy_keys: string[];
      breakfast_enabled: boolean;
      snack_enabled: boolean;
      lunch_enabled: boolean;
      dinner_enabled: boolean;
      weekly_budget_gbp?: number;
      max_difficulty: string;
    }
  >({
    age: undefined,
    height_cm: undefined,
    weight_kg: undefined,
    activity_level: 'moderate',
    goal: 'lose_weight',
    goal_intensity: 'moderate',
    diet_type: undefined,
    allergy_keys: [],
    breakfast_enabled: true,
    snack_enabled: true,
    lunch_enabled: true,
    dinner_enabled: true,
    weekly_budget_gbp: undefined,
    max_difficulty: 'easy',
  });

  useEffect(() => {
    const load = async () => {
      if (!token) {
        navigate('/auth/login');
        return;
      }
      try {
        const existing = await fetchProfileMe(token);
        setProfile((prev) => ({
          ...prev,
          age: existing.age ?? prev.age,
          height_cm: existing.height_cm ?? prev.height_cm,
          weight_kg: existing.weight_kg ?? prev.weight_kg,
          activity_level: existing.activity_level || prev.activity_level,
          goal: existing.goal || prev.goal,
          goal_intensity: existing.goal_intensity || prev.goal_intensity,
          diet_type: existing.diet_type ?? prev.diet_type,
          allergy_keys: existing.allergy_keys ?? [],
          breakfast_enabled: existing.breakfast_enabled ?? true,
          snack_enabled: existing.snack_enabled ?? true,
          lunch_enabled: existing.lunch_enabled ?? true,
          dinner_enabled: existing.dinner_enabled ?? true,
          weekly_budget_gbp: existing.weekly_budget_gbp ?? prev.weekly_budget_gbp,
          max_difficulty: existing.max_difficulty || prev.max_difficulty,
        }));
      } catch {
        // ignore, treat as fresh
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [token, navigate]);

  const targets = useMemo(() => {
    return calculateTargets({
      age: profile.age,
      height_cm: profile.height_cm,
      weight_kg: profile.weight_kg,
      activity_level: profile.activity_level,
      goal: profile.goal,
      goal_intensity: profile.goal_intensity,
    });
  }, [profile]);

  const canFinish = !!profile.age && !!profile.height_cm && !!profile.weight_kg;

  const handleToggleAllergy = (key: string) => {
    setProfile((prev) => {
      const exists = prev.allergy_keys.includes(key);
      return {
        ...prev,
        allergy_keys: exists ? prev.allergy_keys.filter((k) => k !== key) : [...prev.allergy_keys, key],
      };
    });
  };

  const handleSave = async () => {
    if (!token) return;
    setSaving(true);
    const toastId = toast.loading('Saving your profile…');
    try {
      await updateProfile(token, {
        age: profile.age,
        height_cm: profile.height_cm,
        weight_kg: profile.weight_kg,
        activity_level: profile.activity_level,
        goal: profile.goal,
        goal_intensity: profile.goal_intensity,
        diet_type: profile.diet_type,
        allergy_keys: profile.allergy_keys,
        breakfast_enabled: profile.breakfast_enabled,
        snack_enabled: profile.snack_enabled,
        lunch_enabled: profile.lunch_enabled,
        dinner_enabled: profile.dinner_enabled,
        weekly_budget_gbp: profile.weekly_budget_gbp,
        max_difficulty: profile.max_difficulty,
      });
      if (user) {
        setAuth(token, { ...user, hasProfile: true });
      }
      toast.success('Profile saved! Redirecting to your plan…', { id: toastId });
      navigate('/plans');
    } catch (e) {
      console.error(e);
      toast.error('Could not save your profile. Please try again.', { id: toastId });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="text-sm text-slate-600">Preparing your onboarding…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-5xl space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.16em] text-emerald-700">Welcome, {user?.email}</p>
            <h1 className="mt-1 text-3xl font-semibold text-slate-900">Let&apos;s tune OverCooked to your body</h1>
            <p className="mt-1 text-sm text-slate-500">
              This takes under a minute. We&apos;ll use it to set your calories and protein targets.
            </p>
          </div>
          <div className="hidden sm:flex flex-col items-end gap-1">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span>Step {step + 1} of 4</span>
              <div className="h-1.5 w-28 rounded-full bg-slate-200 overflow-hidden">
                <div className="h-full bg-emerald-500 transition-all" style={{ width: `${((step + 1) / 4) * 100}%` }} />
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.08)] p-6 md:p-8 grid md:grid-cols-[1.6fr,1.1fr] gap-8">
          <div className="space-y-4">
            {step === 0 && (
              <div className="space-y-4">
                <h2 className="text-base font-semibold text-slate-900">Your basics</h2>
                <p className="text-xs text-slate-500">We&apos;ll use this to estimate your maintenance calories.</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-2">
                  {[
                    { key: 'age', label: 'Age', suffix: 'yrs' },
                    { key: 'height_cm', label: 'Height', suffix: 'cm' },
                    { key: 'weight_kg', label: 'Weight', suffix: 'kg' },
                  ].map((field) => (
                    <div key={field.key}>
                      <label className="block text-[12px] text-slate-600 mb-1">{field.label}</label>
                      <div className="flex items-center rounded-2xl border border-slate-300 bg-slate-50 px-3 py-2 shadow-inner">
                        <input
                          type="number"
                          min={0}
                          value={(profile as any)[field.key] ?? ''}
                          onChange={(e) =>
                            setProfile((prev) => ({
                              ...prev,
                              [field.key]: e.target.value ? Number(e.target.value) : undefined,
                            }))
                          }
                          className="w-full bg-transparent text-base font-medium text-slate-900 outline-none"
                        />
                        <span className="ml-1 text-[11px] text-slate-500">{field.suffix}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {step === 1 && (
              <div className="space-y-4">
                <h2 className="text-sm font-semibold text-slate-900">Goal & training style</h2>
                <p className="text-xs text-slate-500">Tell us what you&apos;re aiming for and how active you are.</p>
                <div className="space-y-3 mt-2">
                  <div>
                    <p className="text-[11px] text-slate-500 mb-1">Goal</p>
                    <div className="flex flex-wrap gap-2">
                      {goals.map((g) => (
                        <button
                          key={g.value}
                          type="button"
                          onClick={() => setProfile((p) => ({ ...p, goal: g.value }))}
                          className={`px-3 py-1.5 rounded-full text-xs border ${
                            profile.goal === g.value
                              ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                              : 'border-slate-300 bg-white text-slate-700 hover:border-slate-400'
                          }`}
                        >
                          {g.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-[11px] text-slate-500 mb-1">Intensity</p>
                    <div className="flex flex-wrap gap-2">
                      {intensities.map((i) => (
                        <button
                          key={i.value}
                          type="button"
                          onClick={() => setProfile((p) => ({ ...p, goal_intensity: i.value }))}
                          className={`px-3 py-1.5 rounded-full text-xs border ${
                            profile.goal_intensity === i.value
                              ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                              : 'border-slate-300 bg-white text-slate-700 hover:border-slate-400'
                          }`}
                        >
                          {i.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-[11px] text-slate-500 mb-1">Activity level</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {activityLevels.map((a) => (
                        <button
                          key={a.value}
                          type="button"
                          onClick={() => setProfile((p) => ({ ...p, activity_level: a.value }))}
                          className={`px-3 py-2 rounded-xl text-xs border text-left ${
                            profile.activity_level === a.value
                              ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                              : 'border-slate-300 bg-white text-slate-700 hover:border-slate-400'
                          }`}
                        >
                          <span className="block font-medium text-[11px] mb-0.5 capitalize">
                            {a.value.replace('_', ' ')}
                          </span>
                          <span className="block text-[10px] text-slate-400">{a.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <h2 className="text-sm font-semibold text-slate-900">Diet & allergies</h2>
                <p className="text-xs text-slate-500">We&apos;ll avoid anything dangerous and respect your diet style.</p>
                <div className="mt-2 space-y-3">
                  <div>
                    <p className="text-[11px] text-slate-500 mb-1">Diet type (optional)</p>
                    <div className="flex flex-wrap gap-2">
                      {DIET_TYPES.map((d) => {
                        const active = profile.diet_type === d.value;
                        return (
                          <button
                            key={d.value}
                            type="button"
                            onClick={() => setProfile((p) => ({ ...p, diet_type: active ? undefined : d.value }))}
                            className={`px-3 py-1.5 rounded-full text-xs border ${
                              active
                                ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                                : 'border-slate-300 bg-white text-slate-700 hover:border-slate-400'
                            }`}
                          >
                            {d.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <p className="text-[11px] text-slate-500 mb-1">Allergies / must-avoid</p>
                    <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto pr-1">
                      {ALLERGENS.map((a) => {
                        const active = profile.allergy_keys.includes(a.value);
                        return (
                          <button
                            key={a.value}
                            type="button"
                            onClick={() => handleToggleAllergy(a.value)}
                            className={`px-3 py-1.5 rounded-full text-[11px] border capitalize ${
                              active
                                ? 'border-red-300 bg-red-50 text-red-700'
                                : 'border-slate-300 bg-white text-slate-700 hover:border-slate-400'
                            }`}
                          >
                            {a.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <h2 className="text-sm font-semibold text-slate-900">Meals & budget</h2>
                <p className="text-xs text-slate-500">Choose which meals to plan and how much to roughly spend per week.</p>
                <div className="mt-2 space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {[
                      { key: 'breakfast_enabled', label: 'Breakfast' },
                      { key: 'snack_enabled', label: 'Snacks' },
                      { key: 'lunch_enabled', label: 'Lunch' },
                      { key: 'dinner_enabled', label: 'Dinner' },
                    ].map((m) => {
                      const active = (profile as any)[m.key];
                      return (
                        <button
                          key={m.key}
                          type="button"
                          onClick={() =>
                            setProfile((p: any) => ({
                              ...p,
                              [m.key]: !p[m.key],
                            }))
                          }
                          className={`px-3 py-1.5 rounded-full text-xs border ${
                            active
                              ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                              : 'border-slate-300 bg-white text-slate-700 hover:border-slate-400'
                          }`}
                        >
                          {m.label}
                        </button>
                      );
                    })}
                  </div>

                  <div>
                    <p className="text-[11px] text-slate-500 mb-1">Weekly grocery budget (optional)</p>
                    <div className="flex items-center rounded-xl border border-slate-300 bg-white px-3 py-2 max-w-xs">
                      <span className="mr-1 text-[11px] text-slate-500">£</span>
                      <input
                        type="number"
                        min={0}
                        value={profile.weekly_budget_gbp ?? ''}
                        onChange={(e) =>
                          setProfile((prev) => ({
                            ...prev,
                            weekly_budget_gbp: e.target.value ? Number(e.target.value) : undefined,
                          }))
                        }
                        className="w-full bg-transparent text-sm text-slate-900 outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <p className="text-[11px] text-slate-500 mb-1">Max recipe difficulty</p>
                    <select
                      value={profile.max_difficulty}
                      onChange={(e) => setProfile((p) => ({ ...p, max_difficulty: e.target.value }))}
                      className="mt-1 w-full max-w-xs rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-300"
                    >
                      <option value="super_easy">Super easy</option>
                      <option value="easy">Easy</option>
                      <option value="medium">Medium</option>
                      <option value="hard">Hard</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            <div className="pt-4 flex justify-between items-center">
              <button
                type="button"
                disabled={step === 0}
                onClick={() => setStep((s) => (s > 0 ? ((s - 1) as Step) : s))}
                className="text-xs text-slate-500 hover:text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                ← Back
              </button>
              {step < 3 ? (
                <button
                  type="button"
                  onClick={() => setStep((s) => ((s + 1) as Step))}
                  className="rounded-full bg-emerald-500 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-600"
                >
                  Continue
                </button>
              ) : (
                <button
                  type="button"
                  disabled={!canFinish || saving}
                  onClick={handleSave}
                  className="rounded-full bg-emerald-500 px-5 py-2 text-xs font-semibold text-white hover:bg-emerald-600 disabled:opacity-60"
                >
                  {saving ? 'Saving…' : 'Finish & view my plan'}
                </button>
              )}
            </div>
          </div>

          <div className="space-y-3 border border-slate-200 rounded-2xl bg-slate-50 p-4">
            <p className="text-[11px] font-medium text-emerald-700 uppercase tracking-[0.2em]">Daily targets (preview)</p>
            <p className="text-xs text-slate-500">Based on your current inputs. OverCooked will aim your weekly plan around these numbers.</p>
            <div className="mt-2 grid grid-cols-3 gap-2">
              <div className="rounded-xl bg-white border border-slate-200 px-3 py-2">
                <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Calories</p>
                <p className="mt-1 text-lg font-semibold text-slate-900">
                  {targets.dailyCalories}
                  <span className="ml-0.5 text-[10px] text-slate-500">kcal</span>
                </p>
                <p className="mt-0.5 text-[10px] text-slate-500">Daily target</p>
              </div>
              <div className="rounded-xl bg-white border border-slate-200 px-3 py-2">
                <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Protein</p>
                <p className="mt-1 text-lg font-semibold text-slate-900">
                  {targets.dailyProtein}
                  <span className="ml-0.5 text-[10px] text-slate-500">g</span>
                </p>
                <p className="mt-0.5 text-[10px] text-slate-500">Approx 1.9g/kg</p>
              </div>
              <div className="rounded-xl bg-white border border-slate-200 px-3 py-2">
                <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Maintenance</p>
                <p className="mt-1 text-lg font-semibold text-slate-900">
                  {targets.maintenanceCalories}
                  <span className="ml-0.5 text-[10px] text-slate-500">kcal</span>
                </p>
                <p className="mt-0.5 text-[10px] text-slate-500">
                  {targets.calorieDelta < 0
                    ? `${targets.calorieDelta} kcal cut`
                    : targets.calorieDelta > 0
                      ? `+${targets.calorieDelta} kcal`
                      : 'Maintain'}
                </p>
              </div>
            </div>
            <div className="mt-3 text-[11px] text-slate-500">
              You can tweak these later in your profile settings. For now, this is enough for the AI coach to start planning.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
