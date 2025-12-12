import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProfile } from '../../hooks/useProfile';

const formatCredits = (value: number) =>
  Number.isInteger(value) ? value.toString() : value.toFixed(2);

export function CreditConfirmationModal({
  cost,
  title,
  detail,
  insufficient,
  ctaLabel,
  onConfirm,
  onCancel,
}: {
  cost: number;
  title: string;
  detail?: string;
  insufficient?: boolean;
  ctaLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const { data: profile } = useProfile();
  const navigate = useNavigate();
  const availableCredits = useMemo(() => Number(profile?.credit ?? 0), [profile]);
  const rechargeLabel = ctaLabel || 'Add credits';

  const handleRecharge = () => {
    navigate('/current-plan');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
        <div className="text-sm font-semibold text-slate-500 uppercase tracking-[0.3em]">Credits</div>
        <h2 className="mt-2 text-2xl font-semibold text-slate-900">{title}</h2>
        <p className="mt-3 text-sm text-slate-600">
          This action will consume <span className="font-bold text-slate-900">{formatCredits(cost)} credits</span>.
        </p>
        <p className="text-sm text-slate-500">You have {formatCredits(availableCredits)} credits available.</p>
        {detail && <p className="mt-2 text-sm text-slate-500">{detail}</p>}
        {insufficient && (
          <div className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            <p>You do not have enough credits for this action.</p>
            <button
              type="button"
              onClick={() => {
                handleRecharge();
                onCancel();
              }}
              className="mt-3 inline-flex items-center justify-center rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500"
            >
              {rechargeLabel}
            </button>
          </div>
        )}
        <div className="mt-6 flex justify-end gap-3 text-sm">
          <button
            type="button"
            className="rounded-full border border-slate-200 px-4 py-2 font-semibold text-slate-700 hover:bg-slate-50"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!!insufficient}
            className={`rounded-full px-4 py-2 font-semibold text-white ${
              insufficient ? 'bg-slate-300 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-500'
            }`}
            onClick={onConfirm}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}
