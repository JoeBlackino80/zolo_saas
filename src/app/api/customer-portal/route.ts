import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import Stripe from 'stripe';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// POST /api/customer-portal — Stripe Customer Portal session for subscription mgmt
export async function POST(request: Request) {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

  const { data: sub } = await sb.from('account_subscriptions').select('stripe_customer_id').eq('user_id', user.id).maybeSingle();
  if (!sub?.stripe_customer_id) return NextResponse.json({ ok: false, error: 'Žiadne predplatné' }, { status: 400 });

  const ZOLO_STRIPE_KEY = process.env.ZOLO_STRIPE_KEY;
  if (!ZOLO_STRIPE_KEY) return NextResponse.json({ ok: false, error: 'Billing nie je dostupné' }, { status: 503 });

  const stripe = new Stripe(ZOLO_STRIPE_KEY);
  const origin = new URL(request.url).origin;
  const session = await stripe.billingPortal.sessions.create({
    customer: sub.stripe_customer_id,
    return_url: `${origin}/dashboard/settings`,
  });
  return NextResponse.json({ ok: true, url: session.url });
}
