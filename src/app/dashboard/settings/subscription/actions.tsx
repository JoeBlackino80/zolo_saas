'use client';

import { useState } from 'react';
import { Button } from '@/components/ui';
import { Loader2, CreditCard, Settings } from 'lucide-react';

export default function SubscriptionActions({ plan, isPaid, targetPlan }: { plan: string; isPaid: boolean; targetPlan?: 'pro' | 'business' }) {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function checkout(target: 'pro' | 'business') {
    setLoading(true); setErr(null);
    try {
      const r = await fetch('/api/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ plan: target }) });
      const j = await r.json();
      if (!r.ok || !j.url) { setErr(j.error || 'Nepodarilo sa spustiť platbu'); setLoading(false); return; }
      window.location.href = j.url;
    } catch (e) {
      setErr((e as Error).message); setLoading(false);
    }
  }

  async function manage() {
    setLoading(true); setErr(null);
    try {
      const r = await fetch('/api/customer-portal', { method: 'POST' });
      const j = await r.json();
      if (!r.ok || !j.url) { setErr(j.error || 'Nepodarilo sa otvoriť portál'); setLoading(false); return; }
      window.location.href = j.url;
    } catch (e) {
      setErr((e as Error).message); setLoading(false);
    }
  }

  // Render variant: button inside upgrade card
  if (targetPlan) {
    return (
      <>
        <button onClick={() => checkout(targetPlan)} disabled={loading} className="w-full mt-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white font-medium rounded-lg text-[13px] tracking-tight disabled:opacity-60 inline-flex items-center justify-center gap-1.5 transition-colors">
          {loading ? <Loader2 size={14} className="animate-spin" /> : <CreditCard size={14} />}
          Vyskúšať 14 dní zadarmo
        </button>
        {err && <div className="mt-2 text-xs text-red-600 text-center">{err}</div>}
      </>
    );
  }

  // Render variant: top-right of current plan card
  if (isPaid) {
    return (
      <div className="flex flex-col gap-2 items-end">
        <Button variant="secondary" onClick={manage} disabled={loading}>
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Settings size={14} />}
          Spravovať predplatné
        </Button>
        {err && <div className="text-xs text-red-600">{err}</div>}
      </div>
    );
  }

  if (plan === 'free') {
    return (
      <div className="flex flex-col gap-2 items-end">
        <Button variant="primary" onClick={() => checkout('pro')} disabled={loading}>
          {loading ? <Loader2 size={14} className="animate-spin" /> : <CreditCard size={14} />}
          Upgrade na Pro
        </Button>
        {err && <div className="text-xs text-red-600">{err}</div>}
      </div>
    );
  }

  return null;
}
