import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization') || '';
  const m = auth.match(/^Bearer\s+(zk_[a-f0-9]+)\b/);
  if (!m) return NextResponse.json({ ok: false, error: 'Missing Bearer token' }, { status: 401 });

  const sb = await createClient();
  const { data: keyRows } = await sb.rpc('api_key_validate', { p_key: m[1] });
  const key = Array.isArray(keyRows) ? keyRows[0] : keyRows;
  if (!key) return NextResponse.json({ ok: false, error: 'Invalid key' }, { status: 401 });

  const limit = Math.min(parseInt(req.nextUrl.searchParams.get('limit') || '100', 10), 500);
  const { data, error } = await sb.from('contacts')
    .select('id, name, type, ico, dic, ic_dph, email, street, city, zip, country')
    .eq('company_id', key.company_id)
    .is('deleted_at', null)
    .order('name')
    .limit(limit);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, count: data?.length || 0, contacts: data });
}
