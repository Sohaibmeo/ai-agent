import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { resolveIngredient } from '../../api/ingredients';
import type { Ingredient } from '../../api/types';
import { notify } from '../../lib/toast';

type IngredientSwapModalProps = {
  open: boolean;
  currentName: string;
  currentAmount: string;
  currentIngredientId?: string;
  currentUnit?: string;
  suggestions?: string[];
  onSelect: (ingredient: Ingredient, amount: number, unit: string) => void;
  onClose: () => void;
  mode?: 'add' | 'replace';
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

const units = ['g', 'kg', 'ml', 'l', 'tbsp', 'tsp', 'cup', 'pinch', 'piece'];

export function IngredientSwapModal({
  open,
  currentName,
  currentAmount,
  currentIngredientId,
  currentUnit = 'g',
  suggestions = defaultSuggestions,
  onSelect,
  onClose,
  mode = 'replace',
}: IngredientSwapModalProps) {
  const [query, setQuery] = useState('');
  const [amount, setAmount] = useState<number>(() => {
    const numeric = Number((currentAmount || '').split(' ')[0]);
    return Number.isFinite(numeric) ? numeric : 100;
  });
  const [unit, setUnit] = useState<string>(currentUnit || 'g');
  const [selected, setSelected] = useState<Ingredient | null>(null);

  // keep amount in sync if the modal opens with different defaults
  useEffect(() => {
    const numeric = Number((currentAmount || '').split(' ')[0]);
    setAmount(Number.isFinite(numeric) ? numeric : 100);
    setUnit(currentUnit || 'g');
    setSelected(null);
    setQuery('');
  }, [currentAmount, currentUnit]);

  const heading = mode === 'add' ? 'Add Ingredient' : 'Replace Ingredient';

  const searchQuery = query.trim();
  const ingredientSearch = useQuery({
    queryKey: ['ingredient-search', searchQuery],
    queryFn: () => resolveIngredient({ query: searchQuery, limit: 8, createIfMissing: false }),
    enabled: open && searchQuery.length > 0,
  });

  const filtered: Ingredient[] = useMemo(() => {
    if (searchQuery.length === 0) {
      return suggestions.slice(0, 8).map((name, idx) => ({ id: `suggest-${idx}`, name }));
    }
    const data = ingredientSearch.data;
    if (!data) return [];
    const fromMatches = data.matches.map((m) => m.ingredient);
    const base = data.resolved ? [data.resolved, ...fromMatches] : fromMatches;
    const dedup = new Map<string, Ingredient>();
    for (const ing of base) {
      if (ing.id) dedup.set(ing.id, ing);
    }
    return Array.from(dedup.values());
  }, [ingredientSearch.data, searchQuery, suggestions]);

  const canApply = Boolean(selected || currentIngredientId);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

    if (!open) return null;

    return (
      <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
        <div
        className="w-full max-w-md rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900">{heading}</h2>
        </div>
        <div className="px-6 py-4 space-y-4">
          {currentName || currentAmount ? (
            <div>
              <div className="text-xs font-semibold text-slate-600">Current ingredient</div>
              <div className="mt-2 flex items-center gap-3 rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-800">
                <div className="flex-1">{currentName || 'New ingredient'}</div>
                <input
                  type="number"
                  min={0}
                  step="0.5"
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  className="w-24 rounded border border-slate-200 bg-white px-2 py-1 text-right text-sm text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-200"
                />
                <select
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  className="w-20 rounded border border-slate-200 bg-white px-2 py-1 text-sm text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-200"
                >
                  {units.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
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
              {filtered.map((ing) => (
                <button
                  key={ing.id}
                  className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm text-slate-800 hover:bg-slate-50 ${
                    selected?.id === ing.id ? 'border border-emerald-200 bg-emerald-50' : ''
                  }`}
                  onClick={() => setSelected(ing)}
                >
                  <span>{ing.name}</span>
                  <span className="text-[11px] text-emerald-600">
                    {selected?.id === ing.id ? 'Selected' : 'Select'}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="border-t border-slate-200 px-6 py-3 flex justify-end gap-2">
          <button
            className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-50"
            disabled={!canApply}
              onClick={() => {
                const baseIngredient = selected || (currentIngredientId ? { id: currentIngredientId, name: currentName } : null);
                if (!baseIngredient) {
                  notify.error('Please select an ingredient');
                  return;
                }
                onSelect(baseIngredient as Ingredient, amount, unit);
                setSelected(null);
                setQuery('');
              }}
          >
            Apply
          </button>
          <button
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
            onClick={() => {
              setQuery('');
              setSelected(null);
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
