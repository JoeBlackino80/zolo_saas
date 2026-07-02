import { createClient } from '@/lib/supabase/server';
import { PageHeader, Card, CardHeader } from '@/components/ui';
import { fmtEur } from '@/lib/utils';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Cash flow výkaz' };

type LineKey = string;

export default async function CashFlowPage({ searchParams }: { searchParams: Promise<{ year?: string }> }) {
  const sp = await searchParams;
  const y = sp.year ? parseInt(sp.year, 10) : new Date().getFullYear();
  const sb = await createClient();

  // Pull all journal_entry_lines for cash accounts (211, 221) → derive flows from contra accounts
  const { data } = await sb
    .from('chart_of_accounts')
    .select(`
      account_code, account_name,
      journal_entry_lines!journal_entry_lines_account_id_fkey(
        debit_amount, credit_amount,
        journal_entries!journal_entry_lines_journal_entry_id_fkey(id, entry_date, entry_type)
      )
    `)
    .eq('is_active', true)
    .or('account_code.like.211%,account_code.like.221%,account_code.like.5%,account_code.like.6%,account_code.like.3%,account_code.like.0%,account_code.like.1%');

  type R = { account_code: string; account_name: string; journal_entry_lines: { debit_amount: number; credit_amount: number; journal_entries: { id: string; entry_date: string; entry_type: string } | { id: string; entry_date: string; entry_type: string }[] | null }[] | null };
  const all = (data || []) as R[];

  const inflows: Record<LineKey, number> = {};
  const outflows: Record<LineKey, number> = {};
  let totalCashStart = 0, totalCashEnd = 0;

  for (const r of all) {
    const code = r.account_code;
    const isCash = code.startsWith('211') || code.startsWith('221');
    for (const l of r.journal_entry_lines || []) {
      const je = Array.isArray(l.journal_entries) ? l.journal_entries[0] : l.journal_entries;
      if (!je) continue;
      const yr = parseInt(je.entry_date.slice(0, 4), 10);
      if (isCash) {
        const debit = Number(l.debit_amount || 0);
        const credit = Number(l.credit_amount || 0);
        if (yr < y) {
          totalCashStart += debit - credit;
        } else if (yr === y) {
          totalCashEnd += debit - credit;
          if (debit > 0) {
            const key = je.entry_type === 'BV' ? 'Banka — prijaté úhrady' : je.entry_type === 'PPD' ? 'Pokladnica — príjmy' : 'Iné prijaté';
            inflows[key] = (inflows[key] || 0) + debit;
          }
          if (credit > 0) {
            const key = je.entry_type === 'BV' ? 'Banka — odoslané úhrady' : je.entry_type === 'VPD' ? 'Pokladnica — výdaje' : 'Iné odoslané';
            outflows[key] = (outflows[key] || 0) + credit;
          }
        }
      }
    }
  }

  totalCashEnd = totalCashStart + totalCashEnd;
  const sumIn = Object.values(inflows).reduce((s, v) => s + v, 0);
  const sumOut = Object.values(outflows).reduce((s, v) => s + v, 0);
  const netFlow = sumIn - sumOut;

  return (
    <div className="p-4 sm:p-8 max-w-5xl">
      <PageHeader back={{ href: "/dashboard/reports" }} title={`Cash flow výkaz ${y}`} subtitle="Skutočné peňažné toky cez 211 a 221 účty" />

      <div className="grid grid-cols-3 gap-3 mb-4">
        <Card><div className="p-5"><div className="text-xs text-zinc-500 font-semibold uppercase">Stav na začiatku</div><div className="text-2xl font-bold mt-1 font-mono">{fmtEur(totalCashStart)}</div></div></Card>
        <Card><div className="p-5"><div className="text-xs text-zinc-500 font-semibold uppercase">Čistý cash flow</div><div className={`text-2xl font-bold mt-1 font-mono ${netFlow > 0 ? 'text-emerald-700' : netFlow < 0 ? 'text-red-700' : ''}`}>{fmtEur(netFlow)}</div></div></Card>
        <Card><div className="p-5"><div className="text-xs text-zinc-500 font-semibold uppercase">Stav na konci</div><div className="text-2xl font-bold mt-1 font-mono">{fmtEur(totalCashEnd)}</div></div></Card>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader title="PRÍJMY" subtitle={fmtEur(sumIn)} />
          <div className="divide-y divide-zinc-100">
            {Object.entries(inflows).length === 0 ? (
              <div className="px-5 py-10 text-center text-sm text-zinc-500">Žiadne príjmy</div>
            ) : Object.entries(inflows).sort((a, b) => b[1] - a[1]).map(([k, v]) => (
              <div key={k} className="px-5 py-2.5 flex items-center justify-between text-sm">
                <span>{k}</span>
                <span className="font-mono text-emerald-700">+{fmtEur(v)}</span>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <CardHeader title="VÝDAJE" subtitle={fmtEur(sumOut)} />
          <div className="divide-y divide-zinc-100">
            {Object.entries(outflows).length === 0 ? (
              <div className="px-5 py-10 text-center text-sm text-zinc-500">Žiadne výdaje</div>
            ) : Object.entries(outflows).sort((a, b) => b[1] - a[1]).map(([k, v]) => (
              <div key={k} className="px-5 py-2.5 flex items-center justify-between text-sm">
                <span>{k}</span>
                <span className="font-mono text-red-700">−{fmtEur(v)}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
