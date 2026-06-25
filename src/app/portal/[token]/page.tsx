import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { fmtEur, fmtDate } from '@/lib/utils';
import PayButton from './pay-button';

export const dynamic = 'force-dynamic';

type PortalData = {
  invoice: { id: string; number: string; type: string; customer_name: string | null; total: number; currency: string; issue_date: string; delivery_date: string | null; due_date: string; status: string; paid_amount: number | null; variable_symbol: string | null };
  items: { position: number; description: string; quantity: number; unit: string; unit_price: number; vat_rate: number; total: number }[];
  company: { id: string; name: string; ico: string | null; dic: string | null; ic_dph: string | null; iban: string | null; bic: string | null; bank_name: string | null };
  stripe_enabled: boolean;
  error?: string;
};

export default async function PortalPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const sb = await createClient();
  const { data: result } = await sb.rpc('get_invoice_by_portal_token', { p_token: token });
  if (!result) notFound();
  const payload = result as PortalData;
  if (payload.error === 'expired') notFound();
  const invoice = payload.invoice;
  const items = (payload.items || []).sort((a, b) => a.position - b.position);
  const co = payload.company;
  const stripeEnabled = payload.stripe_enabled;

  const paid = Number(invoice.paid_amount || 0);
  const remaining = Number(invoice.total) - paid;
  const isPaid = remaining < 0.01;
  const TYPE_LABEL: Record<string, string> = { invoice: 'Faktúra', proforma: 'Zálohová faktúra', credit_note: 'Dobropis', storno: 'Storno', quote: 'Cenová ponuka' };

  return (
    <div className="min-h-screen bg-slate-50 py-6 sm:py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-6">
          <a href="https://zolo.sk" className="inline-flex items-center gap-2 text-slate-700">
            <div className="w-7 h-7 rounded-md bg-zinc-900 text-white flex items-center justify-center font-black text-[14px] tracking-tight">Z</div>
            <span className="text-sm font-semibold tracking-tight">ZOLO</span>
          </a>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
          <div className="px-6 sm:px-8 py-6 border-b border-slate-100 bg-gradient-to-br from-slate-50 to-white">
            <div className="flex items-start justify-between flex-wrap gap-4">
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-slate-500">{TYPE_LABEL[invoice.type] || invoice.type}</div>
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

          {!isPaid && (
            <div className="px-6 sm:px-8 py-4 bg-blue-50 border-b border-slate-100">
              <div className="flex flex-wrap gap-2">
                {stripeEnabled && <PayButton token={token} amount={fmtEur(remaining)} />}
                <a
                  href={`/api/invoice-pdf?token=${token}&inline=1`}
                  target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-white border border-slate-200 hover:border-blue-300 hover:bg-blue-50 text-slate-700 font-semibold rounded-lg text-sm transition"
                >
                  Náhľad PDF
                </a>
                <a
                  href={`/api/invoice-pdf?token=${token}`}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-white border border-slate-200 hover:border-blue-300 hover:bg-blue-50 text-slate-700 font-semibold rounded-lg text-sm transition"
                >
                  Stiahnuť PDF
                </a>
              </div>
            </div>
          )}

          <div className="px-6 sm:px-8 py-6 grid grid-cols-1 sm:grid-cols-2 gap-6 border-b border-slate-100">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Dodávateľ</div>
              <div className="font-semibold text-slate-900">{co?.name}</div>
              <div className="text-sm text-slate-600 mt-1 space-y-0.5">
                <div>IČO: {co?.ico || '—'}</div>
                <div>DIČ: {co?.dic || '—'}</div>
                {co?.ic_dph && <div>IČ DPH: {co.ic_dph}</div>}
              </div>
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Odberateľ</div>
              <div className="font-semibold text-slate-900">{invoice.customer_name}</div>
            </div>
          </div>

          <div className="px-6 sm:px-8 py-6 grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm border-b border-slate-100">
            <div><div className="text-xs text-slate-500">Vystavená</div><div className="font-medium">{fmtDate(invoice.issue_date)}</div></div>
            <div><div className="text-xs text-slate-500">DZP</div><div className="font-medium">{fmtDate(invoice.delivery_date || invoice.issue_date)}</div></div>
            <div><div className="text-xs text-slate-500">Splatná</div><div className="font-medium">{fmtDate(invoice.due_date)}</div></div>
            <div><div className="text-xs text-slate-500">Mena</div><div className="font-medium">{invoice.currency}</div></div>
          </div>

          <div className="px-6 sm:px-8 py-6 border-b border-slate-100">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Položky</div>
            <div className="overflow-auto -mx-2">
              <table className="w-full text-sm min-w-[400px]">
                <tbody className="divide-y divide-slate-100">
                  {items.map((it, i) => (
                    <tr key={i}>
                      <td className="py-2 px-2 text-slate-700">{it.description}</td>
                      <td className="py-2 px-2 text-right font-mono text-xs text-slate-500 whitespace-nowrap">{it.quantity} {it.unit}</td>
                      <td className="py-2 px-2 text-right font-mono whitespace-nowrap">{fmtEur(it.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {co?.iban && !isPaid && (
            <div className="px-6 sm:px-8 py-6 bg-blue-50">
              <div className="text-xs font-bold uppercase tracking-wider text-blue-700 mb-3">Platba prevodom</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div><div className="text-xs text-blue-700">IBAN</div><div className="font-mono break-all">{co.iban}</div></div>
                <div><div className="text-xs text-blue-700">BIC</div><div className="font-mono">{co.bic || '—'}</div></div>
                <div><div className="text-xs text-blue-700">Variabilný symbol</div><div className="font-mono">{invoice.variable_symbol || invoice.number.replace(/\D/g, '')}</div></div>
                <div><div className="text-xs text-blue-700">Suma</div><div className="font-mono font-bold">{fmtEur(remaining)}</div></div>
              </div>
            </div>
          )}
        </div>

        <div className="text-center text-xs text-slate-400 mt-6">
          Bezpečný link · Vygenerované cez <a href="https://zolo.sk" className="text-blue-500 hover:underline">ZOLO</a>
        </div>
      </div>
    </div>
  );
}
