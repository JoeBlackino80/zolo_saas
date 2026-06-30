import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateIsdoc, type IsdocInvoice } from '@/lib/isdoc';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'missing id' }, { status: 400 });
  const sb = await createClient();
  const { data: inv, error } = await sb
    .from('invoices')
    .select('*, invoice_items(*), companies(name, ico, dic, ic_dph, street, city, zip, iban, bic)')
    .eq('id', id)
    .is('deleted_at', null)
    .single();
  if (error || !inv) return NextResponse.json({ error: 'not found' }, { status: 404 });
  const co = Array.isArray(inv.companies) ? inv.companies[0] : inv.companies;

  type Item = { position: number; description: string; quantity: number; unit: string; unit_price: number; vat_rate: number; subtotal: number; vat_amount: number; total: number };
  const items = ((inv.invoice_items as Item[]) || []).sort((a, b) => a.position - b.position);

  const doc: IsdocInvoice = {
    number: inv.number, type: inv.type, issue_date: inv.issue_date, delivery_date: inv.delivery_date, due_date: inv.due_date,
    currency: inv.currency || 'EUR', subtotal: Number(inv.subtotal || 0), vat_amount: Number(inv.vat_amount || 0), total: Number(inv.total || 0),
    variable_symbol: inv.variable_symbol, notes: inv.notes,
    customer_name: inv.customer_name, customer_ico: inv.customer_ico, customer_dic: inv.customer_dic, customer_ic_dph: inv.customer_ic_dph,
    customer_street: inv.customer_street, customer_city: inv.customer_city, customer_zip: inv.customer_zip,
    company: { name: co?.name || '', ico: co?.ico || null, dic: co?.dic || null, ic_dph: co?.ic_dph || null, street: co?.street || null, city: co?.city || null, zip: co?.zip || null, iban: co?.iban || null, bic: co?.bic || null },
    items: items.map((it) => ({
      position: it.position, description: it.description, quantity: Number(it.quantity), unit: it.unit, unit_price: Number(it.unit_price), vat_rate: Number(it.vat_rate),
      subtotal: Number(it.subtotal), vat_amount: Number(it.vat_amount), total: Number(it.total),
    })),
  };

  const xml = generateIsdoc(doc);
  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Content-Disposition': `attachment; filename="${inv.number}.isdoc"`,
    },
  });
}
