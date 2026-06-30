import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Bearer-auth public API: GET /api/v1/invoices?limit=50&type=invoice
export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization') || '';
  const m = auth.match(/^Bearer\s+(zk_[a-f0-9]+)\b/);
  if (!m) return NextResponse.json({ ok: false, error: 'Missing or invalid Bearer token' }, { status: 401 });

  const sb = await createClient();
  const { data: keyRows, error: keyErr } = await sb.rpc('api_key_validate', { p_key: m[1] });
  if (keyErr) return NextResponse.json({ ok: false, error: keyErr.message }, { status: 500 });
  const key = Array.isArray(keyRows) ? keyRows[0] : keyRows;
  if (!key) return NextResponse.json({ ok: false, error: 'Invalid or revoked key' }, { status: 401 });

  const limit = Math.min(parseInt(req.nextUrl.searchParams.get('limit') || '50', 10), 200);
  const type = req.nextUrl.searchParams.get('type');
  let q = sb.from('invoices')
    .select('id, number, type, issue_date, due_date, customer_name, supplier_name, subtotal, vat_amount, total, paid_amount, status, currency')
    .eq('company_id', key.company_id)
    .is('deleted_at', null)
    .order('issue_date', { ascending: false })
    .limit(limit);
  if (type) q = q.eq('type', type);

  const { data, error } = await q;
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, count: data?.length || 0, invoices: data });
}
