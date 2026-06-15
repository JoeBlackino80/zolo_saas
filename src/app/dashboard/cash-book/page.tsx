import { createClient } from '@/lib/supabase/server';
import { PageHeader, Card, EmptyState, Badge } from '@/components/ui';
import { Wallet } from 'lucide-react';
import { fmtEur, fmtDate } from '@/lib/utils';

export default async function CashBookPage() {
  const sb = await createClient();
  const { data: entries } = await sb
    .from('cash_book_entries')
    .select('id, entry_date, document_number, description, amount, payment_method, payment_type')
    .order('entry_date', { ascending: false })
    .limit(100);

  type E = { id: string; entry_date: string; document_number: string | null; description: string; amount: number; payment_method: string | null; payment_type: string };
  const rows = (entries || []) as E[];

  const totalIn = rows.filter((r) => r.payment_type === 'income').reduce((s, r) => s + Number(r.amount), 0);
  const totalOut = rows.filter((r) => r.payment_type === 'expense').reduce((s, r) => s + Number(r.amount), 0);
  const balance = totalIn - totalOut;

  return (
    <div className="p-8 max-w-6xl">
      <PageHeader title="Pokladničná kniha" subtitle={`${rows.length} zápisov · zostatok ${fmtEur(balance)}`} />

      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card><div className="p-5">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Príjem</div>
          <div className="text-2xl font-bold mt-2 text-emerald-600">{fmtEur(totalIn)}</div>
        </div></Card>
        <Card><div className="p-5">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Výdaj</div>
          <div className="text-2xl font-bold mt-2 text-red-600">{fmtEur(totalOut)}</div>
        </div></Card>
        <Card><div className="p-5">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Zostatok</div>
          <div className={`text-2xl font-bold mt-2 ${balance >= 0 ? '' : 'text-red-600'}`}>{fmtEur(balance)}</div>
        </div></Card>
      </div>

      {rows.length === 0 ? (
        <Card><EmptyState icon={<Wallet size={24} />} title="Prázdna pokladnica" description="Pridaj hotovostné príjmy a výdavky (PPD, VPD)." /></Card>
      ) : (
        <Card>
          <table className="w-full text-sm">
            <thead><tr className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
              <th className="text-center px-5 py-3">Dátum</th>
              <th className="text-left px-3 py-3">Doklad</th>
              <th className="text-left px-3 py-3">Popis</th>
              <th className="text-center px-3 py-3">Typ</th>
              <th className="text-right px-3 py-3">Suma</th>
            </tr></thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="px-5 py-3 text-center font-mono text-xs">{fmtDate(r.entry_date)}</td>
                  <td className="px-3 py-3 font-mono text-xs">{r.document_number || '—'}</td>
                  <td className="px-3 py-3 text-slate-700">{r.description}</td>
                  <td className="px-3 py-3 text-center"><Badge variant={r.payment_type === 'income' ? 'green' : 'red'}>{r.payment_type === 'income' ? 'Príjem' : 'Výdaj'}</Badge></td>
                  <td className={`px-3 py-3 text-right font-mono font-medium ${r.payment_type === 'income' ? 'text-emerald-600' : 'text-red-600'}`}>{r.payment_type === 'income' ? '+' : '-'}{fmtEur(Number(r.amount))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
