import { createClient } from '@/lib/supabase/server';
import { PageHeader, Card, EmptyState, Badge } from '@/components/ui';
import { FileCheck } from 'lucide-react';
import { fmtEur, fmtDate } from '@/lib/utils';

export default async function TaxReturnsPage() {
  const sb = await createClient();
  const { data: returns } = await sb
    .from('tax_returns')
    .select('id, return_type, period_year, period_month, tax_due, status, submitted_at, confirmation_number, companies(name)')
    .order('period_year', { ascending: false })
    .limit(100);

  type R = { id: string; return_type: string; period_year: number; period_month: number | null; tax_due: number | null; status: string; submitted_at: string | null; confirmation_number: string | null; companies: { name: string } | { name: string }[] | null };
  const rows = (returns || []) as R[];

  return (
    <div className="p-4 sm:p-8 max-w-7xl">
      <PageHeader title="Daňové priznania — história" subtitle={`${rows.length} podaní · DPH, DZP, KV, SV`} />
      {rows.length === 0 ? (
        <Card><EmptyState icon={<FileCheck size={24} />} title="Žiadne podania" description="Vygeneruj prvé daňové priznanie cez DP DPH alebo Income Tax." /></Card>
      ) : (
        <Card>
          <table className="w-full text-sm">
            <thead><tr className="bg-zinc-50 text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">
              <th className="text-left px-5 py-3">Firma</th>
              <th className="text-left px-3 py-3">Typ</th>
              <th className="text-left px-3 py-3">Obdobie</th>
              <th className="text-right px-3 py-3">Daň</th>
              <th className="text-center px-3 py-3">Podané</th>
              <th className="text-left px-3 py-3">Potvrdenie</th>
              <th className="text-center px-3 py-3">Stav</th>
            </tr></thead>
            <tbody className="divide-y divide-zinc-100">
              {rows.map((r) => {
                const co = Array.isArray(r.companies) ? r.companies[0] : r.companies;
                return (
                  <tr key={r.id} className="hover:bg-zinc-50">
                    <td className="px-5 py-3">{co?.name || '—'}</td>
                    <td className="px-3 py-3 font-mono text-xs">{r.return_type}</td>
                    <td className="px-3 py-3 font-mono text-xs">{r.period_year}{r.period_month ? `/${String(r.period_month).padStart(2, '0')}` : ''}</td>
                    <td className="px-3 py-3 text-right font-mono">{fmtEur(Number(r.tax_due || 0))}</td>
                    <td className="px-3 py-3 text-center font-mono text-xs">{r.submitted_at ? fmtDate(r.submitted_at) : '—'}</td>
                    <td className="px-3 py-3 font-mono text-xs">{r.confirmation_number || '—'}</td>
                    <td className="px-3 py-3 text-center"><Badge variant={r.status === 'accepted' ? 'green' : r.status === 'rejected' ? 'red' : 'amber'}>{r.status}</Badge></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
