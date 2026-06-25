import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { rateLimit, getClientIp } from '@/lib/ratelimit';

// POST /api/payment-link
// Body: { invoiceId: string }
// Returns: { ok, url, error? }
// Generates Stripe Payment Link for the invoice
export async function POST(request: Request) {
  const ip = getClientIp(request);
  const rl = await rateLimit(`payment-link:${ip}`, 30, 60_000);
  if (!rl.allowed) {
    return NextResponse.json({ ok: false, error: 'Rate limit exceeded' }, { status: 429, headers: { 'Retry-After': String(Math.ceil(rl.resetIn / 1000)) } });
  }

  const sb = await createClient();
  const { invoiceId, token } = await request.json();

  let invoice: { id: string; number: string; total: number; currency: string } | null = null;
  let stripeKey: string | null = null;

  if (token) {
    // Public: resolve via security-definer RPC
    const { data, error } = await sb.rpc('get_invoice_for_stripe_by_token', { p_token: token });
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    const row = Array.isArray(data) ? data[0] : data;
    if (!row) return NextResponse.json({ ok: false, error: 'Invoice not found' }, { status: 404 });
    invoice = { id: row.invoice_id, number: row.number, total: Number(row.total), currency: row.currency || 'EUR' };
    stripeKey = row.stripe_key;
  } else if (invoiceId) {
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    const { data: inv } = await sb.from('invoices').select('id, number, total, currency, company_id').eq('id', invoiceId).single();
    if (!inv) return NextResponse.json({ ok: false, error: 'Invoice not found' }, { status: 404 });
    invoice = inv;
    const { data: settings } = await sb.from('payment_settings').select('stripe_key').eq('company_id', inv.company_id).single();
    stripeKey = settings?.stripe_key ?? null;
  } else {
    return NextResponse.json({ ok: false, error: 'Missing invoiceId or token' }, { status: 400 });
  }
  if (!invoice) return NextResponse.json({ ok: false, error: 'Invoice not found' }, { status: 404 });

  if (!stripeKey) {
    return NextResponse.json({
      ok: false,
      error: 'Stripe nie je nakonfigurovaný pre túto firmu. Choď do Nastavenia → Platby a pridaj Stripe API kľúč.',
    }, { status: 400 });
  }
  const settings = { stripe_key: stripeKey };

  // Create Stripe Payment Link via API
  try {
    // First create a Price (one-time) for this invoice
    const priceResp = await fetch('https://api.stripe.com/v1/prices', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${settings.stripe_key}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        currency: (invoice.currency || 'eur').toLowerCase(),
        unit_amount: String(Math.round(Number(invoice.total) * 100)),
        'product_data[name]': `Faktúra ${invoice.number}`,
      }),
    });
    if (!priceResp.ok) {
      const t = await priceResp.text();
      throw new Error('Stripe price error: ' + t.slice(0, 200));
    }
    const price = await priceResp.json();

    const linkResp = await fetch('https://api.stripe.com/v1/payment_links', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${settings.stripe_key}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        'line_items[0][price]': price.id,
        'line_items[0][quantity]': '1',
        'metadata[invoice_id]': invoice.id,
        'metadata[invoice_number]': invoice.number,
      }),
    });
    if (!linkResp.ok) {
      const t = await linkResp.text();
      throw new Error('Stripe link error: ' + t.slice(0, 200));
    }
    const link = await linkResp.json();

    return NextResponse.json({ ok: true, url: link.url });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
