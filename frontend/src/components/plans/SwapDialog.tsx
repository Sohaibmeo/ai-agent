import { useEffect, useMemo, useState } from 'react';
import { useRecipeCandidates } from '../../hooks/useRecipeCandidates';
import { DEMO_USER_ID } from '../../lib/config';
import { notify } from '../../lib/toast';
import { aiPlanSwap } from '../../api/plans';

interface SwapDialogProps {
  open: boolean;
  mealSlot?: string;
  planMealId?: string | null;
  weeklyPlanId?: string | null;
  onClose: () => void;
  onSelect: (recipeId: string) => void;
}

export function SwapDialog({ open, mealSlot, planMealId, weeklyPlanId, onClose, onSelect }: SwapDialogProps) {
  const { data: candidates, isLoading, isError, refetch } = useRecipeCandidates(mealSlot, DEMO_USER_ID);
  const [search, setSearch] = useState('');
  const [autoMode, setAutoMode] = useState<'prompt' | 'question' | null>(null);
  const [autoNote, setAutoNote] = useState('');
  const [isAutoPicking, setIsAutoPicking] = useState(false);

  const filtered = useMemo(() => {
    const list = candidates || [];
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter((c) => c.name.toLowerCase().includes(q));
  }, [candidates, search]);

  useEffect(() => {
    if (open && mealSlot) {
      refetch();
      setSearch('');
      setAutoMode(null);
      setAutoNote('');
    }
  }, [open, mealSlot, refetch]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const autoPick = async () => {
    if (!weeklyPlanId) {
      notify.error('Missing plan id for swap');
      return;
    }
    try {
      setIsAutoPicking(true);
      const payload = {
        type: autoNote.trim() ? 'auto-swap-with-context' : 'auto-swap-no-text',
        userId: DEMO_USER_ID,
        weeklyPlanId,
        planMealId,
        note: autoNote.trim() || undefined,
        context: { source: 'swap-dialog', mealSlot },
      };
      const res: any = await aiPlanSwap(payload);
      const chosenId = res?.chosenRecipeId || filtered[0]?.id || candidates?.[0]?.id;
      notify.success('Request sent');
      onClose();
      if (chosenId) onSelect(chosenId);
    } catch (e) {
      notify.error('Could not send request');
    } finally {
      setIsAutoPicking(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 px-4" onClick={onClose}>
      <div
        className="w-full max-w-3xl rounded-2xl bg-white p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <div className="text-lg font-semibold text-slate-900">Swap Meal</div>
            <div className="text-sm text-slate-500">{mealSlot ? `${mealSlot} on this day` : 'Choose a replacement'}</div>
          </div>
          <button onClick={onClose} className="text-sm text-slate-500 hover:text-slate-700">
            ✕
          </button>
        </div>

        <div className="mb-3">
          <button
            className="flex w-full items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm font-semibold text-emerald-800 hover:bg-emerald-100"
            onClick={() => {
              setAutoMode(autoMode ? null : 'question');
              setAutoNote('');
            }}
            disabled={isAutoPicking}
          >
            🤖 Auto decide for me
          </button>
        </div>

        {autoMode === 'question' && (
          <div className="mb-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-sm font-semibold text-slate-800">Would you like to describe the change?</div>
            <div className="mt-3 flex flex-wrap gap-3">
              <button
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
                onClick={autoPick}
                disabled={isAutoPicking}
              >
                {isAutoPicking ? 'Picking...' : 'No, just pick for me'}
              </button>
              <button
                className="rounded-lg bg-white px-3 py-2 text-sm font-medium text-slate-800 shadow-sm hover:shadow"
                onClick={() => setAutoMode('prompt')}
                disabled={isAutoPicking}
              >
                Yes, I’ll describe it
              </button>
            </div>
          </div>
        )}

        {autoMode === 'prompt' && (
          <div className="mb-3 rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2">
            <div className="text-sm font-semibold text-slate-800">What would you like changed?</div>
            <textarea
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-200"
              rows={3}
              placeholder="e.g., higher protein, avoid dairy, lower cost..."
              value={autoNote}
              onChange={(e) => setAutoNote(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <button
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
                onClick={() => {
                  setAutoMode('question');
                  setAutoNote('');
                }}
                disabled={isAutoPicking}
              >
                Back
              </button>
              <button
                className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800"
                onClick={autoPick}
                disabled={isAutoPicking}
              >
                {isAutoPicking ? 'Applying...' : 'Apply'}
              </button>
            </div>
          </div>
        )}

        {autoMode === null && (
          <div className="mb-3">
            <div className="relative">
              <input
                type="text"
                placeholder="Search recipes..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 pl-9 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-200"
              />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
            </div>
          </div>
        )}

        {autoMode === null && (
          <div className="max-h-[420px] space-y-2 overflow-y-auto">
            {isLoading && <div className="text-sm text-slate-500 px-1">Loading candidates...</div>}
            {isError && (
              <div className="px-1 text-sm text-red-600">
                Could not load candidates.
                <button
                  className="ml-2 underline"
                  onClick={() => {
                    refetch();
                    notify.info('Retrying candidates...');
                  }}
                >
                  Retry
                </button>
              </div>
            )}
            {!isLoading && !isError &&
              filtered.map((c) => (
                <button
                  key={c.id}
                  onClick={() => onSelect(c.id)}
                  className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left shadow-sm transition hover:-translate-y-[1px] hover:shadow-md"
                >
                    <div>
                      <div className="text-sm font-semibold text-slate-900">{c.name}</div>
                      <div className="mt-1 text-xs text-slate-500">
                        Slot: {c.meal_slot} · {c.meal_type || 'solid'}
                      </div>
                      <div className="mt-1 text-[11px] text-slate-500 space-x-2">
                        <span>{c.base_kcal ? `${Math.round(Number(c.base_kcal))} kcal` : '— kcal'}</span>
                        <span>{`Protein: ${c.base_protein ? Math.round(Number(c.base_protein)) : '—'}g`}</span>
                        <span>{`Carbs: ${c.base_carbs ? Math.round(Number(c.base_carbs)) : '—'}g`}</span>
                        <span>{`Fats: ${c.base_fat ? Math.round(Number(c.base_fat)) : '—'}g`}</span>
                      </div>
                    </div>
                    <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                      {c.base_cost_gbp ? `£${Number(c.base_cost_gbp).toFixed(2)}` : '£—'}
                    </span>
                </button>
              ))}
            {!isLoading && !isError && filtered.length === 0 && (
              <div className="px-1 text-sm text-slate-500">No candidates found.</div>
            )}
          </div>
        )}

        <div className="mt-4 flex justify-end">
          <button
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
            onClick={onClose}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
