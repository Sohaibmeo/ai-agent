import { useEffect, useState } from 'react';
import type { ShoppingListItem } from '../../api/types';

type UpdatePriceModalProps = {
  open: boolean;
  item?: ShoppingListItem;
  onClose: () => void;
  onSave: (payload: { itemId: string; pricePaid: number; quantity: number; unit: string }) => void;
};

const units = ['g', 'kg', 'ml', 'l', 'pc'];

export function UpdatePriceModal({ open, item, onClose, onSave }: UpdatePriceModalProps) {
  const [price, setPrice] = useState<string>('');
  const [quantity, setQuantity] = useState<string>('');
  const [unit, setUnit] = useState<string>('g');

  useEffect(() => {
    if (item) {
      setPrice(item.estimated_cost_gbp ? Number(item.estimated_cost_gbp).toFixed(2) : '');
      setQuantity(item.total_quantity ? String(item.total_quantity) : '');
      setUnit(item.unit || 'g');
    }
  }, [item]);

  if (!open || !item) return null;

  const handleSave = () => {
    const priceNum = Number(price);
    const qtyNum = Number(quantity);
    if (!isFinite(priceNum) || !isFinite(qtyNum) || qtyNum <= 0) return;
    onSave({ itemId: item.id, pricePaid: priceNum, quantity: qtyNum, unit });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <div className="text-lg font-semibold text-slate-900">Update Price</div>
            <div className="text-sm text-slate-500">{item.ingredient?.name}</div>
          </div>
          <button className="text-slate-500 hover:text-slate-700" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="px-6 py-4 space-y-4">
          <div>
            <div className="text-xs font-semibold text-slate-600">Price paid (£)</div>
            <input
              type="number"
              min="0"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-200"
              placeholder="7.20"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <div className="text-xs font-semibold text-slate-600">Quantity bought</div>
              <input
                type="number"
                min="0"
                step="0.1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-200"
                placeholder="800"
              />
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-600">Unit</div>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-200"
              >
                {units.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="rounded-lg bg-slate-50 px-3 py-2 text-[11px] text-slate-500">
            This will help improve cost estimates for future meal plans.
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-6 py-3">
          <button
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-50"
            onClick={handleSave}
            disabled={!price || !quantity}
          >
            Save price
          </button>
        </div>
      </div>
    </div>
  );
}
