import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { fmtEur, fmtDate } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function PortalPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const sb = await createClient();
  // portal_tokens table grants read access via RLS to specific invoice
  const { data: pt } = await sb.from('portal_tokens').select('id, invoice_id, expires_at, used_at').eq('token', token).maybeSingle();
  if (!pt) notFound();
  if (pt.expires_at && new Date(pt.expires_at) < new Date()) notFound();
  const { data: invoice } = await sb
    .from('invoices')
    .select('id, number, type, customer_name, total, currency, issue_date, due_date, status, paid_amount, invoice_items(position, description, quantity, unit, unit_price, vat_rate, total), companies(name, ico, dic, ic_dph, iban, bic, bank_name)')
    .eq('id', pt.invoice_id)
    .single();
  if (!invoice) notFound();

  type Item = { position: number; description: string; quantity: number; unit: string; unit_price: number; vat_rate: number; total: number };
  const items = ((invoice.invoice_items as Item[]) || []).sort((a, b) => a.position - b.position);
  const co = Array.isArray(invoice.companies) ? invoice.companies[0] : invoice.companies as { name: string; ico: string; dic: string; ic_dph: string; iban: string; bic: string; bank_name: string };

  // Mark used
  await sb.from('portal_tokens').update({ used_at: new Date().toISOString() }).eq('id', pt.id);

  const paid = Number(invoice.paid_amount || 0);
  const remaining = Number(invoice.total) - paid;
  const isPaid = remaining < 0.01;

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 text-slate-700">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-extrabold text-base">Z</div>
            <span className="text-sm font-semibold">ZOLO</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
          <div className="px-8 py-6 border-b border-slate-100 bg-gradient-to-br from-slate-50 to-white">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-slate-500">{invoice.type === 'invoice' ? 'Faktúra' : invoice.type}</div>
                <div className="text-2xl font-bold text-slate-900 mt-1">{invoice.number}</div>
              </div>
              <div className="text-right">
                <div className={`inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${isPaid ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                  {isPaid ? 'Zaplatené' : 'K úhrade'}
                </div>
                <div className="text-3xl font-bold text-slate-900 mt-2">{fmtEur(remaining)}</div>
              </div>
            </div>
          </div>

          <div className="px-8 py-6 grid grid-cols-2 gap-6 border-b border-slate-100">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Dodávateľ</div>
              <div className="font-semibold text-slate-900">{co?.name}</div>
              <div className="text-sm text-slate-600 mt-1 space-y-0.5">
                <div>IČO: {co?.ico || '—'}</div>
                <div>DIČ: {co?.dic || '—'}</div>
                <div>IČ DPH: {co?.ic_dph || '—'}</div>
              </div>
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Odberateľ</div>
              <div className="font-semibold text-slate-900">{invoice.customer_name}</div>
            </div>
          </div>

          <div className="px-8 py-6 grid grid-cols-3 gap-4 text-sm border-b border-slate-100">
            <div><div className="text-xs text-slate-500">Vystavená</div><div className="font-medium">{fmtDate(invoice.issue_date)}</div></div>
            <div><div className="text-xs text-slate-500">Splatná</div><div className="font-medium">{fmtDate(invoice.due_date)}</div></div>
            <div><div className="text-xs text-slate-500">Mena</div><div className="font-medium">{invoice.currency}</div></div>
          </div>

          <div className="px-8 py-6 border-b border-slate-100">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Položky</div>
            <table className="w-full text-sm">
              <tbody className="divide-y divide-slate-100">
                {items.map((it, i) => (
                  <tr key={i}>
                    <td className="py-2 text-slate-700">{it.description}</td>
                    <td className="py-2 text-right font-mono text-xs text-slate-500">{it.quantity} {it.unit}</td>
                    <td className="py-2 text-right font-mono">{fmtEur(it.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {co?.iban && !isPaid && (
            <div className="px-8 py-6 bg-blue-50">
              <div className="text-xs font-bold uppercase tracking-wider text-blue-700 mb-3">Platobné údaje</div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><div className="text-xs text-blue-700">IBAN</div><div className="font-mono">{co.iban}</div></div>
                <div><div className="text-xs text-blue-700">BIC</div><div className="font-mono">{co.bic || '—'}</div></div>
                <div><div className="text-xs text-blue-700">Variabilný symbol</div><div className="font-mono">{invoice.number.replace(/\D/g, '')}</div></div>
                <div><div className="text-xs text-blue-700">Suma</div><div className="font-mono font-bold">{fmtEur(remaining)}</div></div>
              </div>
            </div>
          )}
        </div>

        <div className="text-center text-xs text-slate-400 mt-6">
          Bezpečný link · Vygenerované cez <a href="https://app.zolo.sk" className="text-blue-500 hover:underline">ZOLO</a>
        </div>
      </div>
    </div>
  );
}
