import { NextRequest, NextResponse } from 'next/server';
import { guardV1 } from '@/lib/api-guard';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const g = await guardV1(req, 'read');
  if (g instanceof NextResponse) return g;

  const limit = Math.min(parseInt(req.nextUrl.searchParams.get('limit') || '50', 10), 200);
  const entryType = req.nextUrl.searchParams.get('entry_type');
  const from = req.nextUrl.searchParams.get('from');
  const to = req.nextUrl.searchParams.get('to');

  let q = g.sb.from('journal_entries')
    .select('id, entry_number, entry_type, entry_date, description, total_debit, total_credit, source_invoice_id, journal_entry_lines(account_code, side, debit_amount, credit_amount, description)')
    .eq('company_id', g.key.company_id)
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
