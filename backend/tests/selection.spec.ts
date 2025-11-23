import { selectRecipe, portionTowardsTarget } from '../src/plans/utils/selection';

const makeRecipe = (id: string, cost: number, kcal = 300, protein = 25) => ({
  id,
  name: id,
  meal_slot: 'lunch',
  base_cost_gbp: cost,
  base_kcal: kcal,
  base_protein: protein,
} as any);

describe('selection utils', () => {
  it('selects cheaper recipes under cap', () => {
    const r1 = makeRecipe('r1', 1.0);
    const r2 = makeRecipe('r2', 3.0);
    const pick = selectRecipe([r2, r1], { costCapPerMeal: 2 });
    expect(pick?.id).toBe('r1');
  });

  it('portions toward targets within bounds', () => {
    const recipe = makeRecipe('r', 1, 400, 30);
    const portion = portionTowardsTarget(recipe, 0, 2000, 0, 120);
    expect(portion).toBeGreaterThanOrEqual(0.75);
    expect(portion).toBeLessThanOrEqual(1.5);
  });
});
