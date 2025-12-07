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
          const detailCycle = ['Warming up the model', 'Thinking', 'Drafting changes'];
          let tick = 0;
          const interval = setInterval(() => {
            tick += 1;
            const hint = Math.min(96, 18 + tick * 6);
            const detail = detailCycle[tick % detailCycle.length];
            updateStep('thinking', 'active', detail, undefined, hint);
          }, 900);

          await sleep(140);
          updateStep('sending', 'done', undefined, undefined, 18);
          updateStep('thinking', 'active', undefined, undefined, 36);
          const result = await runner;
          updateStep('thinking', 'done', undefined, undefined, 64);
          updateStep('applying', 'active', undefined, undefined, 80);
          await sleep(160);
          updateStep('applying', 'done', undefined, undefined, 92);
          updateStep('finishing', 'done', undefined, undefined, 100);
          clearInterval(interval);
          return result;
        };

        const driveGenerateWeek = async () => {
          const dayCycle = [
            'Balancing protein targets',
            'Picking budget-friendly options',
            'Shuffling breakfast and snacks',
            'Writing quick instructions',
            'Checking macros for today',
          ];
          let tick = 0;
          const interval = setInterval(() => {
            tick += 1;
            const hint = Math.min(86, 52 + tick * 4);
            const detail = dayCycle[tick % dayCycle.length];
            updateStep('generate-days', 'active', detail, undefined, hint);
          }, 1000);

          updateStep('prepare-profile', 'active', undefined, undefined, 6);
          await sleep(140);
          updateStep('prepare-profile', 'done', undefined, undefined, 12);
          updateStep('profile-guardrails', 'active', undefined, undefined, 20);
          await sleep(140);
          updateStep('profile-guardrails', 'done', undefined, undefined, 26);
          updateStep('draft-week', 'active', undefined, undefined, 32);
          await sleep(180);
          updateStep('draft-week', 'done', undefined, undefined, 42);
          updateStep('generate-days', 'active', undefined, undefined, 52);
          const result = await runner;
          updateStep('generate-days', 'done', undefined, undefined, 76);
          updateStep('hydrate-recipes', 'active', undefined, undefined, 82);
          await sleep(140);
          updateStep('hydrate-recipes', 'done', undefined, undefined, 86);
          updateStep('save-plan', 'active', undefined, undefined, 90);
          await sleep(100);
          updateStep('save-plan', 'done', undefined, undefined, 94);
          updateStep('shopping-list', 'active', undefined, undefined, 97);
          await sleep(100);
          updateStep('shopping-list', 'done', undefined, undefined, 99);
          updateStep('finishing', 'done', undefined, undefined, 100);
          clearInterval(interval);
          return result;
        };

        const driveReview = async () => {
          const detailCycle = [
            'Re-reading your note',
            'Checking budget and macros',
            'Mapping safe changes',
            'Preparing updates',
          ];
          let tick = 0;
          const interval = setInterval(() => {
            tick += 1;
            const hint = Math.min(92, 36 + tick * 6);
            const detail = detailCycle[tick % detailCycle.length];
            updateStep('plan-changes', 'active', detail, undefined, hint);
          }, 900);

          updateStep('interpret-request', 'active', undefined, undefined, 8);
          await sleep(140);
          updateStep('interpret-request', 'done', undefined, undefined, 16);
          updateStep('plan-guardrails', 'active', undefined, undefined, 26);
          await sleep(140);
          updateStep('plan-guardrails', 'done', undefined, undefined, 32);
          updateStep('plan-changes', 'active', undefined, undefined, 44);
          const result = await runner;
          updateStep('plan-changes', 'done', undefined, undefined, 54);
          updateStep('apply-changes', 'active', undefined, undefined, 64);
          await sleep(140);
          updateStep('apply-changes', 'done', undefined, undefined, 74);
          updateStep('recompute', 'active', undefined, undefined, 82);
          await sleep(110);
          updateStep('recompute', 'done', undefined, undefined, 90);
          updateStep('shopping-refresh', 'active', undefined, undefined, 95);
          await sleep(90);
          updateStep('shopping-refresh', 'done', undefined, undefined, 98);
          updateStep('finishing', 'done', undefined, undefined, 100);
          clearInterval(interval);
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
