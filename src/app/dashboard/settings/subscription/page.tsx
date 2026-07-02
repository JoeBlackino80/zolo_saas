import { createClient } from '@/lib/supabase/server';
import { PageHeader, Card, CardHeader, Badge } from '@/components/ui';
import { ArrowLeft, Check } from 'lucide-react';
import Link from 'next/link';
import SubscriptionActions from './actions';

const PLAN_INFO: Record<string, { label: string; price: string; companies: string; invoices: string; ai: string; team: string; color: string }> = {
  free: { label: 'Free', price: '0 €/mes', companies: '1 firma', invoices: '25 FA / mesiac', ai: 'Bez AI', team: 'Bez tímu', color: 'gray' },
  pro: { label: 'Pro', price: '15 €/mes', companies: '3 firmy', invoices: 'Neobmedzene FA', ai: 'AI Vision 100/mes', team: 'Tím do 5 ľudí', color: 'blue' },
  business: { label: 'Business', price: '49 €/mes', companies: 'Neobmedzene firiem', invoices: 'Neobmedzene FA', ai: 'AI Vision unlimited', team: 'Tím do 50 ľudí', color: 'green' },
};

export default async function SubscriptionPage() {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  const { data: sub } = await sb.from('account_subscriptions').select('plan, status, current_period_end, trial_ends_at, stripe_subscription_id').eq('user_id', user!.id).maybeSingle();
  const plan = (sub?.plan as keyof typeof PLAN_INFO) || 'free';
  const info = PLAN_INFO[plan];
  const isPaid = plan !== 'free' && sub?.stripe_subscription_id;

  return (
    <div className="p-4 sm:p-8 max-w-4xl">
      <PageHeader back={{ href: "/dashboard/settings" }} title="Predplatné ZOLO" subtitle="Tvoj plán, fakturácia, zmena plánu" />

      <Card className="mb-4">
        <CardHeader title="Aktuálny plán" />
        <div className="p-5 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl font-bold text-zinc-900">{info.label}</span>
              <Badge variant={info.color as 'gray' | 'blue' | 'green'}>{info.price}</Badge>
              {sub?.status === 'trialing' && <Badge variant="amber">Skúšobné obdobie</Badge>}
              {sub?.status === 'past_due' && <Badge variant="red">Pozastavené — neuhradené</Badge>}
            </div>
            <ul className="text-sm text-zinc-600 space-y-1">
              <li className="flex items-center gap-2"><Check size={14} className="text-emerald-500" /> {info.companies}</li>
              <li className="flex items-center gap-2"><Check size={14} className="text-emerald-500" /> {info.invoices}</li>
              <li className="flex items-center gap-2"><Check size={14} className="text-emerald-500" /> {info.ai}</li>
              <li className="flex items-center gap-2"><Check size={14} className="text-emerald-500" /> {info.team}</li>
            </ul>
            {sub?.current_period_end && (
              <div className="text-xs text-zinc-500 mt-3">Ďalšie účtovanie: {new Date(sub.current_period_end).toLocaleDateString('sk-SK')}</div>
            )}
            {sub?.trial_ends_at && new Date(sub.trial_ends_at) > new Date() && (
              <div className="text-xs text-amber-600 mt-1">Skúška do {new Date(sub.trial_ends_at).toLocaleDateString('sk-SK')}</div>
            )}
          </div>
          <SubscriptionActions plan={plan} isPaid={!!isPaid} />
        </div>
      </Card>

      {plan === 'free' && (
        <Card>
          <CardHeader title="Upgrade — odomkni viac" />
          <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border border-zinc-200 rounded-xl p-5">
              <div className="font-bold text-lg">Pro · 15 €/mes</div>
              <div className="text-sm text-zinc-500 mt-1">14 dní zadarmo, kedykoľvek zrušiť</div>
              <ul className="text-sm text-zinc-700 mt-3 space-y-1.5">
                <li>✓ 3 firmy</li>
                <li>✓ Neobmedzene faktúr</li>
                <li>✓ AI Vision 100 dokladov/mes</li>
                <li>✓ Tím + pozvánky účtovníka</li>
                <li>✓ Stripe Pay buttons</li>
              </ul>
              <SubscriptionActions plan="free" isPaid={false} targetPlan="pro" />
            </div>
            <div className="border border-zinc-900 rounded-xl p-5 bg-zinc-50">
              <div className="font-bold text-lg">Business · 49 €/mes</div>
              <div className="text-sm text-zinc-500 mt-1">Pre holdingy a viac firiem</div>
              <ul className="text-sm text-zinc-700 mt-3 space-y-1.5">
                <li>✓ Neobmedzene firiem</li>
                <li>✓ AI Vision unlimited</li>
                <li>✓ Tím do 50 ľudí</li>
                <li>✓ Custom branding + biele logo</li>
                <li>✓ Prioritná podpora</li>
              </ul>
              <SubscriptionActions plan="free" isPaid={false} targetPlan="business" />
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
