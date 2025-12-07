import { useCallback } from 'react';
import { useAgentPipeline } from './useAgentPipeline';

type LlmActionStep = { id: string; label: string };

type LlmActionOptions = {
  title?: string;
  subtitle?: string;
  steps?: LlmActionStep[];
};

export const useLlmAction = (opts?: LlmActionOptions) => {
  const { startRun, updateStep, endRun, setError } = useAgentPipeline();

  const runWithLlmLoader = useCallback(
    async <T,>(fn: () => Promise<T>): Promise<T> => {
      const steps =
        opts?.steps ??
        [
          { id: 'sending', label: 'Sending request' },
          { id: 'thinking', label: 'LLM thinking' },
          { id: 'applying', label: 'Updating your plan' },
        ];

      startRun('generic-llm', {
        title: opts?.title ?? 'Talking to your AI coach...',
        subtitle: opts?.subtitle ?? 'This usually takes a few seconds.',
        steps: steps.map((s, idx) => ({
          id: s.id,
          label: s.label,
          status: idx === 0 ? 'active' : 'pending',
        })),
      });

      try {
        updateStep('sending', 'done');
        updateStep('thinking', 'active');

        const result = await fn();

        updateStep('thinking', 'done');
        updateStep('applying', 'active');

        await new Promise((res) => setTimeout(res, 300));
        updateStep('applying', 'done');

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
    [startRun, updateStep, endRun, setError, opts?.title, opts?.subtitle, opts?.steps],
  );

  return { runWithLlmLoader };
};
