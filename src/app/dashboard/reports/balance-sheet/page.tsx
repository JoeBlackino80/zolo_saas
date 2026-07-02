import { createClient } from '@/lib/supabase/server';
import { PageHeader, Card, CardHeader } from '@/components/ui';
import { fmtEur } from '@/lib/utils';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Súvaha' };

type Line = { code: string; name: string; balance: number };

export default async function BalanceSheetPage({ searchParams }: { searchParams: Promise<{ year?: string; company?: string }> }) {
  const sp = await searchParams;
  const y = sp.year ? parseInt(sp.year, 10) : new Date().getFullYear();
  const sb = await createClient();

  // Pull all account totals for the year via SQL (sum debit/credit from journal_entry_lines joined to coa)
  const { data: rows } = await sb
    .from('chart_of_accounts')
    .select(`
      account_code,
      account_name,
      account_type,
      journal_entry_lines!journal_entry_lines_account_id_fkey(
        debit_amount,
        credit_amount,
        journal_entries!journal_entry_lines_journal_entry_id_fkey(entry_date)
      )
    `)
    .eq('is_active', true);

  type R = { account_code: string; account_name: string; account_type: string;
    journal_entry_lines: { debit_amount: number; credit_amount: number; journal_entries: { entry_date: string } | { entry_date: string }[] | null }[] | null };
  const all = (rows || []) as R[];

  const assetCodes: Line[] = [];
  const liabCodes: Line[] = [];

  for (const r of all) {
    const lines = r.journal_entry_lines || [];
    let debit = 0, credit = 0;
    for (const l of lines) {
      const je = Array.isArray(l.journal_entries) ? l.journal_entries[0] : l.journal_entries;
      if (!je) continue;
      const yr = parseInt(je.entry_date.slice(0, 4), 10);
      if (yr !== y) continue;
      debit += Number(l.debit_amount || 0);
      credit += Number(l.credit_amount || 0);
    }
    const first = r.account_code[0];
    if (['0', '1', '2', '3'].includes(first)) {
      // Asset side (0/1/2/3 — note: 3xx receivables/payables split below)
      if (first === '3') {
        // 31x = pohľadávky (asset, debit balance) ; 32x = záväzky (liability, credit balance)
        if (r.account_code.startsWith('31') || r.account_code.startsWith('33')) {
          if (debit - credit !== 0) assetCodes.push({ code: r.account_code, name: r.account_name, balance: debit - credit });
        } else {
          if (credit - debit !== 0) liabCodes.push({ code: r.account_code, name: r.account_name, balance: credit - debit });
        }
      } else {
        if (debit - credit !== 0) assetCodes.push({ code: r.account_code, name: r.account_name, balance: debit - credit });
      }
    } else if (['4'].includes(first)) {
      if (credit - debit !== 0) liabCodes.push({ code: r.account_code, name: r.account_name, balance: credit - debit });
    }
    // 5xx + 6xx are P&L, not balance sheet (they appear via 431 close)
  }

  const sumAssets = assetCodes.reduce((s, x) => s + x.balance, 0);
  const sumLiab = liabCodes.reduce((s, x) => s + x.balance, 0);

  return (
    <div className="p-4 sm:p-8 max-w-6xl">
      <PageHeader back={{ href: "/dashboard/reports" }} title={`Súvaha ${y}`} subtitle="Stav aktív a pasív k 31.12. zo zaúčtovaných operácií" />
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader title="AKTÍVA" subtitle={fmtEur(sumAssets)} />
          <div className="divide-y divide-zinc-100">
            {assetCodes.sort((a, b) => a.code.localeCompare(b.code)).map((l) => (
              <div key={l.code} className="px-5 py-2.5 flex items-center justify-between text-sm">
                <span><span className="font-mono text-zinc-500 mr-2">{l.code}</span>{l.name}</span>
                <span className="font-mono">{fmtEur(l.balance)}</span>
              </div>
            ))}
            <div className="px-5 py-3 bg-zinc-50 flex items-center justify-between font-bold">
              <span>SPOLU AKTÍVA</span>
              <span className="font-mono">{fmtEur(sumAssets)}</span>
            </div>
          </div>
        </Card>
        <Card>
          <CardHeader title="PASÍVA" subtitle={fmtEur(sumLiab)} />
          <div className="divide-y divide-zinc-100">
            {liabCodes.sort((a, b) => a.code.localeCompare(b.code)).map((l) => (
              <div key={l.code} className="px-5 py-2.5 flex items-center justify-between text-sm">
                <span><span className="font-mono text-zinc-500 mr-2">{l.code}</span>{l.name}</span>
                <span className="font-mono">{fmtEur(l.balance)}</span>
              </div>
            ))}
            <div className="px-5 py-3 bg-zinc-50 flex items-center justify-between font-bold">
              <span>SPOLU PASÍVA</span>
              <span className="font-mono">{fmtEur(sumLiab)}</span>
            </div>
          </div>
        </Card>
      </div>
      <p className="text-xs text-zinc-500 mt-4">
        Rozdiel aktíva vs pasíva = {fmtEur(sumAssets - sumLiab)} {Math.abs(sumAssets - sumLiab) < 0.01 ? '✓ vyrovnané' : '⚠️ nie je vyrovnané, skontroluj zápisy alebo vykonaj uzávierku roka'}
      </p>
    </div>
  );
}
