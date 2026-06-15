import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';

// POST /api/stripe/webhook
// Verifies Stripe signature → marks invoices paid on payment_intent.succeeded
export async function POST(request: Request) {
  const sig = request.headers.get('stripe-signature');
  if (!sig) return NextResponse.json({ ok: false, error: 'Missing signature' }, { status: 400 });

  const body = await request.text();
  const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
  const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

  if (!STRIPE_WEBHOOK_SECRET || !STRIPE_SECRET_KEY) {
    return NextResponse.json({ ok: false, error: 'Stripe not configured' }, { status: 500 });
  }

  const stripe = new Stripe(STRIPE_SECRET_KEY);

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, sig, STRIPE_WEBHOOK_SECRET);
  } catch (e) {
    return NextResponse.json({ ok: false, error: 'Signature verification failed: ' + (e as Error).message }, { status: 400 });
  }

  const sb = await createClient();

  if (event.type === 'checkout.session.completed' || event.type === 'payment_intent.succeeded') {
    const obj = event.data.object as Stripe.Checkout.Session | Stripe.PaymentIntent;
    const invoiceId = obj.metadata?.invoice_id;
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

  return NextResponse.json({ ok: true, received: true, type: event.type });
}
