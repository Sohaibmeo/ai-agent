export const PROFILE_LIMITS = {
  age: { min: 13, max: 100, label: 'Age' },
  height_cm: { min: 120, max: 230, label: 'Height' },
  weight_kg: { min: 35, max: 300, label: 'Weight' },
  weekly_budget_gbp: { min: 10, max: 500, label: 'Weekly budget' },
} as const;

type LimitKey = keyof typeof PROFILE_LIMITS;

export function parseOptionalNumber(value: unknown) {
  if (value === '' || value === null || value === undefined) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function validateOptionalNumberRange(key: LimitKey, value: unknown) {
  const parsed = parseOptionalNumber(value);
  if (parsed === undefined) return null;

  const limit = PROFILE_LIMITS[key];
  if (parsed < limit.min || parsed > limit.max) {
    return `${limit.label} must be between ${limit.min} and ${limit.max}.`;
  }

  return null;
}

export function validateRequiredNumberRange(key: LimitKey, value: unknown) {
  const parsed = parseOptionalNumber(value);
  if (parsed === undefined) return `${PROFILE_LIMITS[key].label} is required.`;
  return validateOptionalNumberRange(key, parsed);
}

export function validateProfileBasics(input: {
  age?: unknown;
  height_cm?: unknown;
  weight_kg?: unknown;
}) {
  return (
    validateRequiredNumberRange('age', input.age) ||
    validateRequiredNumberRange('height_cm', input.height_cm) ||
    validateRequiredNumberRange('weight_kg', input.weight_kg)
  );
}

export function validateWeeklyBudget(value: unknown) {
  return validateOptionalNumberRange('weekly_budget_gbp', value);
}
