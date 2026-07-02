import { NextRequest, NextResponse } from 'next/server';
import { guardV1 } from '@/lib/api-guard';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const g = await guardV1(req, 'read');
  if (g instanceof NextResponse) return g;

  const limit = Math.min(parseInt(req.nextUrl.searchParams.get('limit') || '100', 10), 500);
  const { data, error } = await g.sb.from('products')
    .select('id, name, sku, ean, unit, vat_rate, purchase_price, selling_price, category, is_active')
    .eq('company_id', g.key.company_id)
    .is('deleted_at', null)
    .order('name')
    .limit(limit);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, count: data?.length || 0, products: data });
}

export async function POST(req: NextRequest) {
  const g = await guardV1(req, 'write');
  if (g instanceof NextResponse) return g;

  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 }); }
  if (!body.name) return NextResponse.json({ ok: false, error: 'name required' }, { status: 400 });

  const { data, error } = await g.sb.from('products').insert({
    company_id: g.key.company_id,
    name: body.name,
    sku: body.sku ?? null,
    ean: body.ean ?? null,
    unit: body.unit ?? 'ks',
    vat_rate: body.vat_rate ?? 23,
    purchase_price: body.purchase_price ?? 0,
    selling_price: body.selling_price ?? 0,
    category: body.category ?? null,
    min_stock: body.min_stock ?? null,
    max_stock: body.max_stock ?? null,
    is_active: body.is_active ?? true,
  }).select('id, name, sku').single();
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, ...data }, { status: 201 });
}
