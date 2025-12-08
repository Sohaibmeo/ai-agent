export type AgentPipelineKind = 'generate-week' | 'review-plan' | 'adjust-recipe' | 'generic-llm';

export type AgentStepTemplate = {
  id: string;
  label: string;
  detail?: string;
  status?: 'pending' | 'active' | 'done' | 'error';
  progressHint?: number;
  startedAt?: string;
};

const generateWeekSteps: AgentStepTemplate[] = [
  { id: 'prepare-profile', label: 'Gathering your nutrition profile', detail: 'Syncing goals, macros, and budget' },
  { id: 'profile-guardrails', label: 'Locking guardrails', detail: 'Respecting diet rules, allergens, and difficulty' },
  { id: 'draft-week', label: 'Sketching the week', detail: 'Laying out slots for each day' },
  { id: 'generate-days', label: 'Cooking daily menus', detail: 'Designing balanced days with the coach' },
  { id: 'hydrate-recipes', label: 'Writing recipes & methods', detail: 'Drafting instructions and ingredients' },
  { id: 'save-plan', label: 'Saving plan & totals', detail: 'Recomputing macros and costs' },
  { id: 'shopping-list', label: 'Building shopping list', detail: 'Rolling ingredients into groceries' },
  { id: 'finishing', label: 'Finishing touches', detail: 'Final checks before serving' },
];

const reviewSteps: AgentStepTemplate[] = [
  { id: 'interpret-request', label: 'Interpreting your request', detail: 'Parsing intent and targets' },
  { id: 'plan-guardrails', label: 'Checking guardrails & budget', detail: 'Keeping macros and rules safe' },
  { id: 'plan-changes', label: 'Planning changes', detail: 'Sequencing safe edits' },
  { id: 'apply-changes', label: 'Applying changes', detail: 'Editing meals and ingredients' },
  { id: 'recompute', label: 'Recomputing nutrition', detail: 'Updating macros and totals' },
  { id: 'shopping-refresh', label: 'Refreshing shopping list', detail: 'Syncing groceries with updates' },
  { id: 'finishing', label: 'Final checks', detail: 'Wrapping up the review' },
];

const genericLlmSteps: AgentStepTemplate[] = [
  { id: 'sending', label: 'Sending request', detail: 'Shipping your message to the agent' },
  { id: 'thinking', label: 'AI thinking', detail: 'Reasoning through the next steps' },
  { id: 'applying', label: 'Applying updates', detail: 'Merging changes into your plan' },
  { id: 'finishing', label: 'Finishing up', detail: 'Tidying edges before closing' },
];

const adjustRecipeSteps: AgentStepTemplate[] = [
  { id: 'interpret-request', label: 'Understanding recipe tweak', detail: 'Reading your adjustment note' },
  { id: 'plan-guardrails', label: 'Checking constraints', detail: 'Keeping dietary rules in view' },
  { id: 'plan-changes', label: 'Planning tweaks', detail: 'Choosing safe substitutions' },
  { id: 'apply-changes', label: 'Applying tweaks', detail: 'Updating the recipe' },
  { id: 'recompute', label: 'Recomputing nutrition', detail: 'Updating macros and costs' },
  { id: 'shopping-refresh', label: 'Refreshing shopping list', detail: 'Aligning groceries to the tweak' },
  { id: 'finishing', label: 'Final checks', detail: 'Serving the adjusted recipe' },
];

const templates: Record<AgentPipelineKind, AgentStepTemplate[]> = {
  'generate-week': generateWeekSteps,
  'review-plan': reviewSteps,
  'adjust-recipe': adjustRecipeSteps,
  'generic-llm': genericLlmSteps,
};

export const defaultStepsForKind = (
  kind: AgentPipelineKind,
  overrides?: AgentStepTemplate[],
): AgentStepTemplate[] => {
  const base = overrides && overrides.length ? overrides : templates[kind] || genericLlmSteps;
  return base.map((step, idx) => ({
    ...step,
    status: step.status ?? (idx === 0 ? 'active' : 'pending'),
  }));
};
