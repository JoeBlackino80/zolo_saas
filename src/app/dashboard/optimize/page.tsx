import { createClient } from '@/lib/supabase/server';
import { PageHeader, Card, CardHeader, Badge } from '@/components/ui';
import { fmtEur } from '@/lib/utils';
import { aggregateVat } from '@/lib/vat';

export default async function OptimizePage({ searchParams }: { searchParams: Promise<{ period?: string }> }) {
  const sp = await searchParams;
  const period = sp.period || new Date().toISOString().slice(0, 7);
  const [y, m] = period.split('-').map(Number);
  const monthStart = `${y}-${String(m).padStart(2, '0')}-01`;
  const nextMonth = new Date(y, m, 1).toISOString().slice(0, 10);

  const sb = await createClient();
  const { data: companies } = await sb.from('companies').select('id, name, ic_dph').is('deleted_at', null).order('name');

  type Row = { id: string; name: string; ic_dph: string | null; obligation: number };
  const rows: Row[] = [];
  for (const c of companies || []) {
    const { data: out } = await sb.from('invoices').select('id, invoice_items(vat_rate, subtotal, vat_amount)').eq('company_id', c.id).in('type', ['invoice', 'credit_note']).gte('issue_date', monthStart).lt('issue_date', nextMonth);
    const { data: inb } = await sb.from('invoices').select('id, invoice_items(vat_rate, subtotal, vat_amount)').eq('company_id', c.id).in('type', ['received_invoice']).gte('issue_date', monthStart).lt('issue_date', nextMonth);
    const outItems = (out || []).flatMap((i) => (i.invoice_items as { vat_rate: number; subtotal: number; vat_amount: number }[]) || []);
    const inItems = (inb || []).flatMap((i) => (i.invoice_items as { vat_rate: number; subtotal: number; vat_amount: number }[]) || []);
    const t = aggregateVat(outItems, inItems);
    rows.push({ id: c.id, name: c.name, ic_dph: c.ic_dph, obligation: t.obligation });
  }

  const positives = rows.filter((r) => r.obligation > 0.01).sort((a, b) => b.obligation - a.obligation);
  const negatives = rows.filter((r) => r.obligation < -0.01).sort((a, b) => a.obligation - b.obligation);
  const grossPay = positives.reduce((s, r) => s + r.obligation, 0);
  const grossRefund = -negatives.reduce((s, r) => s + r.obligation, 0);
  const totalNet = grossPay - grossRefund;
  const savings = Math.min(grossPay, grossRefund);

  return (
    <div className="p-4 sm:p-8 max-w-7xl">
      <PageHeader title="Optimalizácia DPH" subtitle={`Skupinové započítanie cez všetky tvoje firmy · ${period}`} />

      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card><div className="p-5">
          <div className="text-xs font-semibold uppercase tracking-wider text-zinc-500">K odvodu (brutto)</div>
          <div className="text-2xl font-bold mt-2 text-red-600">{fmtEur(grossPay)}</div>
          <div className="text-xs text-zinc-500 mt-1">{positives.length} firiem platí</div>
        </div></Card>
        <Card><div className="p-5">
          <div className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Nárok na vrátenie</div>
          <div className="text-2xl font-bold mt-2 text-emerald-600">{fmtEur(grossRefund)}</div>
          <div className="text-xs text-zinc-500 mt-1">{negatives.length} firiem nárokuje</div>
        </div></Card>
        <Card><div className="p-5">
          <div className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Netto za skupinu</div>
          <div className="text-2xl font-bold mt-2">{fmtEur(totalNet)}</div>
          <div className="text-xs text-zinc-500 mt-1">súčet všetkých firiem</div>
        </div></Card>
      </div>

      {savings > 100 && (
        <Card className="mb-4 bg-gradient-to-br from-zinc-50 to-white border-zinc-200">
          <div className="p-5">
            <div className="text-xs font-bold uppercase tracking-wider text-emerald-700">Cash flow návrh</div>
            <div className="text-base text-zinc-700 mt-2 leading-relaxed">
              Ak by sa interné toky vyrovnali, skupina by k 25. {period} platila <strong>{fmtEur(totalNet)}</strong> namiesto vyplácania <strong>{fmtEur(grossPay)}</strong> a čakania na vrátenie <strong>{fmtEur(grossRefund)}</strong>.
            </div>
            <div className="mt-3 text-lg font-bold text-emerald-700">
              Úspora hotovosti: {fmtEur(savings)}
            </div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader title={`Firmy platia DPH (${positives.length})`} />
          {positives.length === 0 ? (
            <div className="p-8 text-center text-sm text-zinc-500">Žiadne firmy s povinnosťou</div>
          ) : (
            <div className="divide-y divide-zinc-100">
              {positives.map((r) => (
                <div key={r.id} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <div className="text-sm font-medium">{r.name}</div>
                    <div className="text-xs text-zinc-500 font-mono">{r.ic_dph || '—'}</div>
                  </div>
                  <Badge variant="red">{fmtEur(r.obligation)}</Badge>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <CardHeader title={`Firmy s nárokom (${negatives.length})`} />
          {negatives.length === 0 ? (
            <div className="p-8 text-center text-sm text-zinc-500">Žiadne firmy s nárokom</div>
          ) : (
            <div className="divide-y divide-zinc-100">
              {negatives.map((r) => (
                <div key={r.id} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <div className="text-sm font-medium">{r.name}</div>
                    <div className="text-xs text-zinc-500 font-mono">{r.ic_dph || '—'}</div>
                  </div>
                  <Badge variant="green">{fmtEur(-r.obligation)}</Badge>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
