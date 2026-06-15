import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// POST /api/payment-link
// Body: { invoiceId: string }
// Returns: { ok, url, error? }
// Generates Stripe Payment Link for the invoice
export async function POST(request: Request) {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

  const { invoiceId } = await request.json();
  if (!invoiceId) return NextResponse.json({ ok: false, error: 'Missing invoiceId' }, { status: 400 });

  const { data: invoice } = await sb
    .from('invoices')
    .select('id, number, total, currency, company_id, customer_name')
    .eq('id', invoiceId)
    .single();
  if (!invoice) return NextResponse.json({ ok: false, error: 'Invoice not found' }, { status: 404 });

  // Get firm payment settings (Stripe API key)
  const { data: settings } = await sb
    .from('payment_settings')
    .select('stripe_secret_key, stripe_account_id')
    .eq('company_id', invoice.company_id)
    .single();

  if (!settings?.stripe_secret_key) {
    return NextResponse.json({
      ok: false,
      error: 'Stripe nie je nakonfigurovaný pre túto firmu. Choď do Nastavenia → Platby a pridaj Stripe API kľúč.',
    }, { status: 400 });
  }

  // Create Stripe Payment Link via API
  try {
    // First create a Price (one-time) for this invoice
    const priceResp = await fetch('https://api.stripe.com/v1/prices', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${settings.stripe_secret_key}`,
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
        Authorization: `Bearer ${settings.stripe_secret_key}`,
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
