import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import type { PlanRecord } from "../../types";

type Props = {
  history: PlanRecord[];
  onSelect: (item: PlanRecord) => void;
};

export function PlanHistory({ history, onSelect }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent plans</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {history.length === 0 && <p className="text-sm text-muted-foreground">No plans yet.</p>}
        {history.map((item) => (
          <div key={item.id} className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="text-sm font-medium">{item.summary}</p>
              <p className="text-xs text-muted-foreground">
                {format(new Date(item.createdAt), "MMM d, h:mma")} · ${(item.totalCostCents / 100).toFixed(2)}
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => onSelect(item)}>
              View
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
