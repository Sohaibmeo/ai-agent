import { useMemo, useState } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { cn } from "../../lib/utils";
import type { FavouriteMeal, FitnessGoal, UserProfilePayload, WorkoutFrequency } from "../../types";

const workoutOptions: { label: string; value: WorkoutFrequency; description: string; activityLevel: string }[] = [
  { label: "1-2 sessions", value: "1-2", description: "Light routine", activityLevel: "light" },
  { label: "3-4 sessions", value: "3-4", description: "Moderate training", activityLevel: "moderate" },
  { label: "5-6 sessions", value: "5-6", description: "Intense schedule", activityLevel: "active" },
  { label: "Every day", value: "7+", description: "Athlete mode", activityLevel: "very-active" },
];

const goalOptions: { label: string; value: FitnessGoal; blurb: string }[] = [
  { label: "Fat loss", value: "LOSE_FAT", blurb: "Calorie deficit with high protein" },
  { label: "Lean & toned", value: "MAINTAIN", blurb: "Balanced macros for recomposition" },
  { label: "Muscle gain", value: "GAIN_MUSCLE", blurb: "Calorie surplus & heavy protein" },
  { label: "Recomp", value: "RECOMP", blurb: "Build muscle while trimming fat" },
];

const StepTitle = ({ title, subtitle }: { title: string; subtitle?: string }) => (
  <div className="space-y-1 text-left">
    <p className="text-xs uppercase tracking-wide text-muted-foreground">Step</p>
    <h2 className="text-2xl font-semibold">{title}</h2>
    {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
  </div>
);

const NumberSelector = ({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
}) => (
  <div className="rounded-2xl border bg-white p-6 shadow-sm">
    <p className="text-sm text-muted-foreground">{label}</p>
    <div className="flex items-baseline gap-2">
      <input
        type="number"
        className="w-24 border-none bg-transparent text-4xl font-semibold focus-visible:outline-none"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        min={min}
        max={max}
      />
      <span className="text-sm text-muted-foreground">{label.includes("cm") ? "cm" : label.includes("kg") ? "kg" : "yrs"}</span>
    </div>
    <input
      className="mt-4 w-full"
      type="range"
      min={min}
      max={max}
      step={step ?? 1}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
    />
  </div>
);

export function OnboardingWizard({
  isSubmitting,
  onComplete,
}: {
  isSubmitting: boolean;
  onComplete: (payload: UserProfilePayload) => Promise<void>;
}) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [region, setRegion] = useState<"UK">("UK");
  const [age, setAge] = useState(25);
  const [heightCm, setHeightCm] = useState(170);
  const [weightKg, setWeightKg] = useState(70);
  const [weeklyBudget, setWeeklyBudget] = useState(60);
  const [workoutFrequency, setWorkoutFrequency] = useState<WorkoutFrequency>("3-4");
  const [activityLevel, setActivityLevel] = useState("moderate");
  const [goal, setGoal] = useState<FitnessGoal>("GAIN_MUSCLE");
  const [mealUpload, setMealUpload] = useState("");
  const [favouriteMeals, setFavouriteMeals] = useState<string>("");
  const [dietaryPreferences, setDietaryPreferences] = useState("halal");
  const [exclusions, setExclusions] = useState("pork");

  const favouriteMealObjects: FavouriteMeal[] = useMemo(() => {
    if (!favouriteMeals.trim()) return [];
    return favouriteMeals.split(",").map((entry) => ({ name: entry.trim() })).filter((item) => item.name);
  }, [favouriteMeals]);

  const dietaryPreferenceArray = useMemo(
    () => dietaryPreferences.split(",").map((item) => item.trim()).filter(Boolean),
    [dietaryPreferences],
  );

  const exclusionArray = useMemo(
    () => exclusions.split(",").map((item) => item.trim()).filter(Boolean),
    [exclusions],
  );

  const steps = [
    {
      key: "region",
      title: "Where are you based?",
      content: (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">We currently support the United Kingdom.</p>
          <Button
            variant={region === "UK" ? "default" : "outline"}
            className="w-full justify-between"
            onClick={() => setRegion("UK")}
          >
            United Kingdom
            {region === "UK" && <span className="text-xs">Selected</span>}
          </Button>
        </div>
      ),
    },
    {
      key: "bio",
      title: "Let’s capture your stats",
      content: (
        <div className="grid gap-6 md:grid-cols-3">
          <NumberSelector label="Age" value={age} min={16} max={75} onChange={setAge} />
          <NumberSelector label="Height (cm)" value={heightCm} min={140} max={210} onChange={setHeightCm} />
          <NumberSelector label="Weight (kg)" value={weightKg} min={40} max={150} onChange={setWeightKg} />
        </div>
      ),
    },
    {
      key: "activity",
      title: "How often do you train?",
      content: (
        <div className="grid gap-3 md:grid-cols-2">
          {workoutOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => {
                setWorkoutFrequency(option.value);
                setActivityLevel(option.activityLevel);
              }}
              className={cn(
                "rounded-2xl border p-4 text-left transition focus:outline-none",
                workoutFrequency === option.value ? "border-primary bg-primary/10" : "hover:border-primary",
              )}
            >
              <p className="font-semibold">{option.label}</p>
              <p className="text-sm text-muted-foreground">{option.description}</p>
            </button>
          ))}
        </div>
      ),
    },
    {
      key: "goal",
      title: "Pick your goal",
      content: (
        <div className="grid gap-3 md:grid-cols-2">
          {goalOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => setGoal(option.value)}
              className={cn(
                "rounded-2xl border p-4 text-left",
                goal === option.value ? "border-primary bg-primary/10" : "hover:border-primary",
              )}
            >
              <p className="font-semibold">{option.label}</p>
              <p className="text-sm text-muted-foreground">{option.blurb}</p>
            </button>
          ))}
        </div>
      ),
    },
    {
      key: "mealUpload",
      title: "Share today’s meals (optional)",
      subtitle: "Give the adaptive learner a head start.",
      content: (
        <Textarea
          value={mealUpload}
          onChange={(e) => setMealUpload(e.target.value)}
          placeholder="e.g. Overnight oats, peri-peri chicken wrap, protein shake"
        />
      ),
    },
    {
      key: "favourites",
      title: "Favourite meals (optional)",
      content: (
        <Textarea
          value={favouriteMeals}
          onChange={(e) => setFavouriteMeals(e.target.value)}
          placeholder="Comma separated list, e.g. Chicken tikka wrap, Halloumi bowl"
        />
      ),
    },
    {
      key: "preferences",
      title: "Food preferences",
      subtitle: "Tell us what to prioritise and what to avoid",
      content: (
        <div className="space-y-4">
          <div>
            <p className="text-sm mb-1">Dietary preferences</p>
            <Input value={dietaryPreferences} onChange={(e) => setDietaryPreferences(e.target.value)} />
          </div>
          <div>
            <p className="text-sm mb-1">Exclusions</p>
            <Textarea value={exclusions} onChange={(e) => setExclusions(e.target.value)} rows={2} />
          </div>
          <div>
            <p className="text-sm mb-1">Weekly food budget (£)</p>
            <Input
              type="number"
              value={weeklyBudget}
              onChange={(e) => setWeeklyBudget(Number(e.target.value))}
            />
          </div>
        </div>
      ),
    },
    {
      key: "review",
      title: "Review & submit",
      content: (
        <div className="space-y-3 rounded-2xl border bg-white p-4">
          <p className="text-sm">Name</p>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
          <p className="text-sm">Email</p>
          <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
          <div className="text-sm text-muted-foreground">
            <p>Region: {region}</p>
            <p>Age/Height/Weight: {age}y · {heightCm}cm · {weightKg}kg</p>
            <p>Training: {workoutFrequency} sessions ({activityLevel})</p>
            <p>Goal: {goalOptions.find((g) => g.value === goal)?.label}</p>
            <p>Weekly budget: £{weeklyBudget}</p>
            <p>Preferences: {dietaryPreferenceArray.join(", ") || "None"}</p>
            <p>Exclusions: {exclusionArray.join(", ") || "None"}</p>
          </div>
        </div>
      ),
    },
  ];

  const isLast = step === steps.length - 1;

  const handleNext = () => {
    if (!isLast) setStep((prev) => prev + 1);
  };

  const handleBack = () => {
    if (step > 0) setStep((prev) => prev - 1);
  };

  const handleSubmit = async () => {
    const payload: UserProfilePayload = {
      name,
      email,
      region,
      age,
      heightCm,
      weightKg,
      activityLevel,
      workoutFrequency,
      goal,
      weeklyBudget,
      dietaryPreferences: dietaryPreferenceArray,
      excludedIngredients: exclusionArray,
      favouriteMeals: favouriteMealObjects,
      mealUpload: mealUpload ? { type: "text", content: mealUpload } : undefined,
      fitnessGoal: goal,
    } as UserProfilePayload;
    await onComplete(payload);
  };

  const currentStep = steps[step];

  return (
    <div className="rounded-3xl bg-white/80 p-6 shadow-lg">
      <div className="mb-6">
        <StepTitle title={currentStep.title} subtitle={currentStep.subtitle} />
      </div>
      <div className="min-h-[220px]">{currentStep.content}</div>
      <div className="mt-6 flex items-center justify-between">
        <button
          className={cn("text-sm text-muted-foreground", step === 0 && "invisible")}
          onClick={handleBack}
        >
          Back
        </button>
        <div className="space-x-3">
          {!isLast && (
            <Button variant="secondary" onClick={handleNext}>
              Next
            </Button>
          )}
          {isLast && (
            <Button onClick={handleSubmit} disabled={isSubmitting || !name || !email}>
              {isSubmitting ? "Generating..." : "Generate weekly plan"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
