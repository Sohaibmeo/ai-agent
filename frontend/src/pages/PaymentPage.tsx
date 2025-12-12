import { useMemo, useRef, useState } from 'react';
import { notify } from '../lib/toast';
import { useProfile } from '../hooks/useProfile';
import { Card } from '../components/shared/Card';
import type { ReactNode } from 'react';

type BillingCycle = 'monthly' | 'yearly' | 'lifetime';
type PlanId = 'free' | 'starter' | 'performance';

const creditBundles = [
  { label: 'Entry', credits: 21, price: '£28', detail: 'Base enterprise top-up · 21 credits' },
  { label: 'Growth', credits: 48, price: '£60', detail: '15% bonus, ideal for weekly swaps' },
  { label: 'Scale', credits: 110, price: '£130', detail: '25% bonus + priority recipe queue' },
  { label: 'Enterprise', credits: 240, price: '£250', detail: '50% bonus + dedicated SLA support' },
];

const planTiers: Array<{
  id: PlanId;
  name: string;
  badge: null | 'Most popular';
  monthlyPrice: number;
  yearlyPrice: number;
  highlight: string;
  perks: string[];
}> = [
  {
    id: 'free',
    name: 'Free',
    badge: null,
    monthlyPrice: 0,
    yearlyPrice: 0,
    highlight: 'Try OverCooked with 2 AI days/month for experimentation.',
    perks: ['Includes 2 AI credit days/month', 'Community recipe generation', 'View limited insights'],
  },
  {
    id: 'starter',
    name: 'Starter',
    badge: null,
    monthlyPrice: 19,
    yearlyPrice: 190,
    highlight: 'Reliable weekly planning with predictable credit burns.',
    perks: ['Includes 8 AI credit days/month', 'Basic recipe generation', 'Weekly plan edits'],
  },
  {
    id: 'performance',
    name: 'Performance',
    badge: 'Most popular',
    monthlyPrice: 39,
    yearlyPrice: 390,
    highlight: 'Higher throughput with bulk credit resets.',
    perks: ['Includes 16 AI credit days/month', 'Priority swaps and regenerations', 'Unlimited recipe adjustments'],
  },
];

const planFeatures: Array<{ label: string; availability: Record<PlanId, boolean> }> = [
  {
    label: 'Priority swaps & regenerations',
    availability: { free: false, starter: false, performance: true },
  },
  {
    label: 'Unlimited recipe adjustments',
    availability: { free: false, starter: false, performance: true },
  },
  {
    label: 'Dedicated support lead',
    availability: { free: false, starter: false, performance: false },
  },
  {
    label: 'Custom templates & reporting',
    availability: { free: false, starter: false, performance: false },
  },
];

const lifetimePlan = {
  name: 'Lifetime Access',
  price: '£999',
  subtitle: 'One-time payment · All AI features forever',
  perks: ['Unlimited plan generations', 'Unlimited recipe & vision calls', 'VIP support & roadmap voting'],
};

function classNames(...xs: Array<string | false | undefined | null>) {
  return xs.filter(Boolean).join(' ');
}

function Pill({
  active,
  children,
  onClick,
}: {
  active?: boolean;
  children: ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={classNames(
        'rounded-2xl px-4 py-2 text-sm font-semibold transition',
        active
          ? 'bg-emerald-700 text-white shadow-sm'
          : 'border border-slate-200 bg-white text-slate-700 hover:border-slate-400'
      )}
    >
      {children}
    </button>
  );
}

function PrimaryButton({
  children,
  onClick,
  className,
}: {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={classNames(
        'rounded-full bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-600 transition',
        className
      )}
    >
      {children}
    </button>
  );
}

function SecondaryButton({
  children,
  onClick,
  className,
}: {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={classNames(
        'rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-800 hover:border-slate-400 transition',
        className
      )}
    >
      {children}
    </button>
  );
}

