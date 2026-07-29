import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateIsdoc, type IsdocInvoice } from '@/lib/isdoc';
import { rateLimit, getClientIp } from '@/lib/ratelimit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = await rateLimit(`invoice-isdoc:${ip}`, 60, 60_000);
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429, headers: { 'Retry-After': String(Math.ceil(rl.resetIn / 1000)) } });
  }

  const id = req.nextUrl.searchParams.get('id');
  const token = req.nextUrl.searchParams.get('token');
  if (!id && !token) return NextResponse.json({ error: 'missing id or token' }, { status: 400 });

  const sb = await createClient();
  type RpcInvoice = { id: string; number: string; type: string; issue_date: string; delivery_date: string | null; due_date: string; currency: string; subtotal: number; vat_amount: number; total: number; variable_symbol: string | null; notes: string | null; customer_name: string | null; customer_ico: string | null; customer_dic: string | null; customer_ic_dph: string | null; customer_street?: string | null; customer_city?: string | null; customer_zip?: string | null };
  type RpcItem = { position: number; description: string; quantity: number; unit: string; unit_price: number; vat_rate: number; subtotal: number; vat_amount: number; total: number };
  type RpcCompany = { name: string; ico: string | null; dic: string | null; ic_dph: string | null; street: string | null; city: string | null; zip: string | null; iban: string | null; bic: string | null };
  let invoice: RpcInvoice; let items: RpcItem[]; let co: RpcCompany;

  if (!id && token) {
    const { data: result } = await sb.rpc('get_invoice_by_portal_token', { p_token: token });
    if (!result) return NextResponse.json({ error: 'invalid token' }, { status: 404 });
    if (result.error === 'expired') return NextResponse.json({ error: 'token expired' }, { status: 410 });
    invoice = result.invoice as RpcInvoice;
    items = (result.items || []) as RpcItem[];
    co = result.company as RpcCompany;
  } else {
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    const { data: inv, error } = await sb
      .from('invoices')
      .select('*, invoice_items(*), companies(name, ico, dic, ic_dph, street, city, zip, iban, bic)')
      .eq('id', id)
      .is('deleted_at', null)
      .single();
    if (error || !inv) return NextResponse.json({ error: 'not found' }, { status: 404 });
    invoice = inv as RpcInvoice;
    items = ((inv.invoice_items as RpcItem[]) || []).sort((a, b) => a.position - b.position);
    co = (Array.isArray(inv.companies) ? inv.companies[0] : inv.companies) as RpcCompany;
  }

  const doc: IsdocInvoice = {
    number: invoice.number, type: invoice.type, issue_date: invoice.issue_date, delivery_date: invoice.delivery_date, due_date: invoice.due_date,
    currency: invoice.currency || 'EUR', subtotal: Number(invoice.subtotal || 0), vat_amount: Number(invoice.vat_amount || 0), total: Number(invoice.total || 0),
    variable_symbol: invoice.variable_symbol, notes: invoice.notes,
    customer_name: invoice.customer_name, customer_ico: invoice.customer_ico, customer_dic: invoice.customer_dic, customer_ic_dph: invoice.customer_ic_dph,
    customer_street: invoice.customer_street ?? null, customer_city: invoice.customer_city ?? null, customer_zip: invoice.customer_zip ?? null,
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
      'Content-Disposition': `attachment; filename="${invoice.number}.isdoc"`,
    },
  });
}
