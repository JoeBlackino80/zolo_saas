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

// GET /api/v1/journal?limit=50&entry_type=FA&from=2026-01-01&to=2026-12-31
export async function GET(req: NextRequest) {
  const a = await authenticate(req);
  if ('error' in a) return NextResponse.json({ ok: false, error: a.error }, { status: a.status });

  const limit = Math.min(parseInt(req.nextUrl.searchParams.get('limit') || '50', 10), 200);
  const entryType = req.nextUrl.searchParams.get('entry_type');
  const from = req.nextUrl.searchParams.get('from');
  const to = req.nextUrl.searchParams.get('to');

  let q = a.sb.from('journal_entries')
    .select('id, entry_number, entry_type, entry_date, description, total_debit, total_credit, source_invoice_id, journal_entry_lines(account_code, side, debit_amount, credit_amount, description)')
    .eq('company_id', a.key.company_id)
    .is('deleted_at', null)
    .order('entry_date', { ascending: false })
    .limit(limit);
  if (entryType) q = q.eq('entry_type', entryType);
  if (from) q = q.gte('entry_date', from);
  if (to) q = q.lte('entry_date', to);

  const { data, error } = await q;
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, count: data?.length || 0, entries: data });
}
