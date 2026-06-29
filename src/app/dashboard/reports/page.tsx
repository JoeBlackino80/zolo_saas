import { createClient } from '@/lib/supabase/server';
import { PageHeader, Card, CardHeader } from '@/components/ui';
import { fmtEur } from '@/lib/utils';
import { TrendingUp, BarChart3, PieChart } from 'lucide-react';
import Link from 'next/link';

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ year?: string }> }) {
  const sp = await searchParams;
  const year = sp.year || String(new Date().getFullYear());
  const yearStart = `${year}-01-01`;
  const yearEnd = `${year}-12-31`;
  const sb = await createClient();

  const { data: invoices } = await sb
    .from('invoices')
    .select('type, total, issue_date, customer_name, vat_amount, subtotal')
    .gte('issue_date', yearStart)
    .lte('issue_date', yearEnd)
    .is('deleted_at', null);

  type Inv = { type: string; total: number; issue_date: string; customer_name: string | null; vat_amount: number; subtotal: number };
  const rows = (invoices || []) as Inv[];

  // Revenue + costs by month
  const months: Record<string, { revenue: number; costs: number; vat_out: number; vat_in: number }> = {};
  for (let m = 1; m <= 12; m++) {
    months[String(m).padStart(2, '0')] = { revenue: 0, costs: 0, vat_out: 0, vat_in: 0 };
  }
  rows.forEach((r) => {
    const m = r.issue_date.slice(5, 7);
    if (!months[m]) return;
    if (r.type === 'invoice') {
      months[m].revenue += Number(r.subtotal);
      months[m].vat_out += Number(r.vat_amount);
    } else if (r.type === 'received_invoice') {
      months[m].costs += Number(r.subtotal);
      months[m].vat_in += Number(r.vat_amount);
    }
  });

  // Top customers
  const custMap: Record<string, number> = {};
  rows.filter((r) => r.type === 'invoice' && r.customer_name).forEach((r) => {
    custMap[r.customer_name!] = (custMap[r.customer_name!] || 0) + Number(r.total);
  });
  const topCustomers = Object.entries(custMap).sort((a, b) => b[1] - a[1]).slice(0, 10);

  const totalRevenue = Object.values(months).reduce((s, m) => s + m.revenue, 0);
  const totalCosts = Object.values(months).reduce((s, m) => s + m.costs, 0);
  const profit = totalRevenue - totalCosts;
  const margin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;

  const maxMonth = Math.max(...Object.values(months).map((m) => Math.max(m.revenue, m.costs)), 1);

  return (
    <div className="p-4 sm:p-8 max-w-7xl">
      <PageHeader
        title="Reporty & analytika"
        subtitle={`Ročný prehľad ${year}`}
        actions={
          <div className="flex gap-1">
            {[+year - 1, +year, +year + 1].map((y) => (
              <Link key={y} href={`/dashboard/reports?year=${y}`} className={`px-3 py-1.5 text-sm rounded ${y === +year ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>{y}</Link>
            ))}
          </div>
        }
      />

      <div className="grid sm:grid-cols-2 gap-3 mb-6">
        <Link href={`/dashboard/reports/balance-sheet?year=${year}`} className="block bg-zinc-50 hover:bg-zinc-100 border border-zinc-100 rounded-xl p-5 transition-colors">
          <div className="font-semibold tracking-tight text-zinc-900">Súvaha {year}</div>
          <div className="text-xs text-zinc-500 mt-1">Aktíva a pasíva k 31.12. zo zaúčtovaných operácií →</div>
        </Link>
        <Link href={`/dashboard/reports/income-statement?year=${year}`} className="block bg-zinc-50 hover:bg-zinc-100 border border-zinc-100 rounded-xl p-5 transition-colors">
          <div className="font-semibold tracking-tight text-zinc-900">Výsledovka {year}</div>
          <div className="text-xs text-zinc-500 mt-1">Náklady, výnosy a výsledok hospodárenia (P&L) →</div>
        </Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card><div className="p-5">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Výnosy</div>
          <div className="text-2xl font-bold mt-2">{fmtEur(totalRevenue)}</div>
        </div></Card>
        <Card><div className="p-5">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Náklady</div>
          <div className="text-2xl font-bold mt-2 text-red-600">{fmtEur(totalCosts)}</div>
        </div></Card>
        <Card><div className="p-5">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Zisk</div>
          <div className={`text-2xl font-bold mt-2 ${profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{fmtEur(profit)}</div>
        </div></Card>
        <Card><div className="p-5">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Marža</div>
          <div className={`text-2xl font-bold mt-2 ${margin >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{margin.toFixed(1)}%</div>
        </div></Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <Card>
          <CardHeader title={<><BarChart3 className="inline mr-2" size={14} /> Výnosy vs náklady — mesačne</>} />
          <div className="p-5">
            <div className="grid grid-cols-12 gap-2">
              {Object.entries(months).map(([m, v]) => (
                <div key={m} className="flex flex-col items-center">
                  <div className="text-[9px] text-slate-500 mb-1">{m}</div>
                  <div className="flex-1 w-full min-h-[140px] flex flex-col items-stretch justify-end gap-0.5">
                    <div className="bg-emerald-500" style={{ height: `${(v.revenue / maxMonth) * 100}px` }} title={`Výnosy: ${fmtEur(v.revenue)}`} />
                    <div className="bg-red-500" style={{ height: `${(v.costs / maxMonth) * 100}px` }} title={`Náklady: ${fmtEur(v.costs)}`} />
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-center gap-6 mt-4 text-xs">
              <div className="flex items-center gap-2"><div className="w-3 h-3 bg-emerald-500" /> Výnosy</div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 bg-red-500" /> Náklady</div>
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader title={<><PieChart className="inline mr-2" size={14} /> Top zákazníci</>} />
          <div className="p-5">
            {topCustomers.length === 0 ? (
              <div className="text-center py-8 text-sm text-slate-500">Žiadne dáta</div>
            ) : (
              <div className="space-y-3">
                {topCustomers.map(([name, sum], i) => {
                  const pct = (sum / topCustomers[0][1]) * 100;
                  return (
                    <div key={i}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium truncate flex-1">{name}</span>
                        <span className="font-mono font-medium ml-3">{fmtEur(sum)}</span>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full">
                        <div className="h-full bg-zinc-900 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader title={<><TrendingUp className="inline mr-2" size={14} /> DPH agregát — ročne</>} />
        <div className="p-5 grid grid-cols-2 lg:grid-cols-4 gap-4 text-center">
          <div><div className="text-xs text-slate-500">DPH výstup</div><div className="text-xl font-mono font-bold">{fmtEur(Object.values(months).reduce((s, m) => s + m.vat_out, 0))}</div></div>
          <div><div className="text-xs text-slate-500">DPH vstup</div><div className="text-xl font-mono font-bold">{fmtEur(Object.values(months).reduce((s, m) => s + m.vat_in, 0))}</div></div>
          <div><div className="text-xs text-slate-500">Net DPH</div><div className={`text-xl font-mono font-bold ${(Object.values(months).reduce((s, m) => s + m.vat_out - m.vat_in, 0)) >= 0 ? 'text-red-600' : 'text-emerald-600'}`}>{fmtEur(Object.values(months).reduce((s, m) => s + m.vat_out - m.vat_in, 0))}</div></div>
          <div><div className="text-xs text-slate-500">Faktúr</div><div className="text-xl font-mono font-bold">{rows.length}</div></div>
        </div>
      </Card>
    </div>
  );
}
