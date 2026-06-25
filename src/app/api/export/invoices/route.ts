import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET /api/export/invoices?from=2026-01-01&to=2026-12-31&type=invoice&format=csv
// Returns: CSV with all invoices for current user
export async function GET(req: NextRequest) {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const from = req.nextUrl.searchParams.get('from');
  const to = req.nextUrl.searchParams.get('to');
  const type = req.nextUrl.searchParams.get('type');

  let q = sb.from('invoices').select('number, type, issue_date, delivery_date, due_date, customer_name, customer_ico, customer_ic_dph, subtotal, vat_amount, total, paid_amount, status, currency, variable_symbol, notes')
    .is('deleted_at', null).order('issue_date', { ascending: false });
  if (from) q = q.gte('issue_date', from);
  if (to) q = q.lte('issue_date', to);
  if (type) q = q.eq('type', type);
  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = data || [];
  const headers = ['Číslo', 'Typ', 'Vystavená', 'DZP', 'Splatná', 'Odberateľ', 'IČO', 'IČ DPH', 'Základ', 'DPH', 'Spolu', 'Zaplatené', 'Stav', 'Mena', 'VS', 'Poznámka'];
  const csv = [
    headers.join(';'),
    ...rows.map((r) => [
      r.number, r.type, r.issue_date, r.delivery_date || '', r.due_date,
      escapeCsv(r.customer_name), r.customer_ico || '', r.customer_ic_dph || '',
      Number(r.subtotal || 0).toFixed(2), Number(r.vat_amount || 0).toFixed(2),
      Number(r.total || 0).toFixed(2), Number(r.paid_amount || 0).toFixed(2),
      r.status, r.currency || 'EUR', r.variable_symbol || '', escapeCsv(r.notes),
    ].join(';')),
  ].join('\r\n');

  const filename = `faktury_${from || 'all'}_to_${to || 'all'}.csv`;
  // UTF-8 BOM for Excel
  return new NextResponse('﻿' + csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}

function escapeCsv(s: string | null | undefined): string {
  if (!s) return '';
  const str = String(s).replace(/"/g, '""');
  return str.includes(';') || str.includes('"') || str.includes('\n') ? `"${str}"` : str;
}
