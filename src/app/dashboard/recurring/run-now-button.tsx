'use client';

import { useState } from 'react';
import { Button } from '@/components/ui';
import { Play, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/components/Toast';
import { useRouter } from 'next/navigation';

export default function RunNowButton() {
  const toast = useToast();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function runNow() {
    if (!confirm('Spustiť generátor teraz? Vystavia faktúry pre všetky šablóny, ktorých dátum už nastal.')) return;
    setLoading(true);
    const sb = createClient();
    const { data, error } = await sb.rpc('generate_recurring_invoices');
    setLoading(false);
    if (error) { toast(error.message, 'error'); return; }
    const arr = (data as Array<{ recurring_id: string; invoice_id: string | null; error_msg: string | null }>) || [];
    const ok = arr.filter((x) => x.invoice_id && !x.error_msg).length;
    const errs = arr.filter((x) => x.error_msg).length;
    toast(`Vygenerované ${ok} FA${errs ? ` · ${errs} chýb` : ''}`, errs > 0 ? 'error' : 'success');
    router.refresh();
  }

  return (
    <Button variant="secondary" onClick={runNow} disabled={loading}>
      {loading ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
      Spustiť teraz
    </Button>
  );
}
