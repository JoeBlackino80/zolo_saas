import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { rateLimit, getClientIp } from '@/lib/ratelimit';
import { renderToBuffer } from '@react-pdf/renderer';
import { InvoicePdfDoc, type InvoiceForPdf } from '@/lib/invoice-pdf';
import React from 'react';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// POST /api/send-invoice
// Body: { invoiceId, to, subject?, body? }
// Sends invoice with PDF attachment via Resend, logs to email_queue/email_log.
export async function POST(request: Request) {
  const ip = getClientIp(request);
  const rl = rateLimit(`send-invoice:${ip}`, 30, 60_000);
  if (!rl.allowed) {
    return NextResponse.json({ ok: false, error: 'Rate limit exceeded' }, { status: 429, headers: { 'Retry-After': String(Math.ceil(rl.resetIn / 1000)) } });
  }
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

  const { invoiceId, to, subject, body } = await request.json();
  if (!invoiceId || !to) return NextResponse.json({ ok: false, error: 'Missing invoiceId or to' }, { status: 400 });

  const { data: invoice } = await sb
    .from('invoices')
    .select('*, invoice_items(*), companies(name, ico, dic, ic_dph, street, city, zip, iban, bic, bank_name)')
    .eq('id', invoiceId)
    .is('deleted_at', null)
    .single();
  if (!invoice) return NextResponse.json({ ok: false, error: 'Invoice not found' }, { status: 404 });

  const co = Array.isArray(invoice.companies) ? invoice.companies[0] : invoice.companies;
  type Item = { position: number; description: string; quantity: number; unit: string; unit_price: number; vat_rate: number; subtotal: number; vat_amount: number; total: number };
  const items = ((invoice.invoice_items as Item[]) || []).sort((a, b) => a.position - b.position);

  const pdfDoc: InvoiceForPdf = {
    number: invoice.number, type: invoice.type, issue_date: invoice.issue_date, delivery_date: invoice.delivery_date,
    due_date: invoice.due_date, currency: invoice.currency || 'EUR',
    subtotal: Number(invoice.subtotal || 0), vat_amount: Number(invoice.vat_amount || 0), total: Number(invoice.total || 0),
    variable_symbol: invoice.variable_symbol, notes: invoice.notes,
    customer_name: invoice.customer_name, customer_ico: invoice.customer_ico, customer_dic: invoice.customer_dic, customer_ic_dph: invoice.customer_ic_dph,
    company: {
      name: co?.name || '', ico: co?.ico || null, dic: co?.dic || null, ic_dph: co?.ic_dph || null,
      street: co?.street || null, city: co?.city || null, zip: co?.zip || null,
      iban: co?.iban || null, bic: co?.bic || null, bank_name: co?.bank_name || null,
    },
    items: items.map((it) => ({
      position: it.position, description: it.description, quantity: it.quantity, unit: it.unit,
      unit_price: Number(it.unit_price), vat_rate: it.vat_rate,
      subtotal: Number(it.subtotal), vat_amount: Number(it.vat_amount), total: Number(it.total),
    })),
  };

  let pdfBuffer: Buffer;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    pdfBuffer = await renderToBuffer(React.createElement(InvoicePdfDoc, { invoice: pdfDoc }) as any);
  } catch (e) {
    return NextResponse.json({ ok: false, error: 'PDF render failed: ' + (e as Error).message }, { status: 500 });
  }

  const finalSubject = subject || `Faktúra ${invoice.number}`;
  const finalBody = body || `Dobrý deň,\n\nv prílohe Vám posielam faktúru ${invoice.number}.\n\nĎakujem,`;

  // Generate portal token automatically — link to view online + pay
  const tokenBytes = new Uint8Array(24);
  crypto.getRandomValues(tokenBytes);
  const portalToken = Array.from(tokenBytes, b => b.toString(16).padStart(2, '0')).join('');
  const portalExpires = new Date(Date.now() + 60 * 86400 * 1000).toISOString(); // 60 days
  await sb.from('portal_tokens').insert({ token: portalToken, invoice_id: invoiceId, expires_at: portalExpires, created_by: user.id });
  const origin = new URL(request.url).origin.replace(/^http:\/\/localhost.*/, 'https://zolo.sk');
  const portalUrl = `${origin}/portal/${portalToken}`;

  // Check if Stripe is configured → render "pay by card" CTA
  const { data: paySettings } = await sb.from('payment_settings').select('stripe_key').eq('company_id', invoice.company_id).maybeSingle();
  const stripeEnabled = !!paySettings?.stripe_key;
  const payCta = stripeEnabled
    ? `<p style="margin:24px 0;text-align:center"><a href="${portalUrl}" style="display:inline-block;padding:14px 28px;background:linear-gradient(135deg,#3b82f6,#a855f7);color:#fff;text-decoration:none;border-radius:10px;font-weight:600">Zaplatiť kartou · ${Number(invoice.total).toFixed(2).replace('.', ',')} ${invoice.currency || 'EUR'}</a></p>`
    : `<p style="margin:24px 0;text-align:center"><a href="${portalUrl}" style="display:inline-block;padding:12px 24px;background:#0f172a;color:#fff;text-decoration:none;border-radius:8px;font-weight:600">Zobraziť faktúru online</a></p>`;

  const bodyHtml = `<div style="font-family:system-ui,sans-serif;color:#0f172a;line-height:1.55;max-width:560px;margin:0 auto;padding:24px">
    ${finalBody.split('\n').map((l: string) => `<p style="margin:0 0 10px 0">${l.replace(/&/g,'&amp;').replace(/</g,'&lt;')}</p>`).join('')}
    ${payCta}
    <p style="color:#64748b;font-size:13px;text-align:center">Faktúra je tiež v prílohe ako PDF.</p>
    <hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0"/>
    <p style="color:#94a3b8;font-size:12px;text-align:center">Odoslané cez <a href="https://zolo.sk" style="color:#94a3b8">ZOLO</a></p>
  </div>`;

  const RESEND_KEY = process.env.RESEND_API_KEY;
  const FROM = process.env.EMAIL_FROM || 'ZOLO <noreply@zolo.sk>';
  let providerId: string | null = null;
  let sendOk = false;
  let sendError: string | null = null;

  if (RESEND_KEY) {
    try {
      const r = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: FROM, to, subject: finalSubject, html: bodyHtml,
          attachments: [{ filename: `${invoice.number}.pdf`, content: pdfBuffer.toString('base64') }],
        }),
      });
      const j = await r.json();
      if (r.ok && j.id) { providerId = j.id; sendOk = true; }
      else { sendError = j?.message || `Resend HTTP ${r.status}`; }
    } catch (e) {
      sendError = (e as Error).message;
    }
  } else {
    sendError = 'RESEND_API_KEY not configured';
  }

  await sb.from('email_queue').insert([{
    company_id: invoice.company_id, to_email: to, subject: finalSubject, body_html: bodyHtml,
    status: sendOk ? 'sent' : 'failed', invoice_id: invoiceId, created_by: user.id,
    from_email: FROM, provider_id: providerId, error_message: sendError, sent_at: sendOk ? new Date().toISOString() : null,
  }]);

  if (sendOk) {
    await sb.from('invoices').update({ sent_at: new Date().toISOString(), sent_to: to, status: 'sent' }).eq('id', invoiceId);
    return NextResponse.json({ ok: true, providerId });
  }
  return NextResponse.json({ ok: false, error: sendError || 'Send failed' }, { status: 500 });
}
