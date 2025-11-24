import { useEffect } from 'react';
import { useRecipeCandidates } from '../../hooks/useRecipeCandidates';
import { DEMO_USER_ID } from '../../lib/config';

interface SwapDialogProps {
  open: boolean;
  mealSlot?: string;
  onClose: () => void;
  onSelect: (recipeId: string) => void;
}

export function SwapDialog({ open, mealSlot, onClose, onSelect }: SwapDialogProps) {
  const { data: candidates, isLoading, refetch } = useRecipeCandidates(mealSlot, DEMO_USER_ID);

  useEffect(() => {
    if (open && mealSlot) {
      refetch();
    }
  }, [open, mealSlot, refetch]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 px-4">
      <div className="w-full max-w-xl rounded-2xl bg-white p-4 shadow-card">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-slate-900">Swap meal</div>
            <div className="text-xs text-slate-500">Slot: {mealSlot || '—'}</div>
          </div>
          <button onClick={onClose} className="text-xs text-slate-500 hover:text-slate-700">
            Close
          </button>
        </div>
        <div className="space-y-2">
          {isLoading && <div className="text-sm text-slate-500">Loading candidates...</div>}
          {!isLoading &&
            (candidates || []).map((c) => (
              <button
                key={c.id}
                onClick={() => onSelect(c.id)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-left text-sm hover:bg-slate-50"
              >
                <div className="font-semibold text-slate-900">{c.name}</div>
                <div className="text-xs text-slate-500">{c.meal_slot}</div>
              </button>
            ))}
          {!isLoading && candidates?.length === 0 && (
            <div className="text-sm text-slate-500">No candidates found.</div>
          )}
        </div>
      </div>
    </div>
  );
}
