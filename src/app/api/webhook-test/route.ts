import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { fireWebhook } from '@/lib/webhooks';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// POST /api/webhook-test  body: { webhook_config_id }
export async function POST(req: NextRequest) {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

  let body: { webhook_config_id?: string } = {};
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 }); }
  if (!body.webhook_config_id) return NextResponse.json({ ok: false, error: 'webhook_config_id required' }, { status: 400 });

  const { data: cfg } = await sb.from('webhook_configs').select('company_id, url, webhook_url, secret').eq('id', body.webhook_config_id).single();
  if (!cfg) return NextResponse.json({ ok: false, error: 'Webhook config not found' }, { status: 404 });

  const url = cfg.url || cfg.webhook_url;
  if (!url) return NextResponse.json({ ok: false, error: 'No URL configured' }, { status: 400 });

  await fireWebhook(cfg.company_id, 'test.ping', { ts: new Date().toISOString(), message: 'Hello from ZOLO!' }, sb);

  // Read back the last delivery row for this config
  const { data: delivery } = await sb.from('webhook_deliveries')
    .select('response_status, success, response_body, delivered_at')
    .eq('webhook_config_id', body.webhook_config_id)
    .order('delivered_at', { ascending: false })
    .limit(1)
    .single();

  return NextResponse.json({ ok: true, delivery });
}
