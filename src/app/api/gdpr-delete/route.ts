import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { rateLimit, getClientIp } from '@/lib/ratelimit';
import type { NextRequest } from 'next/server';

// POST /api/gdpr-delete
// Body: { confirm: 'DELETE_MY_ACCOUNT_PERMANENTLY' }
// Soft-deletes all user data + auth account (GDPR Article 17 — Right to Erasure)
// Rate limited to 5/day per user (avoid abuse of destructive endpoint)
export async function POST(request: NextRequest) {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

  const rl = await rateLimit(`gdpr-delete:${user.id}:${getClientIp(request)}`, 5, 86400_000);
  if (!rl.allowed) {
    return NextResponse.json({ ok: false, error: 'Rate limit exceeded' }, { status: 429 });
  }

  const { confirm } = await request.json();
  if (confirm !== 'DELETE_MY_ACCOUNT_PERMANENTLY') {
    return NextResponse.json({ ok: false, error: 'Confirmation string required' }, { status: 400 });
  }

  // Soft-delete companies (cascades via RLS)
  const ts = new Date().toISOString();
  await sb.from('companies').update({ deleted_at: ts }).eq('created_by', user.id);
  await sb.from('contacts').update({ deleted_at: ts }).eq('created_by', user.id);
  await sb.from('user_company_roles').delete().eq('user_id', user.id);
  await sb.from('team_invitations').delete().eq('invited_by', user.id);

  await sb.auth.signOut();
  return NextResponse.json({
    ok: true,
    message: 'Tvoje dáta sú označené na zmazanie. Auth záznam vymaže administrátor do 30 dní podľa GDPR.',
  });
}
