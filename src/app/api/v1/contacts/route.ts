import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function authenticate(req: NextRequest) {
  const auth = req.headers.get('authorization') || '';
  const m = auth.match(/^Bearer\s+(zk_[a-f0-9]+)\b/);
  if (!m) return { error: 'Missing Bearer token', status: 401 } as const;
  const sb = await createClient();
  const { data: keyRows } = await sb.rpc('api_key_validate', { p_key: m[1] });
  const key = Array.isArray(keyRows) ? keyRows[0] : keyRows;
  if (!key) return { error: 'Invalid key', status: 401 } as const;
  return { key, sb };
}

export async function GET(req: NextRequest) {
  const a = await authenticate(req);
  if ('error' in a) return NextResponse.json({ ok: false, error: a.error }, { status: a.status });
  const limit = Math.min(parseInt(req.nextUrl.searchParams.get('limit') || '100', 10), 500);
  const { data, error } = await a.sb.from('contacts')
    .select('id, name, type, ico, dic, ic_dph, email, street, city, zip, country')
    .eq('company_id', a.key.company_id)
    .is('deleted_at', null)
    .order('name')
    .limit(limit);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, count: data?.length || 0, contacts: data });
}

export async function POST(req: NextRequest) {
  const a = await authenticate(req);
  if ('error' in a) return NextResponse.json({ ok: false, error: a.error }, { status: a.status });

  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 }); }
  if (!body.name) return NextResponse.json({ ok: false, error: 'name required' }, { status: 400 });

  const { data, error } = await a.sb.from('contacts').insert({
    company_id: a.key.company_id,
    name: body.name,
    type: body.type || 'customer',
    ico: body.ico ?? null,
    dic: body.dic ?? null,
    ic_dph: body.ic_dph ?? null,
    email: body.email ?? null,
    street: body.street ?? null,
    city: body.city ?? null,
    zip: body.zip ?? null,
    country: body.country ?? 'SK',
  }).select('id, name').single();
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, id: data.id, name: data.name }, { status: 201 });
}
