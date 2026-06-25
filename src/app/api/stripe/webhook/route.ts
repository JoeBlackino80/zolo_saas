import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';

export const runtime = 'nodejs';

// POST /api/stripe/webhook — handles BOTH:
//   1) Customer invoice payments (per-firm Stripe key → metadata.invoice_id)
//   2) ZOLO platform subscriptions (ZOLO_STRIPE_KEY → subscription events)
export async function POST(request: Request) {
  const sig = request.headers.get('stripe-signature');
  if (!sig) return NextResponse.json({ ok: false, error: 'Missing signature' }, { status: 400 });

  const body = await request.text();
  const ZOLO_WEBHOOK_SECRET = process.env.ZOLO_STRIPE_WEBHOOK_SECRET;
  const ZOLO_STRIPE_KEY = process.env.ZOLO_STRIPE_KEY;
  // Per-firm webhook secret (used when customers pay invoices via their own Stripe)
  const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
  const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || ZOLO_STRIPE_KEY;
  if (!STRIPE_SECRET_KEY) return NextResponse.json({ ok: false, error: 'Stripe not configured' }, { status: 500 });
  const stripe = new Stripe(STRIPE_SECRET_KEY);

  // Try both secrets — first ZOLO platform, then per-firm
  let event: Stripe.Event | null = null;
  let isZoloPlatform = false;
  if (ZOLO_WEBHOOK_SECRET) {
    try {
      event = await stripe.webhooks.constructEventAsync(body, sig, ZOLO_WEBHOOK_SECRET);
      isZoloPlatform = true;
    } catch { /* fall through to per-firm */ }
  }
  if (!event && STRIPE_WEBHOOK_SECRET) {
    try { event = await stripe.webhooks.constructEventAsync(body, sig, STRIPE_WEBHOOK_SECRET); } catch { /* */ }
  }
  if (!event) return NextResponse.json({ ok: false, error: 'Signature verification failed' }, { status: 400 });

  const sb = await createClient();

  // === ZOLO platform subscription events ===
  if (isZoloPlatform) {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription;
        const userId = sub.metadata?.user_id;
        const plan = (sub.metadata?.plan as string) || (sub.items.data[0]?.price?.lookup_key as string) || 'pro';
        // Newer Stripe API moves period to items
        const periodEnd = (sub as unknown as { current_period_end?: number }).current_period_end || sub.items.data[0]?.current_period_end;
        if (userId) {
          await sb.from('account_subscriptions').upsert({
            user_id: userId,
            plan,
            status: sub.status,
            stripe_customer_id: typeof sub.customer === 'string' ? sub.customer : sub.customer.id,
            stripe_subscription_id: sub.id,
            current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
            trial_ends_at: sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null,
          }, { onConflict: 'user_id' });
        }
        break;
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        await sb.from('account_subscriptions').update({ plan: 'free', status: 'canceled', stripe_subscription_id: null }).eq('stripe_subscription_id', sub.id);
        break;
      }
    }
    return NextResponse.json({ ok: true, type: event.type, scope: 'platform' });
  }

  // === Per-firm invoice payments (existing flow) ===
  if (event.type === 'checkout.session.completed' || event.type === 'payment_intent.succeeded') {
    const obj = event.data.object as Stripe.Checkout.Session | Stripe.PaymentIntent;
    const invoiceId = obj.metadata?.invoice_id;
    if (invoiceId) {
      const { data: invoice } = await sb.from('invoices').select('total, company_id').eq('id', invoiceId).single();
      if (invoice) {
        await sb.from('invoices').update({ paid_amount: Number(invoice.total), status: 'paid' }).eq('id', invoiceId);
        await sb.from('invoice_payments').insert([{
          company_id: invoice.company_id, invoice_id: invoiceId,
          payment_date: new Date().toISOString().slice(0, 10),
          amount: Number(invoice.total), payment_method: 'stripe',
          notes: `Stripe ${event.type} · ${event.id}`,
        }]);
      }
    }
  }

  return NextResponse.json({ ok: true, type: event.type, scope: 'firm' });
}
