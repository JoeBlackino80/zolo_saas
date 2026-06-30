import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// INTRASTAT report — aggregates inter-EU goods movements per partner/country.
// Format: simplified CSV (full official format requires XML to ŠÚ SR — out of scope).
// Query params: ?period=YYYY-MM and ?direction=dispatch|arrival
export async function GET(req: NextRequest) {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

  const period = req.nextUrl.searchParams.get('period') || new Date().toISOString().slice(0, 7);
  const direction = req.nextUrl.searchParams.get('direction') || 'dispatch';
  const [yy, mm] = period.split('-');
  if (!yy || !mm) return NextResponse.json({ ok: false, error: 'Invalid period (YYYY-MM)' }, { status: 400 });
  const periodStart = `${yy}-${mm}-01`;
  const periodEnd = new Date(parseInt(yy, 10), parseInt(mm, 10), 0).toISOString().slice(0, 10);

  // Dispatch = outgoing invoices to EU customers (where customer country != SK and contact country in EU)
  // Arrival = incoming PFAs from EU suppliers
  const invType = direction === 'arrival' ? 'received_invoice' : 'invoice';
  const { data: invs } = await sb
    .from('invoices')
    .select('id, number, total, customer_country, supplier_country, customer_name, supplier_name, customer_ic_dph, supplier_ic_dph, issue_date, invoice_items(quantity, unit, total, products(name, ean))')
    .eq('type', invType)
    .gte('issue_date', periodStart)
    .lte('issue_date', periodEnd)
    .is('deleted_at', null);

  type R = { id: string; number: string; total: number; customer_country: string | null; supplier_country: string | null; customer_name: string | null; supplier_name: string | null; customer_ic_dph: string | null; supplier_ic_dph: string | null; issue_date: string; invoice_items: { quantity: number; unit: string | null; total: number; products: { name: string; ean: string | null } | { name: string; ean: string | null }[] | null }[] | null };

  const EU = ['AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SI', 'ES', 'SE'];
  const rows: string[][] = [['Číslo FA', 'Dátum', 'Partner', 'IČ DPH', 'Krajina', 'Položka', 'Množstvo', 'MJ', 'Hodnota EUR']];
  for (const r of (invs || []) as R[]) {
    const country = direction === 'dispatch' ? r.customer_country : r.supplier_country;
    if (!country || !EU.includes(country.toUpperCase())) continue;
    const partner = direction === 'dispatch' ? r.customer_name : r.supplier_name;
    const vat = direction === 'dispatch' ? r.customer_ic_dph : r.supplier_ic_dph;
    for (const it of r.invoice_items || []) {
      const p = Array.isArray(it.products) ? it.products[0] : it.products;
      rows.push([r.number, r.issue_date, partner || '', vat || '', country, p?.name || p?.ean || '', String(it.quantity || 0), it.unit || 'ks', String(it.total || 0)]);
    }
  }

  const csv = rows.map((r) => r.map((c) => `"${(c || '').replace(/"/g, '""')}"`).join(';')).join('\n');
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename=intrastat-${direction}-${period}.csv`,
    },
  });
}
