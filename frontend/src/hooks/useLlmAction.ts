import { useCallback } from 'react';
import { useAgentPipeline } from './useAgentPipeline';
import type { AgentRunKind } from './useAgentPipeline';
import { defaultStepsForKind } from '../config/agentSteps';

type LlmActionStep = { id: string; label: string };

type LlmActionOptions = {
  title?: string;
  subtitle?: string;
  steps?: LlmActionStep[];
  kind?: AgentRunKind;
};

export const useLlmAction = (opts?: LlmActionOptions) => {
  const { startRun, updateStep, endRun, setError } = useAgentPipeline();
  const kind: AgentRunKind = opts?.kind ?? 'generic-llm';

  const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));
  const beat = 750;

  const runWithLlmLoader = useCallback(
    async <T,>(fn: () => Promise<T>): Promise<T> => {
      const steps =
        opts?.steps && opts.steps.length ? opts.steps : defaultStepsForKind(kind);

      startRun(kind, {
        title: opts?.title ?? 'Talking to your AI coach...',
        subtitle: opts?.subtitle ?? 'This usually takes a few seconds.',
        steps: steps.map((s, idx) => ({
          id: s.id,
          label: s.label,
          status: idx === 0 ? 'active' : 'pending',
        })),
      });

      try {
        const runner = fn();

        const driveGeneric = async () => {
          await sleep(140);
          updateStep('sending', 'done', undefined, undefined, 18);
          updateStep('thinking', 'active', undefined, undefined, 36);
          const result = await runner;
          updateStep('thinking', 'done', undefined, undefined, 64);
          updateStep('applying', 'active', undefined, undefined, 80);
          await sleep(160);
          updateStep('applying', 'done', undefined, undefined, 92);
          updateStep('finishing', 'done', undefined, undefined, 100);
          return result;
        };

        const driveGenerateWeek = async () => {
          updateStep('prepare-profile', 'active', undefined, undefined, 6);
          await sleep(beat);
          updateStep('prepare-profile', 'done', undefined, undefined, 12);
          updateStep('profile-guardrails', 'active', undefined, undefined, 20);
          await sleep(beat);
          updateStep('profile-guardrails', 'done', undefined, undefined, 26);
          updateStep('draft-week', 'active', undefined, undefined, 32);
          await sleep(beat);
          updateStep('draft-week', 'done', undefined, undefined, 42);
          updateStep('generate-days', 'active', 'Cooking daily menus…', undefined, 52);
          const result = await runner;
          updateStep('generate-days', 'done', undefined, undefined, 76);
          updateStep('hydrate-recipes', 'active', undefined, undefined, 82);
          await sleep(beat);
          updateStep('hydrate-recipes', 'done', undefined, undefined, 86);
          updateStep('save-plan', 'active', undefined, undefined, 90);
          await sleep(beat);
          updateStep('save-plan', 'done', undefined, undefined, 94);
          updateStep('shopping-list', 'active', undefined, undefined, 97);
          await sleep(beat);
          updateStep('shopping-list', 'done', undefined, undefined, 99);
          updateStep('finishing', 'done', undefined, undefined, 100);
          return result;
        };

        const driveReview = async () => {
          updateStep('interpret-request', 'active', undefined, undefined, 8);
          await sleep(beat);
          updateStep('interpret-request', 'done', undefined, undefined, 16);
          updateStep('plan-guardrails', 'active', undefined, undefined, 26);
          await sleep(beat);
          updateStep('plan-guardrails', 'done', undefined, undefined, 32);
          updateStep('plan-changes', 'active', 'Planning safe changes…', undefined, 44);
          const result = await runner;
          updateStep('plan-changes', 'done', undefined, undefined, 54);
          updateStep('apply-changes', 'active', undefined, undefined, 64);
          await sleep(beat);
          updateStep('apply-changes', 'done', undefined, undefined, 74);
          updateStep('recompute', 'active', undefined, undefined, 82);
          await sleep(beat);
          updateStep('recompute', 'done', undefined, undefined, 90);
          updateStep('shopping-refresh', 'active', undefined, undefined, 95);
          await sleep(beat);
          updateStep('shopping-refresh', 'done', undefined, undefined, 98);
          updateStep('finishing', 'done', undefined, undefined, 100);
          return result;
        };

        const result =
          kind === 'generate-week'
            ? await driveGenerateWeek()
            : kind === 'review-plan' || kind === 'adjust-recipe'
              ? await driveReview()
              : await driveGeneric();

        setTimeout(() => {
          endRun();
        }, 300);

        return result;
      } catch (err: any) {
        console.error('LLM action failed', err);
        setError(err?.message || 'Something went wrong while talking to the AI.');

        setTimeout(() => {
          endRun();
        }, 1200);

        throw err;
      }
    },
    [startRun, updateStep, endRun, setError, opts?.title, opts?.subtitle, opts?.steps, kind],
  );

  return { runWithLlmLoader };
};
