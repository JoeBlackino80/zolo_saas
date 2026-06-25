import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { rateLimit, getClientIp } from '@/lib/ratelimit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// POST /api/send-invite — sends the invitation email after the row is inserted
// Body: { invitationId }  (the form first inserts to team_invitations, then calls this with row id)
export async function POST(request: Request) {
  const ip = getClientIp(request);
  const rl = await rateLimit(`send-invite:${ip}`, 20, 60_000);
  if (!rl.allowed) return NextResponse.json({ ok: false, error: 'Rate limit' }, { status: 429, headers: { 'Retry-After': String(Math.ceil(rl.resetIn / 1000)) } });

  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

  const { invitationId } = await request.json();
  if (!invitationId) return NextResponse.json({ ok: false, error: 'Missing invitationId' }, { status: 400 });

  const { data: invite } = await sb
    .from('team_invitations')
    .select('id, invited_email, role, invitation_token, expires_at, companies(name)')
    .eq('id', invitationId)
    .eq('invited_by', user.id)
    .single();
  if (!invite) return NextResponse.json({ ok: false, error: 'Invitation not found' }, { status: 404 });

  const co = Array.isArray(invite.companies) ? invite.companies[0] : invite.companies;
  const origin = new URL(request.url).origin.replace(/^http:\/\/localhost.*/, 'https://zolo.sk');
  const acceptUrl = `${origin}/invite/${invite.invitation_token}`;
  const roleLabel: Record<string, string> = { admin: 'Admin', accountant: 'Účtovník', viewer: 'Iba čítanie' };

  const html = `<div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;padding:32px;color:#0f172a">
    <div style="display:inline-block;width:48px;height:48px;border-radius:12px;background:linear-gradient(135deg,#3b82f6,#a855f7);color:#fff;font-weight:800;font-size:24px;text-align:center;line-height:48px;margin-bottom:24px">Z</div>
    <h1 style="font-size:20px;margin:0 0 12px 0">Pozvánka do firmy ${co?.name || ''}</h1>
    <p>${user.email} ťa pozval(a) ako <strong>${roleLabel[invite.role] || invite.role}</strong> do účtovnej platformy ZOLO.</p>
    <p style="margin:24px 0">
      <a href="${acceptUrl}" style="display:inline-block;padding:12px 24px;background:linear-gradient(135deg,#3b82f6,#6366f1);color:#fff;text-decoration:none;border-radius:8px;font-weight:600">Prijať pozvánku</a>
    </p>
    <p style="color:#64748b;font-size:13px">Odkaz platí do ${new Date(invite.expires_at).toLocaleDateString('sk-SK')}.</p>
    <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0"/>
    <p style="color:#94a3b8;font-size:12px">ZOLO · Slovak Tax &amp; Accounting · zolo.sk</p>
  </div>`;

  const RESEND_KEY = process.env.RESEND_API_KEY;
  const FROM = process.env.EMAIL_FROM || 'ZOLO <noreply@zolo.sk>';
  if (!RESEND_KEY) return NextResponse.json({ ok: false, error: 'RESEND_API_KEY not configured' }, { status: 500 });

  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST', headers: { 'Authorization': `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: FROM, to: invite.invited_email, subject: `Pozvánka do ZOLO — ${co?.name || ''}`, html }),
  });
  const j = await r.json();
  if (!r.ok) return NextResponse.json({ ok: false, error: j?.message || `Resend ${r.status}` }, { status: 500 });

  return NextResponse.json({ ok: true, providerId: j.id });
}
