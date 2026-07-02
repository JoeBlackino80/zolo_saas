import { NextRequest, NextResponse } from 'next/server';
import { guardV1 } from '@/lib/api-guard';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const g = await guardV1(req, 'write');
  if (g instanceof NextResponse) return g;

  let body: {
    entry_type?: string; entry_date?: string; description?: string;
    lines?: { account_code: string; side: 'MD' | 'D'; amount: number; description?: string }[];
  } = {};
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 }); }

  const entryType = body.entry_type || 'ID';
  const entryDate = body.entry_date || new Date().toISOString().slice(0, 10);
  if (!body.description) return NextResponse.json({ ok: false, error: 'description required' }, { status: 400 });
  const lines = body.lines || [];
  if (lines.length < 2) return NextResponse.json({ ok: false, error: 'At least 2 lines required' }, { status: 400 });

  const sumMd = lines.filter((l) => l.side === 'MD').reduce((s, l) => s + Number(l.amount || 0), 0);
  const sumD = lines.filter((l) => l.side === 'D').reduce((s, l) => s + Number(l.amount || 0), 0);
  if (Math.abs(sumMd - sumD) > 0.01) return NextResponse.json({ ok: false, error: 'MD ≠ D (must balance)' }, { status: 400 });

  const { data: fyId } = await g.sb.rpc('_zolo_ensure_fiscal_year', { p_company: g.key.company_id, p_date: entryDate });
  const { data: entryNo } = await g.sb.rpc('_zolo_next_entry_number', { p_company: g.key.company_id, p_type: entryType, p_date: entryDate });

  const { data: je, error } = await g.sb.from('journal_entries').insert({
    company_id: g.key.company_id,
    entry_number: entryNo,
    entry_type: entryType,
    entry_date: entryDate,
    description: body.description,
    status: 'posted',
    fiscal_year_id: fyId,
    total_debit: sumMd,
    total_credit: sumD,
  }).select('id, entry_number').single();
  if (error || !je) return NextResponse.json({ ok: false, error: error?.message || 'JE insert failed' }, { status: 500 });

  for (const l of lines) {
    const { data: acc } = await g.sb.from('chart_of_accounts').select('id').eq('company_id', g.key.company_id).eq('account_code', l.account_code).eq('is_active', true).limit(1).maybeSingle();
    if (!acc) continue;
    const isDebit = l.side === 'MD';
    await g.sb.from('journal_entry_lines').insert({
      company_id: g.key.company_id,
      journal_entry_id: je.id,
      account_id: acc.id,
      account_code: l.account_code,
      side: l.side,
      amount: l.amount,
      debit_amount: isDebit ? l.amount : 0,
      credit_amount: isDebit ? 0 : l.amount,
      description: l.description || body.description,
      currency: 'EUR',
      exchange_rate: 1,
    });
  }

  return NextResponse.json({ ok: true, id: je.id, entry_number: je.entry_number, total: sumMd }, { status: 201 });
}
