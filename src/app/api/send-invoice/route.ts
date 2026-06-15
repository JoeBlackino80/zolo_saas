import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// POST /api/send-invoice
// Body: { invoiceId: string, to: string, subject?: string, body?: string }
// Returns: { ok: boolean, error?: string }
export async function POST(request: Request) {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

  const { invoiceId, to, subject, body } = await request.json();
  if (!invoiceId || !to) return NextResponse.json({ ok: false, error: 'Missing invoiceId or to' }, { status: 400 });

  const { data: invoice } = await sb.from('invoices').select('id, number, total, company_id, customer_name').eq('id', invoiceId).single();
  if (!invoice) return NextResponse.json({ ok: false, error: 'Invoice not found' }, { status: 404 });

  // Log to email_queue (table already exists in schema)
  const { error: qErr } = await sb.from('email_queue').insert([{
    company_id: invoice.company_id,
    to_email: to,
    subject: subject || `Faktúra ${invoice.number}`,
    body_html: body || `<p>Dobrý deň,</p><p>posielam Vám faktúru <strong>${invoice.number}</strong> na sumu <strong>${invoice.total} €</strong>.</p><p>S pozdravom</p>`,
    status: 'pending',
    invoice_id: invoiceId,
    created_by: user.id,
  }]);
  if (qErr) return NextResponse.json({ ok: false, error: qErr.message }, { status: 500 });

  // Mark invoice as sent
  await sb.from('invoices').update({ sent_at: new Date().toISOString(), sent_to: to, status: 'sent' }).eq('id', invoiceId);

  // TODO: Actual SMTP send via Resend Edge Function
  // const RESEND_KEY = process.env.RESEND_API_KEY;
  // if (RESEND_KEY) {
  //   await fetch('https://api.resend.com/emails', { ... });
  // }

  return NextResponse.json({ ok: true, queued: true });
}
