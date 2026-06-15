import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// POST /api/stripe/webhook
// Listens for Stripe events (payment.completed) → marks invoice as paid
export async function POST(request: Request) {
  const sig = request.headers.get('stripe-signature');
  if (!sig) return NextResponse.json({ ok: false, error: 'No signature' }, { status: 400 });

  const body = await request.text();
  // TODO: Verify signature with STRIPE_WEBHOOK_SECRET via Stripe SDK
  // For now, parse the event
  let event;
  try {
    event = JSON.parse(body);
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const sb = await createClient();

  if (event.type === 'checkout.session.completed' || event.type === 'payment_intent.succeeded') {
    const invoiceId = event.data?.object?.metadata?.invoice_id;
    if (invoiceId) {
      const { data: invoice } = await sb.from('invoices').select('total').eq('id', invoiceId).single();
      if (invoice) {
        await sb.from('invoices').update({
          paid_amount: Number(invoice.total),
          status: 'paid',
        }).eq('id', invoiceId);
        await sb.from('invoice_payments').insert([{
          invoice_id: invoiceId,
          payment_date: new Date().toISOString().slice(0, 10),
          amount: Number(invoice.total),
          payment_method: 'stripe',
          notes: `Stripe ${event.type} · ${event.id}`,
        }]);
      }
    }
  }

  return NextResponse.json({ ok: true, received: true });
}
