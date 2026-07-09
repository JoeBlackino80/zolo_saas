import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { rateLimit, getClientIp } from '@/lib/ratelimit';
import { renderToBuffer } from '@react-pdf/renderer';
import { InvoicePdfDoc, type InvoiceForPdf } from '@/lib/invoice-pdf';
import { CashReceiptPdfDoc } from '@/lib/cash-receipt-pdf';
import { DeliveryNotePdfDoc } from '@/lib/delivery-note-pdf';
import { generatePayBySquareQR } from '@/lib/pay-by-square';
import JSZip from 'jszip';
import React from 'react';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 min pre veľké obdobia

// GET /api/export/invoices-zip?from=2026-01-01&to=2026-12-31&type=invoice
// Vygeneruje ZIP s PDF-kami všetkých FA za obdobie.
// Ideálne pre daňového agenta na koniec roka.
export async function GET(req: NextRequest) {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

  const rl = await rateLimit(`export-zip:${user.id}:${getClientIp(req)}`, 3, 3600_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { ok: false, error: 'Rate limit exceeded — max 3 ZIP exporty za hodinu' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil(rl.resetIn / 1000)) } }
    );
  }

  const from = req.nextUrl.searchParams.get('from');
  const to = req.nextUrl.searchParams.get('to');
  const type = req.nextUrl.searchParams.get('type');

  let q = sb.from('invoices')
    .select('*, invoice_items(*), companies(id, name, ico, dic, ic_dph, street, city, zip, iban, bic, bank_name)')
    .is('deleted_at', null)
    .order('issue_date', { ascending: true });
  if (from) q = q.gte('issue_date', from);
  if (to) q = q.lte('issue_date', to);
  if (type) q = q.eq('type', type);

  const { data: invoices, error } = await q;
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  if (!invoices || invoices.length === 0) {
    return NextResponse.json({ ok: false, error: 'Žiadne doklady v tomto období' }, { status: 404 });
  }
  if (invoices.length > 500) {
    return NextResponse.json({ ok: false, error: `Príliš veľa dokladov (${invoices.length}). Rozdel na kratšie obdobia (max 500).` }, { status: 400 });
  }

  const zip = new JSZip();
  let successCount = 0;
  let errorCount = 0;

  for (const inv of invoices) {
    try {
      type RpcItem = { position: number; description: string; quantity: number; unit: string; unit_price: number; vat_rate: number; subtotal: number; vat_amount: number; total: number };
      type RpcCompany = { name: string; ico: string | null; dic: string | null; ic_dph: string | null; street: string | null; city: string | null; zip: string | null; iban: string | null; bic: string | null; bank_name: string | null };

      const items = ((inv.invoice_items as RpcItem[]) || []).sort((a, b) => a.position - b.position);
      const co = (Array.isArray(inv.companies) ? inv.companies[0] : inv.companies) as RpcCompany;

      const doc: InvoiceForPdf = {
        number: inv.number,
        type: inv.type,
        issue_date: inv.issue_date,
        delivery_date: inv.delivery_date,
        due_date: inv.due_date,
        currency: inv.currency || 'EUR',
        subtotal: Number(inv.subtotal || 0),
        vat_amount: Number(inv.vat_amount || 0),
        total: Number(inv.total || 0),
        variable_symbol: inv.variable_symbol,
        notes: inv.notes,
        qr_data_url: co?.iban && ['invoice', 'proforma', 'cash_receipt'].includes(inv.type) && Number(inv.total || 0) > 0
          ? await generatePayBySquareQR({
              iban: co.iban,
              amount: Number(inv.total || 0),
              currency: inv.currency || 'EUR',
              beneficiaryName: co.name || 'Príjemca',
              variableSymbol: inv.variable_symbol || inv.number.replace(/\D/g, ''),
              message: inv.number,
            })
          : null,
        customer_name: inv.customer_name,
        customer_ico: inv.customer_ico,
        customer_dic: inv.customer_dic,
        customer_ic_dph: inv.customer_ic_dph,
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
        items: items.map((it) => ({
          position: it.position, description: it.description, quantity: it.quantity, unit: it.unit,
          unit_price: Number(it.unit_price), vat_rate: it.vat_rate,
          subtotal: Number(it.subtotal), vat_amount: Number(it.vat_amount), total: Number(it.total),
        })),
      };

      let DocComponent: React.ComponentType<{ invoice: InvoiceForPdf; parentInvoiceNumber?: string | null }>;
      if (inv.type === 'cash_receipt' || inv.type === 'cash_payout') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        DocComponent = CashReceiptPdfDoc as any;
      } else if (inv.type === 'delivery_note') {
        DocComponent = DeliveryNotePdfDoc;
      } else {
        DocComponent = InvoicePdfDoc;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const buffer = await renderToBuffer(React.createElement(DocComponent, { invoice: doc }) as any);
      // Folder podľa typu, filename podľa čísla
      const folder = getFolderName(inv.type);
      zip.file(`${folder}/${inv.number}.pdf`, buffer);
      successCount++;
    } catch (e) {
      errorCount++;
      console.error(`Failed to render ${inv.number}:`, (e as Error).message);
    }
  }

  const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });
  const filename = `zolo_export_${from || 'all'}_to_${to || 'all'}_${successCount}dokladov.zip`;

  return new NextResponse(new Uint8Array(zipBuffer), {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'X-Success-Count': String(successCount),
      'X-Error-Count': String(errorCount),
    },
  });
}

function getFolderName(type: string): string {
  const folders: Record<string, string> = {
    invoice: '01_Faktury_vystavene',
    received_invoice: '02_Faktury_prijate',
    proforma: '03_Zalohove_faktury',
    credit_note: '04_Dobropisy',
    received_credit_note: '05_Dobropisy_prijate',
    storno: '06_Storno',
    debit_note: '07_Tarchopisy',
    delivery_note: '08_Dodacie_listy',
    cash_receipt: '09_PPD',
    cash_payout: '10_VPD',
    quote: '11_Cenove_ponuky',
  };
  return folders[type] || '00_Ine';
}
