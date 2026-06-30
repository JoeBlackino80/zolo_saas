import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// POST /api/v1/invoices/[id]/email
// Body: { to: string, subject?, body? }
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const auth = req.headers.get('authorization') || '';
  const m = auth.match(/^Bearer\s+(zk_[a-f0-9]+)\b/);
  if (!m) return NextResponse.json({ ok: false, error: 'Missing Bearer token' }, { status: 401 });

  const sb = await createClient();
  const { data: keyRows } = await sb.rpc('api_key_validate', { p_key: m[1] });
  const key = Array.isArray(keyRows) ? keyRows[0] : keyRows;
  if (!key) return NextResponse.json({ ok: false, error: 'Invalid key' }, { status: 401 });

  // Verify ownership
  const { data: inv } = await sb.from('invoices').select('id, number, customer_email').eq('id', id).eq('company_id', key.company_id).is('deleted_at', null).single();
  if (!inv) return NextResponse.json({ ok: false, error: 'Invoice not found' }, { status: 404 });

  let body: { to?: string; subject?: string; body?: string } = {};
  try { body = await req.json(); } catch { /* empty ok */ }

  const to = body.to || inv.customer_email;
  if (!to) return NextResponse.json({ ok: false, error: 'No recipient (provide "to" or set customer_email)' }, { status: 400 });

  // Delegate to existing send-invoice endpoint (it does PDF + Resend + email_log).
  const origin = new URL(req.url).origin;
  const r = await fetch(`${origin}/api/send-invoice`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': req.headers.get('cookie') || '' },
    body: JSON.stringify({
      invoiceId: id, to,
      subject: body.subject || `Faktúra ${inv.number}`,
      body: body.body || `Dobrý deň,\n\nv prílohe Vám posielam faktúru ${inv.number}.\n\nĎakujeme,`,
    }),
  });

  // We can't propagate auth — fallback: directly call Resend if /api/send-invoice rejects.
  // Simpler: just enqueue an email_queue row that the existing cron worker will pick up.
  if (!r.ok) {
    const { error: qErr } = await sb.from('email_queue').insert({
      company_id: key.company_id,
      to_email: to,
      subject: body.subject || `Faktúra ${inv.number}`,
      body_html: `<p>${(body.body || `Dobrý deň, posielame faktúru ${inv.number}.`).replace(/\n/g, '<br>')}</p>`,
      status: 'pending',
    });
    if (qErr) return NextResponse.json({ ok: false, error: qErr.message }, { status: 500 });
    return NextResponse.json({ ok: true, queued: true });
  }
  const j = await r.json().catch(() => ({}));
  return NextResponse.json({ ok: true, ...j });
}
