import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import type { PlanRecord } from "../../types";

type PlanShape = {
  plan: PlanRecord;
  macros?: {
    calories: number;
    proteinGrams: number;
  };
};

type Props = {
  plan?: PlanShape;
  isGenerating: boolean;
};

export function PlanOverview({ plan, isGenerating }: Props) {
  if (!plan) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle>Weekly plan preview</CardTitle>
          <CardDescription>Fill the form to generate your first plan.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const { plan: planRecord, macros } = plan;
  const calories = macros?.calories ?? planRecord.totalCalories;
  const protein = macros?.proteinGrams ?? planRecord.totalProtein;
  const cost = planRecord.totalCostCents / 100;

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Weekly plan</CardTitle>
        <CardDescription>{planRecord.summary}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <Metric label="Calories" value={`${calories.toLocaleString()} kcal`} />
          <Metric label="Protein" value={`${protein} g`} />
          <Metric label="Budget" value={`$${cost.toFixed(2)}`} />
        </div>
        {isGenerating && <Badge variant="outline">Updating plan...</Badge>}
      </CardContent>
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-muted/30 p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-2xl font-semibold">{value}</p>
    </div>
  );
}
