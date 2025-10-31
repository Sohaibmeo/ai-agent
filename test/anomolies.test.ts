import { describe, it, expect } from "vitest";
import anomalies from "../src/steps/anomalies";

it("flags category when last7 > 2× median", async () => {
  const s = {
    categorized: [
      { date:"2025-10-01", category:"Dining", amount:-5 },
      { date:"2025-10-08", category:"Dining", amount:-5 },
      { date:"2025-10-15", category:"Dining", amount:-5 },
      { date:"2025-10-29", category:"Dining", amount:-30 } // last 7 days spike
    ]
  };
  const { anomOut } = await anomalies(s as any);
  expect(anomOut[0].category).toBe("Dining");
});
