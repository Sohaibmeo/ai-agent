import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Button } from "../ui/button";
import { Select } from "../ui/select";
import { Textarea } from "../ui/textarea";
import type { UserProfilePayload } from "../../types";

const formSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  heightCm: z.number().positive(),
  weightKg: z.number().positive(),
  age: z.number().positive(),
  weeklyBudget: z.number().positive(),
  activityLevel: z.string(),
  fitnessGoal: z.enum(["LOSE_FAT", "MAINTAIN", "GAIN_MUSCLE"]),
  dietaryPreferences: z.string().default(""),
  excludedIngredients: z.string().default(""),
});

export type ProfileFormValues = z.input<typeof formSchema>;

const activityOptions = [
  { value: "sedentary", label: "Sedentary" },
  { value: "light", label: "Light (1-2 workouts)" },
  { value: "moderate", label: "Moderate (3-4 workouts)" },
  { value: "active", label: "Active (5+ workouts)" },
  { value: "very-active", label: "Athlete" },
];

const goalOptions = [
  { value: "LOSE_FAT", label: "Lean / Fat loss" },
  { value: "MAINTAIN", label: "Maintain" },
  { value: "GAIN_MUSCLE", label: "Gain muscle" },
];

type Props = {
  isSubmitting: boolean;
  onSubmit: (payload: UserProfilePayload) => Promise<void>;
};

export function ProfileForm({ isSubmitting, onSubmit }: Props) {
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      heightCm: 170,
      weightKg: 70,
      age: 25,
      weeklyBudget: 60,
      activityLevel: "moderate",
      fitnessGoal: "GAIN_MUSCLE",
      dietaryPreferences: "halal",
      excludedIngredients: "pork",
    },
  });

  const parseList = (value?: string) =>
    (value ?? "")
      .split(",")
      .map((item) => item.trim())
      .filter((item): item is string => Boolean(item));

  const handleSubmit = form.handleSubmit(async (values) => {
    const { dietaryPreferences, excludedIngredients, ...rest } = values;
    const payload: UserProfilePayload = {
      name: rest.name,
      email: rest.email,
      heightCm: rest.heightCm,
      weightKg: rest.weightKg,
      age: rest.age,
      weeklyBudget: rest.weeklyBudget,
      activityLevel: rest.activityLevel,
      fitnessGoal: rest.fitnessGoal,
      dietaryPreferences: parseList(dietaryPreferences),
      excludedIngredients: parseList(excludedIngredients),
    };

    await onSubmit(payload);
  });

  const errors = form.formState.errors;

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="name">Name</Label>
          <Input id="name" {...form.register("name")} />
          <ErrorText message={errors.name?.message} />
        </div>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" {...form.register("email")} />
          <ErrorText message={errors.email?.message} />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <Label htmlFor="height">Height (cm)</Label>
          <Input id="height" type="number" {...form.register("heightCm", { valueAsNumber: true })} />
          <ErrorText message={errors.heightCm?.message} />
        </div>
        <div>
          <Label htmlFor="weight">Weight (kg)</Label>
          <Input id="weight" type="number" {...form.register("weightKg", { valueAsNumber: true })} />
          <ErrorText message={errors.weightKg?.message} />
        </div>
        <div>
          <Label htmlFor="age">Age</Label>
          <Input id="age" type="number" {...form.register("age", { valueAsNumber: true })} />
          <ErrorText message={errors.age?.message} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="budget">Weekly Food Budget (in USD)</Label>
          <Input id="budget" type="number" step="1" {...form.register("weeklyBudget", { valueAsNumber: true })} />
          <ErrorText message={errors.weeklyBudget?.message} />
        </div>
        <div>
          <Label>Fitness Goal</Label>
          <Select {...form.register("fitnessGoal")} options={goalOptions} />
          <ErrorText message={errors.fitnessGoal?.message} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Activity Level</Label>
          <Select {...form.register("activityLevel")} options={activityOptions} />
          <ErrorText message={errors.activityLevel?.message} />
        </div>
        <div>
          <Label>Dietary Preferences (comma separated)</Label>
          <Input {...form.register("dietaryPreferences")} placeholder="halal, vegetarian" />
        </div>
      </div>

      <div>
        <Label>Excluded Foods</Label>
        <Textarea rows={2} {...form.register("excludedIngredients")} placeholder="pork, shellfish" />
      </div>

      <Button className="w-full" type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Saving & Generating..." : "Generate Weekly Plan"}
      </Button>
    </form>
  );
}

function ErrorText({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-xs text-rose-500">{message}</p>;
}
