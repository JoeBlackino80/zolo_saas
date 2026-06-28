'use client';

import { useEffect, useState } from 'react';
import { Button, Card, CardHeader, Select } from '@/components/ui';
import { Lock, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/components/Toast';
import { useRouter } from 'next/navigation';

type FY = { id: string; name: string; start_date: string; end_date: string; status: string; company_id: string };

export default function YearEndButton() {
  const toast = useToast();
  const router = useRouter();
  const [years, setYears] = useState<FY[]>([]);
  const [selected, setSelected] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const sb = createClient();
      const cid = typeof window !== 'undefined' ? localStorage.getItem('zolo_firm') : null;
      let q = sb.from('fiscal_years').select('id, name, start_date, end_date, status, company_id').eq('status', 'open').order('start_date', { ascending: true });
      if (cid) q = q.eq('company_id', cid);
      const { data } = await q;
      setYears((data as FY[]) || []);
      if (data?.length) setSelected(data[0].id);
    })();
  }, []);

  async function close() {
    if (!selected) { toast('Vyber rok', 'error'); return; }
    const y = years.find((x) => x.id === selected);
    if (!confirm(`Uzavrieť ${y?.name}? Vytvorí sa záverečný zápis ID (uzávierka 5xx + 6xx do 710, výsledok do 431) a rok sa uzamkne.`)) return;
    setLoading(true);
    const sb = createClient();
    const { error } = await sb.rpc('run_year_end_close', { p_fiscal_year_id: selected });
    setLoading(false);
    if (error) { toast(error.message, 'error'); return; }
    toast(`Rok ${y?.name} uzavretý`, 'success');
    router.refresh();
  }

  if (!years.length) return null;

  return (
    <Card className="mt-4">
      <CardHeader title="Účtovná uzávierka" subtitle="Záverečné zápisy a uzamknutie roka" />
      <div className="p-5 flex flex-col sm:flex-row gap-3 items-end">
        <div className="flex-1 w-full">
          <label className="text-[11px] font-medium text-zinc-700 tracking-tight block mb-1.5">Účtovný rok</label>
          <Select value={selected} onChange={(e) => setSelected(e.target.value)}>
            {years.map((y) => (
              <option key={y.id} value={y.id}>{y.name} ({y.start_date} – {y.end_date})</option>
            ))}
          </Select>
        </div>
        <Button variant="primary" onClick={close} disabled={loading || !selected}>
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Lock size={14} />}
          Uzavrieť a uzamknúť rok
        </Button>
      </div>
    </Card>
  );
}
