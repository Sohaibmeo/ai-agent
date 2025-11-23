import { calculateTargets } from '../src/plans/utils/profile-targets';

describe('calculateTargets', () => {
  it('returns sensible defaults', () => {
    const t = calculateTargets({});
    expect(t.dailyCalories).toBeGreaterThan(1500);
    expect(t.dailyProtein).toBeGreaterThan(50);
  });

  it('adjusts for goal lose_weight', () => {
    const maintain = calculateTargets({ weight_kg: 80, height_cm: 180, age: 30, activity_level: 'moderate' });
    const cut = calculateTargets({ weight_kg: 80, height_cm: 180, age: 30, activity_level: 'moderate', goal: 'lose_weight' });
    expect(cut.dailyCalories).toBeLessThan(maintain.dailyCalories);
  });
});
