import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { fireWebhook } from '@/lib/webhooks';
import { rateLimit, getClientIp } from '@/lib/ratelimit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function authenticate(req: NextRequest) {
  const auth = req.headers.get('authorization') || '';
  const m = auth.match(/^Bearer\s+(zk_[a-f0-9]+)\b/);
  if (!m) return { error: 'Missing or invalid Bearer token', status: 401 };
  const sb = await createClient();
  const { data: keyRows, error: keyErr } = await sb.rpc('api_key_validate', { p_key: m[1] });
  if (keyErr) return { error: keyErr.message, status: 500 };
  const key = Array.isArray(keyRows) ? keyRows[0] : keyRows;
  if (!key) return { error: 'Invalid or revoked key', status: 401 };
  return { key, sb };
}

// GET /api/v1/invoices?limit=50&type=invoice
export async function GET(req: NextRequest) {
  const a = await authenticate(req);
  if ('error' in a) return NextResponse.json({ ok: false, error: a.error }, { status: a.status });

  // Rate limit per API key (300/min reads)
  const rl = await rateLimit(`v1:read:${a.key.company_id}:${getClientIp(req)}`, 300, 60_000);
  if (!rl.allowed) return NextResponse.json({ ok: false, error: 'Rate limit exceeded' }, { status: 429, headers: { 'Retry-After': String(Math.ceil(rl.resetIn / 1000)) } });

  const limit = Math.min(parseInt(req.nextUrl.searchParams.get('limit') || '50', 10), 200);
  const type = req.nextUrl.searchParams.get('type');
  let q = a.sb.from('invoices')
    .select('id, number, type, issue_date, due_date, customer_name, supplier_name, subtotal, vat_amount, total, paid_amount, status, currency')
    .eq('company_id', a.key.company_id)
    .is('deleted_at', null)
    .order('issue_date', { ascending: false })
    .limit(limit);
  if (type) q = q.eq('type', type);
  const { data, error } = await q;
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, count: data?.length || 0, invoices: data });
}

// POST /api/v1/invoices
// Body: { type?, customer_name, customer_ico?, customer_email?, due_date?, items: [{description, quantity, unit_price, vat_rate}], ... }
export async function POST(req: NextRequest) {
  const a = await authenticate(req);
  if ('error' in a) return NextResponse.json({ ok: false, error: a.error }, { status: a.status });

  // Rate limit per API key (60/min writes — protect against runaway scripts)
  const rl = await rateLimit(`v1:write:${a.key.company_id}:${getClientIp(req)}`, 60, 60_000);
  if (!rl.allowed) return NextResponse.json({ ok: false, error: 'Rate limit exceeded' }, { status: 429, headers: { 'Retry-After': String(Math.ceil(rl.resetIn / 1000)) } });

  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 }); }

  type Item = { description?: string; quantity?: number; unit?: string; unit_price?: number; vat_rate?: number };
  const items = (body.items as Item[]) || [];
  if (!Array.isArray(items) || items.length === 0) return NextResponse.json({ ok: false, error: 'items required' }, { status: 400 });
  if (!body.customer_name) return NextResponse.json({ ok: false, error: 'customer_name required' }, { status: 400 });

  const subtotal = items.reduce((s, it) => s + (Number(it.quantity || 0) * Number(it.unit_price || 0)), 0);
  const vat = items.reduce((s, it) => s + (Number(it.quantity || 0) * Number(it.unit_price || 0) * (Number(it.vat_rate || 0) / 100)), 0);
  const total = subtotal + vat;

  const { data: number, error: nErr } = await a.sb.rpc('assign_document_number', { p_company_id: a.key.company_id, p_type: (body.type as string) || 'invoice' });
  if (nErr || typeof number !== 'string') return NextResponse.json({ ok: false, error: nErr?.message || 'Number assign failed' }, { status: 500 });

  const today = new Date().toISOString().slice(0, 10);
  const due = new Date(); due.setDate(due.getDate() + 14);
  const { data: inv, error: iErr } = await a.sb.from('invoices').insert({
    company_id: a.key.company_id,
    type: body.type || 'invoice',
    number,
    customer_name: body.customer_name,
    customer_ico: body.customer_ico ?? null,
    customer_ic_dph: body.customer_ic_dph ?? null,
    customer_email: body.customer_email ?? null,
    issue_date: (body.issue_date as string) || today,
    delivery_date: (body.delivery_date as string) || today,
    due_date: (body.due_date as string) || due.toISOString().slice(0, 10),
    subtotal: +subtotal.toFixed(2),
    vat_amount: +vat.toFixed(2),
    total: +total.toFixed(2),
    paid_amount: 0,
    status: 'issued',
    currency: (body.currency as string) || 'EUR',
    exchange_rate: 1,
    notes: (body.notes as string) ?? null,
    reminders_enabled: true,
  }).select('id, number').single();
  if (iErr || !inv) return NextResponse.json({ ok: false, error: iErr?.message || 'Insert failed' }, { status: 500 });

  const itemRows = items.map((it, idx) => ({
    company_id: a.key.company_id,
    invoice_id: inv.id,
    position: idx + 1,
    description: it.description || '',
    quantity: Number(it.quantity || 0),
    unit: it.unit || 'ks',
    unit_price: Number(it.unit_price || 0),
    vat_rate: Number(it.vat_rate || 0),
    subtotal: Number(it.quantity || 0) * Number(it.unit_price || 0),
    vat_amount: Number(it.quantity || 0) * Number(it.unit_price || 0) * (Number(it.vat_rate || 0) / 100),
    total: Number(it.quantity || 0) * Number(it.unit_price || 0) * (1 + Number(it.vat_rate || 0) / 100),
  }));
  await a.sb.from('invoice_items').insert(itemRows);

  // Auto-post journal + stock
  await a.sb.rpc('post_invoice_journal', { p_invoice_id: inv.id, p_event: 'issue' });
  try { await a.sb.rpc('post_invoice_stock', { p_invoice_id: inv.id }); } catch { /* ignore */ }

  // Fire-and-forget webhook
  fireWebhook(a.key.company_id, 'invoice.created', { id: inv.id, number: inv.number, total: +total.toFixed(2) }, a.sb).catch(() => undefined);

  return NextResponse.json({ ok: true, id: inv.id, number: inv.number, total: +total.toFixed(2) }, { status: 201 });
}
