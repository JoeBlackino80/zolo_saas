import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const RESEND_KEY = process.env.RESEND_API_KEY;
const FROM = process.env.EMAIL_FROM || 'ZOLO <noreply@zolo.sk>';

function pickIp(request: Request): string {
  const fwd = request.headers.get('x-forwarded-for');
  return fwd ? fwd.split(',')[0].trim() : '0.0.0.0';
}

export async function POST(request: Request) {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

  const ip = pickIp(request);
  const country = request.headers.get('x-vercel-ip-country') || null;
  const userAgent = request.headers.get('user-agent') || 'unknown';

  const { data: rows, error } = await sb.rpc('log_login_event', {
    p_ip: ip,
    p_country: country,
    p_user_agent: userAgent,
    p_success: true,
  });
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  const row = Array.isArray(rows) ? rows[0] : rows;
  const isNew = !!row?.is_new_device;

  if (isNew && RESEND_KEY && user.email) {
    const when = new Date().toLocaleString('sk-SK', { timeZone: 'Europe/Bratislava' });
    const html = `
      <div style="font-family:system-ui,sans-serif;max-width:560px;padding:24px;color:#0f172a">
        <h2 style="margin:0 0 12px">Nové prihlásenie do ZOLO</h2>
        <p style="margin:0 0 16px;color:#475569">Zaregistrovali sme prihlásenie z nového zariadenia alebo krajiny.</p>
        <table style="width:100%;border-collapse:collapse;font-size:14px">
          <tr><td style="padding:6px 0;color:#64748b">Čas</td><td>${when}</td></tr>
          <tr><td style="padding:6px 0;color:#64748b">IP adresa</td><td>${ip}</td></tr>
          <tr><td style="padding:6px 0;color:#64748b">Krajina</td><td>${country || 'neznáma'}</td></tr>
          <tr><td style="padding:6px 0;color:#64748b">Prehliadač</td><td style="word-break:break-all">${userAgent}</td></tr>
        </table>
        <p style="margin:20px 0 0;color:#475569">Ak si to nebol ty, okamžite <a href="https://app.zolo.sk/dashboard/profile" style="color:#2563eb">zmeň heslo a aktivuj MFA</a>.</p>
        <p style="margin:20px 0 0;color:#94a3b8;font-size:12px">— ZOLO Security</p>
      </div>
    `;
    fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: FROM,
        to: user.email,
        subject: 'Nové prihlásenie do ZOLO',
        html,
      }),
    }).catch(() => undefined);
  }

  return NextResponse.json({ ok: true, isNewDevice: isNew });
}
