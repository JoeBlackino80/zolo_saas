import { createClient } from '@/lib/supabase/server';
import { PageHeader, Card, CardHeader, Badge } from '@/components/ui';
import { fmtEur } from '@/lib/utils';
import { aggregateVat } from '@/lib/vat';

export default async function VatPage({ searchParams }: { searchParams: Promise<{ period?: string; firm?: string }> }) {
  const sp = await searchParams;
  const period = sp.period || new Date().toISOString().slice(0, 7);
  const [y, m] = period.split('-').map(Number);
  const monthStart = `${y}-${String(m).padStart(2, '0')}-01`;
  const nextMonth = new Date(y, m, 1).toISOString().slice(0, 10);

  const sb = await createClient();
  const { data: companies } = await sb.from('companies').select('id, name, ic_dph').is('deleted_at', null).order('name');

  const rows: { company_id: string; company_name: string; t: ReturnType<typeof aggregateVat> }[] = [];
  if (companies) {
    for (const c of companies) {
      const { data: outInvoices } = await sb
        .from('invoices')
        .select('id, invoice_items(vat_rate, subtotal, vat_amount)')
        .eq('company_id', c.id)
        .in('type', ['invoice', 'credit_note'])
        .gte('issue_date', monthStart)
        .lt('issue_date', nextMonth);
      const { data: inInvoices } = await sb
        .from('invoices')
        .select('id, invoice_items(vat_rate, subtotal, vat_amount)')
        .eq('company_id', c.id)
        .in('type', ['received_invoice'])
        .gte('issue_date', monthStart)
        .lt('issue_date', nextMonth);
      const outItems = (outInvoices || []).flatMap((i) => (i.invoice_items as { vat_rate: number; subtotal: number; vat_amount: number }[]) || []);
      const inItems = (inInvoices || []).flatMap((i) => (i.invoice_items as { vat_rate: number; subtotal: number; vat_amount: number }[]) || []);
      const t = aggregateVat(outItems, inItems);
      rows.push({ company_id: c.id, company_name: c.name, t });
    }
  }

  const totalObligation = rows.reduce((s, r) => s + r.t.obligation, 0);

  return (
    <div className="p-8 max-w-7xl">
      <PageHeader title="Zadávanie DPH" subtitle={`Obdobie ${period} · spolu ${rows.length} firiem`} />

      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card>
          <div className="p-5">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Spolu povinnosť</div>
            <div className={`text-2xl font-bold mt-2 tracking-tight ${totalObligation > 0 ? 'text-red-600' : totalObligation < 0 ? 'text-emerald-600' : ''}`}>
              {fmtEur(totalObligation)}
            </div>
          </div>
        </Card>
        <Card>
          <div className="p-5">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Firmy platia</div>
            <div className="text-2xl font-bold mt-2">{rows.filter((r) => r.t.obligation > 0.01).length}</div>
          </div>
        </Card>
        <Card>
          <div className="p-5">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Firmy s nárokom</div>
            <div className="text-2xl font-bold mt-2 text-emerald-600">{rows.filter((r) => r.t.obligation < -0.01).length}</div>
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader title={`Mesačný prehľad DPH — ${period}`} subtitle="Vydané × prijaté faktúry, agregát z položiek" />
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
                <th className="text-left px-4 py-3">Firma</th>
                <th className="text-right px-2 py-3">Vyd. 23%</th>
                <th className="text-right px-2 py-3">Vyd. 19%</th>
                <th className="text-right px-2 py-3">Vyd. 10%</th>
                <th className="text-right px-2 py-3">Vyd. EÚ</th>
                <th className="text-right px-2 py-3">Prij. 23%</th>
                <th className="text-right px-2 py-3">Prij. 19%</th>
                <th className="text-right px-2 py-3">Prij. 10%</th>
                <th className="text-right px-4 py-3">Povinnosť</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-xs">
              {rows.map((r) => {
                const obl = r.t.obligation;
                return (
                  <tr key={r.company_id} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5 font-sans text-sm font-medium text-slate-900">{r.company_name}</td>
                    <td className="text-right px-2 py-2.5">{r.t.outVat23 ? fmtEur(r.t.outVat23) : '—'}</td>
                    <td className="text-right px-2 py-2.5">{r.t.outVat19 ? fmtEur(r.t.outVat19) : '—'}</td>
                    <td className="text-right px-2 py-2.5">{r.t.outVat10 ? fmtEur(r.t.outVat10) : '—'}</td>
                    <td className="text-right px-2 py-2.5">{r.t.outBaseEu ? fmtEur(r.t.outBaseEu) : '—'}</td>
                    <td className="text-right px-2 py-2.5">{r.t.inVat23 ? fmtEur(r.t.inVat23) : '—'}</td>
                    <td className="text-right px-2 py-2.5">{r.t.inVat19 ? fmtEur(r.t.inVat19) : '—'}</td>
                    <td className="text-right px-2 py-2.5">{r.t.inVat10 ? fmtEur(r.t.inVat10) : '—'}</td>
                    <td className={`text-right px-4 py-2.5 font-bold ${obl > 0.01 ? 'text-red-600' : obl < -0.01 ? 'text-emerald-600' : 'text-slate-400'}`}>
                      {fmtEur(obl)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="mt-4 flex gap-3 text-sm">
        <Badge variant="red">Červené</Badge> <span className="text-slate-500">platíš DPH</span>
        <Badge variant="green">Zelené</Badge> <span className="text-slate-500">nárok na vrátenie</span>
      </div>
    </div>
  );
}
