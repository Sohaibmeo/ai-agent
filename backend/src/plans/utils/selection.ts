import { Recipe } from '../../database/entities';

interface SelectOptions {
  avoidNames?: Set<string>;
  maxPerWeek?: number;
  budgetCap?: number;
}

export function selectRecipe(candidates: Recipe[], opts: SelectOptions = {}): Recipe | undefined {
  if (!candidates.length) return undefined;
  const filtered = candidates.filter((r) => !(opts.avoidNames?.has(r.name)));
  const pool = filtered.length ? filtered : candidates;

  // Simple budget-aware pick: sort by cost if cap given, else random-ish pick biased to cheaper.
  const sorted = [...pool].sort((a, b) => (Number(a.base_cost_gbp || 0) - Number(b.base_cost_gbp || 0)));
  // Pick from cheapest half to enforce some budget awareness.
  const half = Math.max(1, Math.floor(sorted.length / 2));
  const subset = sorted.slice(0, half);
  return subset[Math.floor(Math.random() * subset.length)];
}

export function portionTowardsTarget(
  recipe: Recipe,
  currentDayKcal: number,
  targetDailyKcal: number,
): number {
  const remaining = targetDailyKcal - currentDayKcal;
  const base = Number(recipe.base_kcal || 0);
  if (!base) return 1;
  const rough = remaining / base;
  // Clamp to sensible multipliers
  if (rough < 0.75) return 0.75;
  if (rough > 1.5) return 1.5;
  return Math.round(rough * 4) / 4; // snap to 0.25 increments
}
