'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';

export default function PlanCTA({
  plan,
  ctaText,
  href,
  highlighted,
}: {
  plan: 'free' | 'pro' | 'business';
  ctaText: string;
  href: string;
  highlighted: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const cls = `block mt-6 w-full text-center py-2.5 rounded-full font-medium text-[14px] transition-colors ${
    highlighted
      ? 'bg-white text-zinc-900 hover:bg-zinc-100'
      : 'bg-zinc-900 text-white hover:bg-zinc-700'
  }`;

  if (plan === 'free' || plan === 'business') {
    return (
      <Link href={href} className={cls}>
        {ctaText}
      </Link>
    );
  }

  async function startCheckout() {
    setLoading(true);
    setErr(null);
    try {
      const r = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      });
      if (r.status === 401) {
        window.location.href = '/login?next=' + encodeURIComponent('/pricing');
        return;
      }
      const j = await r.json();
      if (!r.ok || !j.url) {
        setErr(j.error || 'Nepodarilo sa spustiť platbu');
        setLoading(false);
        return;
      }
      window.location.href = j.url;
    } catch (e) {
      setErr((e as Error).message);
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={startCheckout}
        disabled={loading}
        className={cls + ' disabled:opacity-60 inline-flex items-center justify-center gap-1.5'}
      >
        {loading && <Loader2 size={14} className="animate-spin" />}
        {ctaText}
      </button>
      {err && <div className="mt-2 text-xs text-red-600 text-center">{err}</div>}
    </>
  );
}
