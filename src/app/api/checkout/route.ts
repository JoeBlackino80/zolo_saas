import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import Stripe from 'stripe';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// POST /api/checkout
// Body: { plan: 'pro' | 'business' }
// Returns: { ok, url } where url is Stripe Checkout session
export async function POST(request: Request) {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

  const { plan } = await request.json();
  if (!['pro', 'business'].includes(plan)) {
    return NextResponse.json({ ok: false, error: 'Invalid plan' }, { status: 400 });
  }

  const ZOLO_STRIPE_KEY = process.env.ZOLO_STRIPE_KEY;
  const priceId = plan === 'pro' ? process.env.ZOLO_STRIPE_PRO_PRICE_ID : process.env.ZOLO_STRIPE_BUSINESS_PRICE_ID;
  if (!ZOLO_STRIPE_KEY || !priceId) {
    return NextResponse.json({ ok: false, error: 'Billing nie je zatiaľ aktivované — kontaktuj nás' }, { status: 503 });
  }

  const stripe = new Stripe(ZOLO_STRIPE_KEY);
  const origin = new URL(request.url).origin;

  // Get or create Stripe customer
  const { data: existingSub } = await sb.from('account_subscriptions').select('stripe_customer_id').eq('user_id', user.id).maybeSingle();
  let customerId = existingSub?.stripe_customer_id;
  if (!customerId) {
    const customer = await stripe.customers.create({ email: user.email!, metadata: { user_id: user.id } });
    customerId = customer.id;
    await sb.from('account_subscriptions').upsert({ user_id: user.id, stripe_customer_id: customerId, plan: 'free', status: 'active' }, { onConflict: 'user_id' });
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    subscription_data: { trial_period_days: 14, metadata: { user_id: user.id, plan } },
    success_url: `${origin}/dashboard/settings?upgrade=success`,
    cancel_url: `${origin}/pricing?canceled=1`,
    locale: 'sk',
    allow_promotion_codes: true,
  });

  return NextResponse.json({ ok: true, url: session.url });
}
