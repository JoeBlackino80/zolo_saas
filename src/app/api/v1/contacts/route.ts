import { NextRequest, NextResponse } from 'next/server';
import { guardV1 } from '@/lib/api-guard';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const g = await guardV1(req, 'read');
  if (g instanceof NextResponse) return g;

  const limit = Math.min(parseInt(req.nextUrl.searchParams.get('limit') || '100', 10), 500);
  const { data, error } = await g.sb.from('contacts')
    .select('id, name, type, ico, dic, ic_dph, email, street, city, zip, country')
    .eq('company_id', g.key.company_id)
    .is('deleted_at', null)
    .order('name')
    .limit(limit);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, count: data?.length || 0, contacts: data });
}

export async function POST(req: NextRequest) {
  const g = await guardV1(req, 'write');
  if (g instanceof NextResponse) return g;

  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 }); }
  if (!body.name) return NextResponse.json({ ok: false, error: 'name required' }, { status: 400 });

  const { data, error } = await g.sb.from('contacts').insert({
    company_id: g.key.company_id,
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
