import { Recipe } from '../../database/entities';

interface SelectOptions {
  avoidNames?: Set<string>;
  costCapPerMeal?: number;
}

export function selectRecipe(candidates: Recipe[], opts: SelectOptions = {}): Recipe | undefined {
  if (!candidates.length) return undefined;
  const filtered = candidates.filter((r) => !(opts.avoidNames?.has(r.name)));
  const pool = filtered.length ? filtered : candidates;

  const sorted = [...pool].sort((a, b) => (Number(a.base_cost_gbp || 0) - Number(b.base_cost_gbp || 0)));

  if (opts.costCapPerMeal !== undefined) {
    const underCap = sorted.filter((r) => Number(r.base_cost_gbp || 0) <= opts.costCapPerMeal!);
    if (underCap.length) {
      return underCap[0];
    }
  }

  // Default: pick cheapest among first half
  const half = Math.max(1, Math.floor(sorted.length / 2));
  const subset = sorted.slice(0, half);
  return subset[Math.floor(Math.random() * subset.length)];
}

export function portionTowardsTarget(
  recipe: Recipe,
  currentDayKcal: number,
  targetDailyKcal: number,
  currentDayProtein: number,
  targetDailyProtein: number,
): number {
  const baseKcal = Number(recipe.base_kcal || 0);
  const baseProtein = Number(recipe.base_protein || 0);
  if (!baseKcal) return 1;

  const remainingKcal = targetDailyKcal - currentDayKcal;
  const remainingProtein = targetDailyProtein - currentDayProtein;
  const kcalRatio = remainingKcal / baseKcal;
  const proteinRatio = baseProtein ? remainingProtein / baseProtein : kcalRatio;
  const rough = (kcalRatio + proteinRatio) / 2;

  const clamped = Math.max(0.75, Math.min(1.5, rough));
  return Math.round(clamped * 4) / 4;
}
