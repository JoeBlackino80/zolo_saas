import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { fireWebhook } from '@/lib/webhooks';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Internal trigger used by client UI after performing an action.
// Body: { companyId, event, data }
export async function POST(req: NextRequest) {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

  let body: { companyId?: string; event?: string; data?: Record<string, unknown> } = {};
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 }); }
  if (!body.companyId || !body.event) return NextResponse.json({ ok: false, error: 'companyId + event required' }, { status: 400 });

  // Verify user is member of the company
  const { data: role } = await sb.from('user_company_roles').select('user_id').eq('user_id', user.id).eq('company_id', body.companyId).maybeSingle();
  if (!role) return NextResponse.json({ ok: false, error: 'Not a member' }, { status: 403 });

  // Fire-and-forget (await so we can return status)
  await fireWebhook(body.companyId, body.event, body.data || {}, sb);
  return NextResponse.json({ ok: true });
}
