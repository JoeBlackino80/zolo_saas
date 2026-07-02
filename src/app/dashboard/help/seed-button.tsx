'use client';

import { useState } from 'react';
import { Button } from '@/components/ui';
import { Sparkles, Loader2, Check } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/components/Toast';
import { useRouter } from 'next/navigation';

export default function SeedSampleDataButton() {
  const toast = useToast();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function seed() {
    if (!confirm('Vytvoriť ukážkové dáta (3 klienti, 3 produkty, 4 doklady) v aktuálnej firme?')) return;
    setBusy(true);
    const sb = createClient();
    const firmId = typeof window !== 'undefined' ? localStorage.getItem('zolo_firm') : null;
    if (!firmId) { toast('Vyber firmu v sidebar', 'error'); setBusy(false); return; }
    const { data, error } = await sb.rpc('seed_sample_data', { p_company_id: firmId });
    setBusy(false);
    if (error) { toast(error.message, 'error'); return; }
    setDone(true);
    toast(`Sample dáta vytvorené: ${JSON.stringify(data)}`, 'success');
    setTimeout(() => router.push('/dashboard/invoices'), 1500);
  }

  return (
    <Button variant="primary" onClick={seed} disabled={busy || done}>
      {busy ? <><Loader2 size={14} className="animate-spin" /> Vytváram…</>
        : done ? <><Check size={14} /> Vytvorené · presmerujem</>
        : <><Sparkles size={14} /> Vytvoriť ukážkové dáta</>}
    </Button>
  );
}
