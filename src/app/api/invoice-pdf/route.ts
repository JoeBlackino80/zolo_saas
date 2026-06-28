import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { renderToBuffer } from '@react-pdf/renderer';
import { InvoicePdfDoc, type InvoiceForPdf } from '@/lib/invoice-pdf';
import { rateLimit, getClientIp } from '@/lib/ratelimit';
import { generatePayBySquareQR } from '@/lib/pay-by-square';
import React from 'react';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = await rateLimit(`invoice-pdf:${ip}`, 60, 60_000);
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429, headers: { 'Retry-After': String(Math.ceil(rl.resetIn / 1000)) } });
  }

  const id = req.nextUrl.searchParams.get('id');
  const token = req.nextUrl.searchParams.get('token');
  const inline = req.nextUrl.searchParams.get('inline') === '1';
  if (!id && !token) return NextResponse.json({ error: 'missing id or token' }, { status: 400 });

  const sb = await createClient();
  type RpcInvoice = { id: string; number: string; type: string; issue_date: string; delivery_date: string | null; due_date: string; currency: string; subtotal: number; vat_amount: number; total: number; variable_symbol: string | null; notes: string | null; customer_name: string | null; customer_ico: string | null; customer_dic: string | null; customer_ic_dph: string | null };
  type RpcItem = { position: number; description: string; quantity: number; unit: string; unit_price: number; vat_rate: number; subtotal: number; vat_amount: number; total: number };
  type RpcCompany = { name: string; ico: string | null; dic: string | null; ic_dph: string | null; street: string | null; city: string | null; zip: string | null; iban: string | null; bic: string | null; bank_name: string | null };
  let invoice: RpcInvoice; let items: RpcItem[]; let co: RpcCompany;

  let brandingFromRpc: { logo_url?: string | null; primary_color?: string | null; accent_color?: string | null; footer_text?: string | null } | undefined = undefined;
  if (!id && token) {
    // Public access via portal token (SECURITY DEFINER RPC bypasses RLS)
    const { data: result } = await sb.rpc('get_invoice_by_portal_token', { p_token: token });
    if (!result) return NextResponse.json({ error: 'invalid token' }, { status: 404 });
    if (result.error === 'expired') return NextResponse.json({ error: 'token expired' }, { status: 410 });
    invoice = result.invoice as RpcInvoice;
    items = (result.items || []) as RpcItem[];
    co = result.company as RpcCompany;
    brandingFromRpc = result.branding || undefined;
  } else {
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    const { data: inv, error } = await sb
      .from('invoices')
      .select('*, invoice_items(*), companies(id, name, ico, dic, ic_dph, street, city, zip, iban, bic, bank_name)')
      .eq('id', id)
      .is('deleted_at', null)
      .single();
    if (error || !inv) return NextResponse.json({ error: 'not found' }, { status: 404 });
    invoice = inv as RpcInvoice;
    items = ((inv.invoice_items as RpcItem[]) || []).sort((a, b) => a.position - b.position);
    co = (Array.isArray(inv.companies) ? inv.companies[0] : inv.companies) as RpcCompany;
  }

  // Load branding (priority: token-based RPC payload → DB lookup)
  let branding = brandingFromRpc;
  if (!branding) {
    const compId = (co as RpcCompany & { id?: string })?.id;
    if (compId) {
      const { data: brand } = await sb.from('company_settings').select('logo_url, primary_color, accent_color, footer_text').eq('company_id', compId).maybeSingle();
      if (brand) branding = brand;
    }
  }

  const doc: InvoiceForPdf = {
    number: invoice.number,
    type: invoice.type,
    issue_date: invoice.issue_date,
    delivery_date: invoice.delivery_date,
    due_date: invoice.due_date,
    currency: invoice.currency || 'EUR',
    subtotal: Number(invoice.subtotal || 0),
    vat_amount: Number(invoice.vat_amount || 0),
    total: Number(invoice.total || 0),
    variable_symbol: invoice.variable_symbol,
    notes: invoice.notes,
    qr_data_url: co?.iban ? await generatePayBySquareQR({
      iban: co.iban,
      amount: Number(invoice.total || 0),
      currency: invoice.currency || 'EUR',
      beneficiaryName: co.name || 'Príjemca',
      variableSymbol: invoice.variable_symbol || invoice.number.replace(/\D/g, ''),
      message: invoice.number,
    }) : null,
    customer_name: invoice.customer_name,
    customer_ico: invoice.customer_ico,
    customer_dic: invoice.customer_dic,
    customer_ic_dph: invoice.customer_ic_dph,
    company: {
      name: co?.name || '',
      ico: co?.ico || null,
      dic: co?.dic || null,
      ic_dph: co?.ic_dph || null,
      street: co?.street || null,
      city: co?.city || null,
      zip: co?.zip || null,
      iban: co?.iban || null,
      bic: co?.bic || null,
      bank_name: co?.bank_name || null,
    },
    branding,
    items: items.map((it) => ({
      position: it.position, description: it.description, quantity: it.quantity, unit: it.unit,
      unit_price: Number(it.unit_price), vat_rate: it.vat_rate,
      subtotal: Number(it.subtotal), vat_amount: Number(it.vat_amount), total: Number(it.total),
    })),
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const buffer = await renderToBuffer(React.createElement(InvoicePdfDoc, { invoice: doc }) as any);
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `${inline ? 'inline' : 'attachment'}; filename="${invoice.number}.pdf"`,
      'Cache-Control': 'no-store',
    },
  });
}
