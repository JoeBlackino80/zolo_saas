import { createClient } from '@/lib/supabase/server';
import { PageHeader, Card, CardHeader, EmptyState, Badge } from '@/components/ui';
import { Link2 } from 'lucide-react';
import { fmtEur } from '@/lib/utils';

export default async function LinksPage() {
  const sb = await createClient();
  const { data: companies } = await sb.from('companies').select('id, name, ico').is('deleted_at', null);

  type Comp = { id: string; name: string; ico: string | null };
  const comps = (companies || []) as Comp[];
  // Build IČO map for fuzzy matching
  const icoMap = new Map<string, Comp>();
  comps.forEach((c) => { if (c.ico) icoMap.set(c.ico, c); });

  // Find invoices where customer_ico matches one of our companies
  const { data: invoices } = await sb
    .from('invoices')
    .select('id, company_id, number, customer_name, customer_ico, total, issue_date, type, companies(name)')
    .in('type', ['invoice', 'credit_note'])
    .is('deleted_at', null)
    .order('issue_date', { ascending: false });

  type Inv = { id: string; company_id: string; number: string; customer_name: string | null; customer_ico: string | null; total: number; issue_date: string; type: string; companies: { name: string } | { name: string }[] | null };
  const all = (invoices || []) as Inv[];
  const interFirm = all.filter((i) => i.customer_ico && icoMap.has(i.customer_ico));

  // Build flow matrix (from → to → sum)
  type Edge = { from: Comp; to: Comp; sum: number; count: number };
  const edgeMap: Record<string, Edge> = {};
  for (const i of interFirm) {
    const fromCo = comps.find((c) => c.id === i.company_id);
    const toCo = icoMap.get(i.customer_ico!);
    if (!fromCo || !toCo) continue;
    const key = `${fromCo.id}->${toCo.id}`;
    if (!edgeMap[key]) edgeMap[key] = { from: fromCo, to: toCo, sum: 0, count: 0 };
    edgeMap[key].sum += Number(i.total);
    edgeMap[key].count += 1;
  }
  const edges = Object.values(edgeMap).sort((a, b) => b.sum - a.sum);

  // Bidirectional flows
  const bidir: { a: Comp; b: Comp; aToB: number; bToA: number; net: number }[] = [];
  for (const e of edges) {
    if (bidir.find((x) => x.a.id === e.to.id && x.b.id === e.from.id)) continue;
    const reverse = edgeMap[`${e.to.id}->${e.from.id}`];
    if (reverse) {
      bidir.push({ a: e.from, b: e.to, aToB: e.sum, bToA: reverse.sum, net: e.sum - reverse.sum });
    }
  }

  return (
    <div className="p-8 max-w-7xl">
      <PageHeader title="Prepojenia" subtitle={`Inter-firm faktúry medzi tvojimi firmami v portfóliu`} />

      {interFirm.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Link2 size={24} />}
            title="Žiadne inter-firm faktúry"
            description="Tu uvidíš faktúry vystavené medzi tvojimi vlastnými firmami (sister companies)."
          />
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-4 mb-6">
            <Card><div className="p-5">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Inter-firm faktúr</div>
              <div className="text-2xl font-bold mt-2">{interFirm.length}</div>
            </div></Card>
            <Card><div className="p-5">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Celkový tok</div>
              <div className="text-2xl font-bold mt-2">{fmtEur(interFirm.reduce((s, i) => s + Number(i.total), 0))}</div>
            </div></Card>
            <Card><div className="p-5">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Obojsmerné toky</div>
              <div className="text-2xl font-bold mt-2">{bidir.length}</div>
            </div></Card>
          </div>

          {bidir.length > 0 && (
            <Card className="mb-4">
              <CardHeader title="Obojsmerné toky (možnosť započítania)" />
              <div className="divide-y divide-slate-100">
                {bidir.map((b, i) => (
                  <div key={i} className="px-5 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="font-medium">{b.a.name}</div>
                      <div className="text-slate-400">↔</div>
                      <div className="font-medium">{b.b.name}</div>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-slate-500">{fmtEur(b.aToB)} → · ← {fmtEur(b.bToA)}</span>
                      <Badge variant={Math.abs(b.net) < 100 ? 'green' : 'amber'}>Net {fmtEur(b.net)}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          <Card>
            <CardHeader title="Všetky inter-firm väzby" />
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
                    <th className="text-left px-5 py-3">Z firmy</th>
                    <th className="text-center px-3 py-3"></th>
                    <th className="text-left px-3 py-3">Do firmy</th>
                    <th className="text-right px-3 py-3">Spolu</th>
                    <th className="text-right px-3 py-3">Faktúr</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {edges.map((e, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="px-5 py-3 font-medium">{e.from.name}</td>
                      <td className="px-3 py-3 text-center text-slate-400">→</td>
                      <td className="px-3 py-3 font-medium">{e.to.name}</td>
                      <td className="px-3 py-3 text-right font-mono font-medium">{fmtEur(e.sum)}</td>
                      <td className="px-3 py-3 text-right font-mono text-xs">{e.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