export function PaymentPage() {
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');
  const creditBundlesRef = useRef<HTMLDivElement | null>(null);
  const { data: profile } = useProfile();

  const credit = useMemo(() => {
    const raw = profile?.credit;
    const n = raw ? Number(raw) : 0;
    return Number.isFinite(n) ? n : 0;
  }, [profile?.credit]);

  const yearlySavingsText = useMemo(() => 'Save ~2 months', []);

  const scrollToBundles = () => {
    creditBundlesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const onCheckout = (payload: { type: 'plan' | 'bundle' | 'lifetime'; id: string }) => {
    notify.info(`Checkout coming soon: ${payload.type} · ${payload.id}`);
  };

  const Header = () => (
    <div className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-xl">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div className="space-y-2">
          <div className="text-xs uppercase tracking-[0.4em] text-slate-500">Billing</div>
          <h1 className="text-3xl font-semibold text-slate-900">Plans & Credits</h1>
          <p className="max-w-2xl text-sm text-slate-600">
            Pick a predictable plan for consistent usage or top-up enterprise-grade credits whenever you need extra
            flexibility. Credits apply across plan generations, swaps, recipes, and vision insights.
          </p>
        </div>

        <div className="w-full sm:w-auto">
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="text-xs uppercase tracking-[0.35em] text-slate-500">Current credits</div>
            <div className="mt-2 text-3xl font-semibold text-slate-900">{credit.toFixed(2)}</div>
            <div className="mt-3 flex flex-wrap gap-2">
              <PrimaryButton onClick={scrollToBundles}>Top up credits</PrimaryButton>
              <SecondaryButton onClick={() => notify.info('Invoices & receipts coming soon')}>View invoices</SecondaryButton>
            </div>
            <p className="mt-3 text-xs text-slate-500">
              Enterprise note: invoicing, VAT fields, and team billing options can be enabled later.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-3">
        {[
          { title: 'Secure payments', desc: 'Stripe-ready checkout with receipts.' },
          { title: 'Usage transparency', desc: 'Credits & limits visible before you generate.' },
          { title: 'Cancel anytime', desc: 'Downgrade or cancel at renewal.' },
        ].map((x) => (
          <div key={x.title} className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="text-sm font-semibold text-slate-900">{x.title}</div>
            <div className="mt-1 text-sm text-slate-600">{x.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );

  const PlanCard = (tier: (typeof planTiers)[number]) => {
    const isYearly = billingCycle === 'yearly';
    const price = isYearly ? tier.yearlyPrice : tier.monthlyPrice;
    const displayPrice = price === 0 ? 'Free' : `£${price}`;
    const priceLabel = price === 0 ? 'Always free' : isYearly ? 'per year' : 'per month';

    return (
      <Card
        className={classNames(
          'rounded-3xl border p-6 shadow-sm bg-white',
          tier.badge ? 'border-emerald-200 ring-1 ring-emerald-100' : 'border-slate-200'
        )}
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="text-xs uppercase tracking-[0.35em] text-slate-500">Plan</div>
              {tier.badge && (
                <span className="rounded-full bg-emerald-700 px-2.5 py-1 text-[11px] font-semibold text-white">
                  {tier.badge}
                </span>
              )}
            </div>
            <h3 className="mt-2 text-xl font-semibold text-slate-900">{tier.name}</h3>
            <p className="mt-1 text-sm text-slate-600">{tier.highlight}</p>
          </div>

          <div className="text-right">
            <div className="text-3xl font-semibold text-slate-900">{displayPrice}</div>
            <div className="text-xs uppercase tracking-[0.25em] text-slate-500">{priceLabel}</div>
            {price !== 0 && isYearly && (
              <div className="mt-2 text-sm font-semibold text-emerald-700">{yearlySavingsText}</div>
            )}
          </div>
        </div>

        <div className="mt-5 h-px w-full bg-slate-100" />

        <div className="mt-5 space-y-2 text-sm text-slate-700">
          {tier.perks.map((perk) => (
            <div key={perk} className="flex items-center gap-2">
              <span className="mt-1 h-2 w-2 rounded-full bg-emerald-600" />
              <span>{perk}</span>
            </div>
          ))}
        </div>

        <div className="mt-5 space-y-2 text-sm text-slate-700">
          <div className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Enterprise features</div>
          {planFeatures.map((feature) => {
            const available = feature.availability[tier.id];
            return (
              <div key={feature.label} className="flex items-center gap-2">
                <span
                  className={classNames(
                    'flex h-5 w-5 items-center justify-center rounded-full text-xs font-semibold transition',
                    available ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-500'
                  )}
                >
                  {available ? '✓' : '✕'}
                </span>
                <span className={available ? 'text-slate-900' : 'text-slate-500'}>{feature.label}</span>
              </div>
            );
          })}
        </div>

        <div className="mt-6 space-y-2">
          <PrimaryButton onClick={() => onCheckout({ type: 'plan', id: `${tier.name}:${billingCycle}` })} className="w-full">
            Subscribe to {tier.name}
          </PrimaryButton>
          <button
            type="button"
            className="w-full rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-800 hover:border-slate-400 transition"
            onClick={() => notify.info('Plan comparison coming soon')}
          >
            Compare features
          </button>
        </div>

        <p className="mt-4 text-xs text-slate-500">
          Includes emails/receipts. Upgrade, downgrade, or cancel at renewal.
        </p>
      </Card>
    );
  };

  const LifetimeCard = () => (
    <Card className="rounded-3xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-7 shadow-lg">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div>
          <div className="text-xs uppercase tracking-[0.4em] text-emerald-700">Lifetime</div>
          <h3 className="mt-2 text-2xl font-semibold text-slate-900">{lifetimePlan.name}</h3>
          <p className="mt-2 text-sm text-slate-700">{lifetimePlan.subtitle}</p>
        </div>

        <div className="text-right">
          <div className="text-4xl font-semibold text-slate-900">{lifetimePlan.price}</div>
          <div className="text-xs uppercase tracking-[0.25em] text-slate-500">one-time</div>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-emerald-100 bg-white p-5">
          <div className="text-sm font-semibold text-slate-900">What you get</div>
          <ul className="mt-3 space-y-2 text-sm text-slate-700">
            {lifetimePlan.perks.map((perk) => (
              <li key={perk} className="flex items-start gap-3">
                <span className="mt-2 h-1.5 w-1.5 rounded-full bg-emerald-600" />
                <span>{perk}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-emerald-100 bg-white p-5">
          <div className="text-sm font-semibold text-slate-900">Best for</div>
          <p className="mt-2 text-sm text-slate-700">
            Power users who want maximum flexibility without renewals. Great if you generate plans frequently and run
            vision/recipe calls heavily.
          </p>

          <div className="mt-5 space-y-2">
            <PrimaryButton onClick={() => onCheckout({ type: 'lifetime', id: 'lifetime' })} className="w-full">
              Unlock lifetime access
            </PrimaryButton>
            <SecondaryButton onClick={() => notify.info('Contact sales coming soon')} className="w-full">
              Contact sales
            </SecondaryButton>
          </div>

          <p className="mt-4 text-xs text-slate-500">
            Enterprise note: offer purchase orders and bank transfer later.
          </p>
        </div>
      </div>
    </Card>
  );

  const CreditBundles = () => (
    <div ref={creditBundlesRef} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-slate-500">Credit bundles</p>
          <h2 className="mt-2 text-xl font-semibold text-slate-900">Top up credits on demand</h2>
          <p className="mt-1 text-sm text-slate-600">
            Flexible bundles with enterprise-grade bonuses: more credits unlock faster queues, reporting, and SLA support.
          </p>
        </div>
        <div className="text-xs text-slate-400">Bigger bundles deliver better value</div>
      </div>

      <div className="mt-5 grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {creditBundles.map((bundle) => (
          <div
            key={bundle.label}
            className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md"
          >
            <div className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-500">{bundle.label}</div>
            <div className="mt-3 text-3xl font-semibold text-slate-900">{bundle.credits}</div>
            <div className="text-xs uppercase tracking-[0.25em] text-slate-500">credits</div>

            <div className="mt-4 flex items-baseline justify-between">
              <div className="text-2xl font-semibold text-slate-900">{bundle.price}</div>
              <div className="text-xs text-slate-500">one-time</div>
            </div>

            <p className="mt-2 text-xs text-slate-600">{bundle.detail}</p>

            <button
              type="button"
              className="mt-5 w-full rounded-full bg-slate-900 px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.3em] text-white hover:bg-slate-800 transition"
              onClick={() => onCheckout({ type: 'bundle', id: bundle.label })}
            >
              Add credits
            </button>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <div className="text-sm font-semibold text-slate-900">How credits are used</div>
        <p className="mt-1 text-sm text-slate-700">
          Each AI operation consumes credits based on complexity (full week, regenerations, swaps, recipe tweaks, vision
          analysis). Costs are shown before you confirm.
        </p>
      </div>
    </div>
  );

  const FAQ = () => (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="text-xs uppercase tracking-[0.35em] text-slate-500">FAQ</div>
      <h2 className="mt-2 text-xl font-semibold text-slate-900">Common questions</h2>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        {[
          {
            q: 'Can I switch between monthly and yearly?',
            a: 'Yes. Upgrades take effect immediately; downgrades typically apply at renewal.',
          },
          {
            q: 'Do credits expire?',
            a: 'No—credits stay on your account. We can add expiry rules for enterprise contracts later.',
          },
          {
            q: 'What happens if I run out of credits?',
            a: 'Top up instantly or use your plan allowance (monthly AI days) when the credit balance hits zero.',
          },
          {
            q: 'Can I get invoices and receipts?',
            a: 'Yes. Stripe receipts and invoices are provided, with VAT fields for UK/EU compliance soon.',
          },
        ].map((x) => (
          <div key={x.q} className="rounded-2xl border border-slate-200 p-5">
            <div className="text-sm font-semibold text-slate-900">{x.q}</div>
            <div className="mt-2 text-sm text-slate-700">{x.a}</div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 sm:py-10">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <Header />

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-xs uppercase tracking-[0.35em] text-slate-500">Subscriptions</div>
              <h2 className="mt-2 text-xl font-semibold text-slate-900">Choose a plan</h2>
              <p className="mt-1 text-sm text-slate-600">
                Prefer predictable usage? Subscribe. Need flexibility? Top up credits above and below.
              </p>
            </div>

            <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white p-2">
              <Pill active={billingCycle === 'monthly'} onClick={() => setBillingCycle('monthly')}>
                Monthly
              </Pill>
              <Pill active={billingCycle === 'yearly'} onClick={() => setBillingCycle('yearly')}>
                Yearly
              </Pill>
              <Pill active={billingCycle === 'lifetime'} onClick={() => setBillingCycle('lifetime')}>
                Lifetime
              </Pill>
            </div>
          </div>

          <div className="mt-6">
            {billingCycle === 'lifetime' ? (
              <LifetimeCard />
            ) : (
              <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                {planTiers.map((tier) => (
                  <PlanCard key={tier.name} {...tier} />
                ))}
              </div>
            )}
          </div>
        </div>

        <CreditBundles />
        <FAQ />
      </div>
    </div>
  );
}
