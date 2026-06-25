'use client';

import { useState } from 'react';
import { CreditCard, Loader2 } from 'lucide-react';

export default function PayButton({ token, amount }: { token: string; amount: string }) {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function startPayment() {
    setLoading(true);
    setErr(null);
    try {
      const r = await fetch('/api/payment-link', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      const j = await r.json();
      if (!r.ok || !j.url) { setErr(j.error || 'Nepodarilo sa vytvoriť platbu'); setLoading(false); return; }
      window.location.href = j.url;
    } catch (e) {
      setErr((e as Error).message);
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={startPayment}
        disabled={loading}
        className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-gradient-to-br from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded-lg text-sm shadow-lg shadow-blue-500/25 transition disabled:opacity-60"
      >
        {loading ? <Loader2 size={14} className="animate-spin" /> : <CreditCard size={14} />}
        Zaplatiť {amount} kartou
      </button>
      {err && <div className="w-full text-xs text-red-600 mt-1">{err}</div>}
    </>
  );
}
