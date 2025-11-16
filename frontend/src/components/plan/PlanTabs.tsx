import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import type { PlanRecord } from "../../types";

export function PlanTabs({ plan }: { plan?: { plan: PlanRecord } }) {
  if (!plan) {
    return null;
  }

  const { plan: planRecord } = plan;
  const days = planRecord.planJson;
  if (!days.length) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Daily schedule</CardTitle>
        <CardDescription>Each block shows macros and estimated cost.</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue={days[0]?.day ?? "Day 1"}>
          <TabsList className="flex flex-wrap gap-2">
            {days.map((day) => (
              <TabsTrigger key={day.day} value={day.day}>
                {day.day}
              </TabsTrigger>
            ))}
          </TabsList>
          {days.map((day) => (
            <TabsContent key={day.day} value={day.day}>
              <div className="grid gap-3">
                {day.meals.map((meal) => (
                  <div key={meal.name} className="rounded-lg border p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold">{meal.mealType}</p>
                        <p className="text-base">{meal.name}</p>
                      </div>
                      <div className="flex gap-2 text-sm text-muted-foreground">
                        <Badge variant="success">{meal.calories} kcal</Badge>
                        <Badge variant="outline">{meal.protein} g protein</Badge>
                        <Badge variant="outline">${(meal.costCents / 100).toFixed(2)}</Badge>
                      </div>
                    </div>
                    {meal.notes && <p className="mt-2 text-sm text-muted-foreground">{meal.notes}</p>}
                  </div>
                ))}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}
