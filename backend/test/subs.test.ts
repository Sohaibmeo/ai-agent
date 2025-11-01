import { describe, it, expect } from "vitest";
import subs from "../src/steps/subs.ts";

it("detects monthlyish subscription with tolerant cadence", async () => {
  const s = {
    categorized: [
      { date:"2025-09-05", merchant:"Spotify", amount:-9.99 },
      { date:"2025-10-05", merchant:"Spotify", amount:-9.99 },
      { date:"2025-10-31", merchant:"Spotify", amount:-9.99 }
    ]
  };
  const { subOut } = await subs(s as any);
  expect(subOut[0].merchant).toBe("Spotify");
});
