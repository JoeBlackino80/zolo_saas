import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { fireWebhook } from '@/lib/webhooks';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// POST /api/v1/invoices/[id]/pay
// Body: { amount?, method?='bank', notes? }
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const auth = req.headers.get('authorization') || '';
  const m = auth.match(/^Bearer\s+(zk_[a-f0-9]+)\b/);
  if (!m) return NextResponse.json({ ok: false, error: 'Missing Bearer token' }, { status: 401 });

  const sb = await createClient();
  const { data: keyRows } = await sb.rpc('api_key_validate', { p_key: m[1] });
  const key = Array.isArray(keyRows) ? keyRows[0] : keyRows;
  if (!key) return NextResponse.json({ ok: false, error: 'Invalid key' }, { status: 401 });

  // Verify invoice belongs to key's company
  const { data: inv, error: ie } = await sb.from('invoices').select('id, number, total, paid_amount, company_id').eq('id', id).eq('company_id', key.company_id).is('deleted_at', null).single();
  if (ie || !inv) return NextResponse.json({ ok: false, error: 'Invoice not found' }, { status: 404 });

  let body: { amount?: number; method?: string; notes?: string } = {};
  try { body = await req.json(); } catch { /* empty body ok */ }

  const remaining = Number(inv.total) - Number(inv.paid_amount || 0);
  const amount = body.amount ?? remaining;
  const method = body.method || 'bank';

  const { data: payId, error: pErr } = await sb.rpc('mark_invoice_paid', {
    p_invoice_id: id,
    p_amount: amount,
    p_method: method,
    p_notes: body.notes || 'API payment',
  });
  if (pErr) return NextResponse.json({ ok: false, error: pErr.message }, { status: 500 });

  fireWebhook(key.company_id, 'invoice.paid', { id: inv.id, number: inv.number, amount, payment_id: payId }, sb).catch(() => undefined);

  return NextResponse.json({ ok: true, payment_id: payId, invoice_id: id, amount, method });
}
