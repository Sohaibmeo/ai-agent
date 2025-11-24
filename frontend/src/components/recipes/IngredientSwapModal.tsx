import { useMemo, useState } from 'react';

type IngredientSwapModalProps = {
  open: boolean;
  currentName: string;
  currentAmount: string;
  suggestions?: string[];
  onSelect: (name: string) => void;
  onClose: () => void;
};

const defaultSuggestions = [
  'Chicken breast',
  'Tofu',
  'Salmon',
  'Chickpeas',
  'Black beans',
  'Greek yogurt',
  'Quinoa',
  'Brown rice',
  'Lentils',
  'Paneer',
];

export function IngredientSwapModal({
  open,
  currentName,
  currentAmount,
  suggestions = defaultSuggestions,
  onSelect,
  onClose,
}: IngredientSwapModalProps) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return suggestions.slice(0, 6);
    return suggestions.filter((s) => s.toLowerCase().includes(q)).slice(0, 8);
  }, [query, suggestions]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900">Replace Ingredient</h2>
        </div>
        <div className="px-6 py-4 space-y-4">
          {currentName || currentAmount ? (
            <div>
              <div className="text-xs font-semibold text-slate-600">Current ingredient</div>
              <div className="mt-2 rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-800">
                {currentName} {currentAmount ? `• ${currentAmount}` : ''}
              </div>
            </div>
          ) : (
            <div>
              <div className="text-xs font-semibold text-slate-600">Select an ingredient</div>
              <div className="mt-2 rounded-lg border border-dashed border-slate-200 px-3 py-2 text-sm text-slate-500">
                Choose an ingredient to add
              </div>
            </div>
          )}
          <div>
            <div className="text-xs font-semibold text-slate-600">Find replacement</div>
            <input
              className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200"
              placeholder="Search ingredients..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <div className="mt-3 max-h-48 space-y-1 overflow-y-auto">
              {filtered.length === 0 && <div className="text-xs text-slate-500">No matches yet.</div>}
              {filtered.map((name) => (
                <button
                  key={name}
                  className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm text-slate-800 hover:bg-slate-50"
                  onClick={() => {
                    onSelect(name);
                    setQuery('');
                  }}
                >
                  <span>{name}</span>
                  <span className="text-[11px] text-emerald-600">Swap</span>
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="border-t border-slate-200 px-6 py-3 flex justify-end">
          <button
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
            onClick={() => {
              setQuery('');
              onClose();
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
