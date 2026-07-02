import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { rateLimit, getClientIp } from '@/lib/ratelimit';

export type ApiKey = {
  id: string;
  company_id: string;
};

// Shared authenticate + rate limit guard for /api/v1/* endpoints
// Vracia { key, sb } pri úspechu alebo NextResponse chybu ktorú treba
// vrátiť z endpointu.
export async function guardV1(
  req: NextRequest,
  bucket: 'read' | 'write' = 'read'
): Promise<{ key: ApiKey; sb: Awaited<ReturnType<typeof createClient>> } | NextResponse> {
  const auth = req.headers.get('authorization') || '';
  const m = auth.match(/^Bearer\s+(zk_[a-f0-9]+)\b/);
  if (!m) return NextResponse.json({ ok: false, error: 'Missing Bearer token' }, { status: 401 });

  const sb = await createClient();
  const { data: keyRows } = await sb.rpc('api_key_validate', { p_key: m[1] });
  const key = Array.isArray(keyRows) ? keyRows[0] : keyRows;
  if (!key) return NextResponse.json({ ok: false, error: 'Invalid or revoked key' }, { status: 401 });

  // Rate limit per company + IP; 300 reads/min alebo 60 writes/min
  const limit = bucket === 'read' ? 300 : 60;
  const rl = await rateLimit(`v1:${bucket}:${key.company_id}:${getClientIp(req)}`, limit, 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { ok: false, error: 'Rate limit exceeded' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil(rl.resetIn / 1000)) } }
    );
  }
  return { key: key as ApiKey, sb };
}
