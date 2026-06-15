import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// POST /api/portal-link
// Body: { invoiceId: string, expiresDays?: number }
// Returns: { ok, url, token, expires_at }
export async function POST(request: Request) {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

  const { invoiceId, expiresDays } = await request.json();
  if (!invoiceId) return NextResponse.json({ ok: false, error: 'Missing invoiceId' }, { status: 400 });

  const token = generateToken(32);
  const expiresAt = new Date(Date.now() + (expiresDays || 30) * 86400000);

  const { error } = await sb.from('portal_tokens').insert([{
    token,
    invoice_id: invoiceId,
    expires_at: expiresAt.toISOString(),
    created_by: user.id,
  }]);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  const origin = new URL(request.url).origin;
  const url = `${origin}/portal/${token}`;

  return NextResponse.json({ ok: true, url, token, expires_at: expiresAt.toISOString() });
}

function generateToken(len: number): string {
  const arr = new Uint8Array(len);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('');
}
