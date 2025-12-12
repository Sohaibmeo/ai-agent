import { useState } from 'react';
import { notify } from '../lib/toast';
import { useProfile } from '../hooks/useProfile';
import { Card } from '../components/shared/Card';

type BillingCycle = 'monthly' | 'yearly' | 'lifetime';

const creditBundles = [
  { label: 'Starter', credits: 5, price: '£4.99', detail: 'Baseline pack · no discount' },
  { label: 'Explorer', credits: 15, price: '£12.99', detail: '15% extra credits · best for casual use' },
  { label: 'Pro', credits: 35, price: '£24.99', detail: '25% extra credits · great value' },
  { label: 'Ambassador', credits: 75, price: '£39.99', detail: '50% extra credits · unlocks priority queue' },
];

const planTiers = [
  {
    name: 'Starter',
    monthlyPrice: 14,
    yearlyPrice: 140,
    perks: ['20 AI days per month', 'Basic recipe generation', 'Weekly plan edits'],
  },
  {
    name: 'Performance',
    monthlyPrice: 29,
    yearlyPrice: 290,
    perks: ['50 AI days per month', 'Priority swaps', 'Unlimited recipe adjustments'],
  },
  {
    name: 'Ultimate',
    monthlyPrice: 49,
    yearlyPrice: 490,
    perks: ['120 AI days per month', 'Dedicated support', 'Custom plan templates'],
  },
];

const lifetimePlan = {
  name: 'Lifetime Access',
  price: '£349',
  subtitle: 'One-time payment · All AI features forever',
  perks: ['Unlimited plan generations', 'Unlimited recipe & vision calls', 'VIP support & roadmap voting'],
};

export function PaymentPage() {
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');
  const { data: profile } = useProfile();

  const renderPlanCard = (tier: typeof planTiers[number]) => {
    const price = billingCycle === 'monthly' ? tier.monthlyPrice : tier.yearlyPrice;
    const savings = billingCycle === 'yearly' ? 'Save ~2 months' : '';
    return (
      <Card key={tier.name} className="rounded-3xl border border-slate-200 p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-500">Plan</div>
            <h3 className="text-xl font-semibold text-slate-900">{tier.name}</h3>
          </div>
          <div className="text-right">
            <div className="text-2xl font-semibold text-slate-900">£{price}</div>
            <div className="text-xs uppercase tracking-[0.2em] text-slate-500">
              {billingCycle === 'monthly' ? 'per month' : 'per year'}
            </div>
          </div>
        </div>
        {savings && <div className="mt-2 text-sm font-semibold text-emerald-700">{savings}</div>}
        <ul className="mt-4 space-y-2 text-sm text-slate-600">
          {tier.perks.map((perk) => (
            <li key={perk} className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
              <span>{perk}</span>
            </li>
          ))}
        </ul>
        <button
          type="button"
          className="mt-6 w-full rounded-full bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600"
          onClick={() => notify.info('Checkout coming soon!')}
        >
          Choose {tier.name}
        </button>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-xl">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="text-xs uppercase tracking-[0.4em] text-slate-500">Credits</div>
              <div className="mt-2 text-4xl font-semibold text-slate-900">
                {profile?.credit ? Number(profile.credit).toFixed(2) : '0.00'} credits
              </div>
              <p className="text-sm text-slate-500">Spend them on plan generations, swaps, recipes and vision calls.</p>
            </div>
            <button
              type="button"
              className="rounded-full border border-emerald-600 px-5 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50"
              onClick={() => notify.info('Head to bundles below to add credits')}
            >
              Add credits
            </button>
          </div>
          <p className="mt-3 text-sm text-slate-500">More credits unlock better discounts automatically.</p>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Credit bundles</p>
              <p className="text-sm text-slate-600">Pick the pack that suits your usage today.</p>
            </div>
            <span className="text-xs text-slate-400">More credits = better value</span>
          </div>
          <div className="grid gap-4 md:grid-cols-4">
            {creditBundles.map((bundle) => (
              <div key={bundle.label} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="text-sm font-semibold text-slate-500 uppercase tracking-[0.3em]">{bundle.label}</div>
                <div className="mt-3 text-3xl font-semibold text-slate-900">{bundle.credits} credits</div>
                <div className="text-lg font-semibold text-slate-900">{bundle.price}</div>
                <p className="mt-1 text-xs text-slate-500">{bundle.detail}</p>
                <button
                  type="button"
                  className="mt-4 w-full rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white hover:bg-slate-800"
                  onClick={() => notify.success('Checkout coming soon!')}
                >
                  Add credits
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            {(['monthly', 'yearly', 'lifetime'] as BillingCycle[]).map((cycle) => (
              <button
                key={cycle}
                onClick={() => setBillingCycle(cycle)}
                className={`rounded-2xl px-4 py-2 text-sm font-semibold ${
                  billingCycle === cycle
                    ? 'bg-emerald-700 text-white'
                    : 'border border-slate-200 text-slate-600 hover:border-slate-400'
                }`}
              >
                {cycle.charAt(0).toUpperCase() + cycle.slice(1)}
              </button>
            ))}
          </div>
          {billingCycle === 'lifetime' ? (
            <Card className="rounded-3xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-6 shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs uppercase tracking-[0.4em] text-emerald-600">Lifetime</div>
                  <h3 className="mt-2 text-2xl font-semibold text-slate-900">{lifetimePlan.name}</h3>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-semibold text-slate-900">{lifetimePlan.price}</div>
                  <div className="text-xs uppercase tracking-[0.2em] text-slate-500">One-time</div>
                </div>
              </div>
              <p className="mt-3 text-sm text-slate-600">{lifetimePlan.subtitle}</p>
              <ul className="mt-4 space-y-2 text-sm text-slate-600">
                {lifetimePlan.perks.map((perk) => (
                  <li key={perk} className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                    <span>{perk}</span>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                className="mt-6 w-full rounded-full bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600"
                onClick={() => notify.success('Lifetime purchase flow will be ready soon!')}
              >
                Unlock lifetime access
              </button>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-3">
              {planTiers.map(renderPlanCard)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
