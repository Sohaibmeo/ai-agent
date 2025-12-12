import { useMemo, useRef, useState } from 'react';
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
    badge: null as null | 'Most popular',
    monthlyPrice: 14,
    yearlyPrice: 140,
    highlight: 'For getting consistent weekly plans.',
    perks: ['20 AI days per month', 'Basic recipe generation', 'Weekly plan edits'],
  },
  {
    name: 'Performance',
    badge: 'Most popular' as null | 'Most popular',
    monthlyPrice: 29,
    yearlyPrice: 290,
    highlight: 'For serious training and frequent swaps.',
    perks: ['50 AI days per month', 'Priority swaps', 'Unlimited recipe adjustments'],
  },
  {
    name: 'Ultimate',
    badge: null as null | 'Most popular',
    monthlyPrice: 49,
    yearlyPrice: 490,
    highlight: 'For power users and teams.',
    perks: ['120 AI days per month', 'Dedicated support', 'Custom plan templates'],
  },
];

const lifetimePlan = {
  name: 'Lifetime Access',
  price: '£349',
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
  children: React.ReactNode;
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
  children: React.ReactNode;
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
  children: React.ReactNode;
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
  const { data: profile } = useProfile();

  const credit = useMemo(() => {
    const raw = profile?.credit;
    const n = raw ? Number(raw) : 0;
    return Number.isFinite(n) ? n : 0;
  }, [profile?.credit]);

  const creditBundlesRef = useRef<HTMLDivElement | null>(null);
  const scrollToBundles = () => {
    creditBundlesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const yearlySavingsText = useMemo(() => {
    // Your current pricing is "10x monthly" effectively; position as “~2 months free”.
    return 'Save ~2 months';
  }, []);

  const onCheckout = (payload: { type: 'plan' | 'bundle' | 'lifetime'; id: string }) => {
    // Stripe later: redirectToCheckout(payload)
    notify.info(`Checkout coming soon: ${payload.type} · ${payload.id}`);
  };

  const Header = () => (
    <div className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-xl">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div className="space-y-2">
          <div className="text-xs uppercase tracking-[0.4em] text-slate-500">Billing</div>
          <h1 className="text-3xl font-semibold text-slate-900">Plans & Credits</h1>
          <p className="max-w-2xl text-sm text-slate-600">
            Choose a plan for predictable monthly usage, or top up credits for spikes. Credits are used for plan
            generations, swaps, recipes, and vision calls.
          </p>
        </div>

            <div className="w-full sm:w-auto">
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="text-xs uppercase tracking-[0.35em] text-slate-500">Current credits</div>
                <div className="mt-2 text-3xl font-semibold text-slate-900">{credit.toFixed(2)}</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <PrimaryButton onClick={scrollToBundles}>
                    Top up credits
                  </PrimaryButton>
                  <SecondaryButton onClick={() => notify.info('Invoices & receipts coming soon')}>
                View invoices
              </SecondaryButton>
            </div>
            <p className="mt-3 text-xs text-slate-500">
              Enterprise note: invoicing, VAT fields, and team billing can be enabled later.
            </p>
          </div>
        </div>
      </div>

      {/* Trust row */}
      <div className="mt-6 grid gap-3 md:grid-cols-3">
        {[
          { title: 'Secure payments', desc: 'Stripe-ready checkout with receipts.' },
          { title: 'Usage transparency', desc: 'Credits & limits visible before you generate.' },
          { title: 'Cancel anytime', desc: 'Downgrade or cancel at end of cycle.' },
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

    return (
      <Card
        className={classNames(
          'rounded-3xl border p-6 shadow-sm bg-white',
          tier.badge ? 'border-emerald-200 ring-1 ring-emerald-100' : 'border-slate-200'
        )}
      >
        <div className="flex items-start justify-between gap-4">
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
            <div className="text-3xl font-semibold text-slate-900">£{price}</div>
            <div className="text-xs uppercase tracking-[0.25em] text-slate-500">
              {isYearly ? 'per year' : 'per month'}
            </div>
            {isYearly && <div className="mt-2 text-sm font-semibold text-emerald-700">{yearlySavingsText}</div>}
          </div>
        </div>

        <div className="mt-5 h-px w-full bg-slate-100" />

        <ul className="mt-5 space-y-2 text-sm text-slate-700">
          {tier.perks.map((perk) => (
            <li key={perk} className="flex items-start gap-3">
              <span className="mt-2 h-1.5 w-1.5 rounded-full bg-emerald-600" />
              <span>{perk}</span>
            </li>
          ))}
        </ul>

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
            Long-term users who want maximum flexibility without renewals. Ideal if you generate plans frequently and use
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
          <h2 className="mt-2 text-xl font-semibold text-slate-900">Top up when you need it</h2>
          <p className="mt-1 text-sm text-slate-600">
            Credits are flexible and stack. Bigger bundles include better value.
          </p>
        </div>
        <div className="text-xs text-slate-400">More credits = better value</div>
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
          Each AI operation consumes credits depending on complexity (full weekly plan, day regen, swaps, recipe tweaks,
          vision macros). You’ll see a cost estimate before confirming.
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
            a: 'Yes. Upgrades can take effect immediately; downgrades typically apply at renewal.',
          },
          {
            q: 'Do credits expire?',
            a: 'No—credits remain on your account. (You can add expiry rules later for enterprise contracts if needed.)',
          },
          {
            q: 'What happens if I run out of credits?',
            a: 'You can top up instantly or wait for your plan quota to reset (if your plan includes monthly AI days).',
          },
          {
            q: 'Can I get invoices and receipts?',
            a: 'Yes. Stripe receipts and invoices are standard; VAT fields can be added for UK/EU compliance.',
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
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <Header />

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-xs uppercase tracking-[0.35em] text-slate-500">Subscriptions</div>
              <h2 className="mt-2 text-xl font-semibold text-slate-900">Choose a plan</h2>
              <p className="mt-1 text-sm text-slate-600">
                Prefer predictable usage? Subscribe. Need flexibility? Top up credits below.
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
