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

// GET /api/v1/invoices/[id] — single invoice with items
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const a = await authenticate(req);
  if ('error' in a) return NextResponse.json({ ok: false, error: a.error }, { status: a.status });

  const { data, error } = await a.sb
    .from('invoices')
    .select('*, invoice_items(position, description, quantity, unit, unit_price, vat_rate, subtotal, vat_amount, total)')
    .eq('id', id)
    .eq('company_id', a.key.company_id)
    .is('deleted_at', null)
    .single();
  if (error || !data) return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 });
  return NextResponse.json({ ok: true, invoice: data });
}
