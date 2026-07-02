import { createClient } from '@/lib/supabase/server';
import { PageHeader, Card, CardHeader } from '@/components/ui';
import { fmtEur } from '@/lib/utils';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Výsledovka' };

type Line = { code: string; name: string; balance: number };

export default async function IncomeStatementPage({ searchParams }: { searchParams: Promise<{ year?: string }> }) {
  const sp = await searchParams;
  const y = sp.year ? parseInt(sp.year, 10) : new Date().getFullYear();
  const sb = await createClient();

  const { data: rows } = await sb
    .from('chart_of_accounts')
    .select(`
      account_code,
      account_name,
      journal_entry_lines!journal_entry_lines_account_id_fkey(
        debit_amount,
        credit_amount,
        journal_entries!journal_entry_lines_journal_entry_id_fkey(entry_date)
      )
    `)
    .eq('is_active', true)
    .or('account_code.like.5%,account_code.like.6%');

  type R = { account_code: string; account_name: string;
    journal_entry_lines: { debit_amount: number; credit_amount: number; journal_entries: { entry_date: string } | { entry_date: string }[] | null }[] | null };

  const costs: Line[] = [];
  const revs: Line[] = [];
  for (const r of (rows || []) as R[]) {
    let debit = 0, credit = 0;
    for (const l of r.journal_entry_lines || []) {
      const je = Array.isArray(l.journal_entries) ? l.journal_entries[0] : l.journal_entries;
      if (!je || parseInt(je.entry_date.slice(0, 4), 10) !== y) continue;
      debit += Number(l.debit_amount || 0);
      credit += Number(l.credit_amount || 0);
    }
    if (r.account_code.startsWith('5')) {
      const bal = debit - credit;
      if (bal !== 0) costs.push({ code: r.account_code, name: r.account_name, balance: bal });
    } else if (r.account_code.startsWith('6')) {
      const bal = credit - debit;
      if (bal !== 0) revs.push({ code: r.account_code, name: r.account_name, balance: bal });
    }
  }

  const sumCosts = costs.reduce((s, x) => s + x.balance, 0);
  const sumRevs = revs.reduce((s, x) => s + x.balance, 0);
  const profit = sumRevs - sumCosts;

  return (
    <div className="p-4 sm:p-8 max-w-6xl">
      <PageHeader back={{ href: "/dashboard/reports" }} title={`Výkaz ziskov a strát ${y}`} subtitle="Náklady, výnosy a výsledok hospodárenia" />
      <div className="grid md:grid-cols-2 gap-4 mb-4">
        <Card>
          <CardHeader title="VÝNOSY" subtitle={fmtEur(sumRevs)} />
          <div className="divide-y divide-zinc-100">
            {revs.sort((a, b) => a.code.localeCompare(b.code)).map((l) => (
              <div key={l.code} className="px-5 py-2.5 flex items-center justify-between text-sm">
                <span><span className="font-mono text-zinc-500 mr-2">{l.code}</span>{l.name}</span>
                <span className="font-mono">{fmtEur(l.balance)}</span>
              </div>
            ))}
            <div className="px-5 py-3 bg-zinc-50 flex items-center justify-between font-bold">
              <span>SPOLU VÝNOSY</span>
              <span className="font-mono">{fmtEur(sumRevs)}</span>
            </div>
          </div>
        </Card>
        <Card>
          <CardHeader title="NÁKLADY" subtitle={fmtEur(sumCosts)} />
          <div className="divide-y divide-zinc-100">
            {costs.sort((a, b) => a.code.localeCompare(b.code)).map((l) => (
              <div key={l.code} className="px-5 py-2.5 flex items-center justify-between text-sm">
                <span><span className="font-mono text-zinc-500 mr-2">{l.code}</span>{l.name}</span>
                <span className="font-mono">{fmtEur(l.balance)}</span>
              </div>
            ))}
            <div className="px-5 py-3 bg-zinc-50 flex items-center justify-between font-bold">
              <span>SPOLU NÁKLADY</span>
              <span className="font-mono">{fmtEur(sumCosts)}</span>
            </div>
          </div>
        </Card>
      </div>
      <Card>
        <div className="p-6 flex items-center justify-between">
          <span className="text-lg font-bold">Výsledok hospodárenia (zisk / strata)</span>
          <span className={`text-2xl font-bold tracking-tight font-mono ${profit > 0 ? 'text-emerald-700' : profit < 0 ? 'text-red-700' : ''}`}>
            {fmtEur(profit)}
          </span>
        </div>
      </Card>
    </div>
  );
}
