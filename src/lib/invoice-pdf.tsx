import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image, Font } from '@react-pdf/renderer';

// Register Roboto TTF — obsahuje kompletný Latin Extended set vrátane
// slovenských diakritík (Ľ, Č, Š, Ť, Ž, á, é, í, ó, ú, ý, ĺ, ŕ, ň, ď).
// Helvetica (default v @react-pdf/renderer) diakritiku nemá → "DODÁVATEĽ"
// sa renderuje ako "DODÁVATE=" a "Č" úplne mizne.
//
// Pinned na konkrétny commit hash (nie @main branch) aby sa Roboto Flex
// migrácia alebo repo rename neprejavili silent break every PDF.
// Commit: googlefonts/roboto@0e5a76a (Roboto v2.138, stable 2024-11).
const ROBOTO_CDN = 'https://cdn.jsdelivr.net/gh/googlefonts/roboto@0e5a76a/src/hinted';
const ROBOTO_MONO_CDN = 'https://cdn.jsdelivr.net/gh/googlefonts/RobotoMono@fe3c974/fonts/ttf';

Font.register({
  family: 'Roboto',
  fonts: [
    { src: `${ROBOTO_CDN}/Roboto-Regular.ttf`, fontWeight: 400 },
    { src: `${ROBOTO_CDN}/Roboto-Medium.ttf`, fontWeight: 500 },
    { src: `${ROBOTO_CDN}/Roboto-Bold.ttf`, fontWeight: 700 },
  ],
});

Font.register({
  family: 'RobotoMono',
  fonts: [
    { src: `${ROBOTO_MONO_CDN}/RobotoMono-Regular.ttf`, fontWeight: 400 },
    { src: `${ROBOTO_MONO_CDN}/RobotoMono-Bold.ttf`, fontWeight: 700 },
  ],
});

type Item = {
  position: number;
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  vat_rate: number;
  subtotal: number;
  vat_amount: number;
  total: number;
};

export type InvoiceForPdf = {
  number: string;
  type: string;
  language?: string;
  watermark?: string | null;  // ak Free plán alebo expired subscription → "UKÁŽKA"
  issue_date: string;
  delivery_date: string | null;
  due_date: string;
  currency: string;
  subtotal: number;
  vat_amount: number;
  total: number;
  variable_symbol: string | null;
  notes: string | null;
  qr_data_url?: string | null;
  customer_name: string | null;
  customer_ico: string | null;
  customer_dic: string | null;
  customer_ic_dph: string | null;
  customer_street?: string | null;
  customer_city?: string | null;
  customer_zip?: string | null;
  company: {
    name: string;
    ico: string | null;
    dic: string | null;
    ic_dph: string | null;
    street: string | null;
    city: string | null;
    zip: string | null;
    iban: string | null;
    bic: string | null;
    bank_name: string | null;
  };
  branding?: {
    logo_url?: string | null;
    primary_color?: string | null;
    accent_color?: string | null;
    footer_text?: string | null;
  };
  items: Item[];
};

import { getT, type PdfLang } from './pdf-i18n';

const styles = StyleSheet.create({
  page: { fontFamily: 'Roboto', fontSize: 9.5, padding: 38, color: '#18181b', lineHeight: 1.5 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, borderBottom: '2 solid #18181b', paddingBottom: 14 },
  brand: { flexDirection: 'column', width: '65%' },
  brandTitle: { fontSize: 20, fontWeight: 700, color: '#18181b', letterSpacing: -0.3, marginBottom: 6, lineHeight: 1.15 },
  brandSubtitle: { fontSize: 9, color: '#71717a', marginTop: 3, lineHeight: 1.4 },
  docNumber: { textAlign: 'right', width: '35%' },
  docType: { fontSize: 10, color: '#18181b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 },
  docNo: { fontSize: 18, fontWeight: 700, marginTop: 4, color: '#18181b', lineHeight: 1.15 },
  parties: { flexDirection: 'row', gap: 16, marginBottom: 18 },
  partyBox: { flex: 1, border: '1 solid #e4e4e7', borderRadius: 6, padding: 12 },
  partyLabel: { fontSize: 8, color: '#71717a', textTransform: 'uppercase', letterSpacing: 0.6, fontWeight: 700, marginBottom: 6 },
  partyName: { fontSize: 11, fontWeight: 700, marginBottom: 4, color: '#18181b', lineHeight: 1.3 },
  partyLine: { fontSize: 9, color: '#3f3f46', marginBottom: 2, lineHeight: 1.4 },
  partyKey: { color: '#a1a1aa' },
  meta: { flexDirection: 'row', gap: 16, marginBottom: 18, paddingVertical: 10, borderTop: '1 solid #e4e4e7', borderBottom: '1 solid #e4e4e7' },
  metaCell: { flex: 1 },
  metaLabel: { fontSize: 8, color: '#71717a', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 700, marginBottom: 3 },
  metaValue: { fontSize: 11, fontWeight: 700, color: '#18181b', lineHeight: 1.3 },
  table: { marginBottom: 16 },
  tableHeader: { flexDirection: 'row', backgroundColor: '#f4f4f5', paddingVertical: 7, paddingHorizontal: 8 },
  tableHeaderCell: { fontSize: 8, color: '#3f3f46', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.2, paddingRight: 4 },
  tableRow: { flexDirection: 'row', paddingVertical: 8, paddingHorizontal: 8, borderBottom: '1 solid #f4f4f5' },
  tableCell: { fontSize: 9.5, color: '#18181b', paddingRight: 4 },
  c1: { width: '5%' },
  c2: { width: '38%' },
  c3: { width: '10%', textAlign: 'right' },
  c4: { width: '8%', textAlign: 'left', paddingLeft: 4 },
  c5: { width: '14%', textAlign: 'right' },
  c6: { width: '8%', textAlign: 'right' },
  c7: { width: '17%', textAlign: 'right' },
  totalsBox: { alignSelf: 'flex-end', width: 260, marginTop: 4 },
  totalsRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  totalsLabel: { fontSize: 10, color: '#3f3f46' },
  totalsValue: { fontSize: 10, color: '#18181b' },
  grandTotalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, marginTop: 4, borderTop: '2 solid #18181b' },
  grandTotalLabel: { fontSize: 12, fontWeight: 700, color: '#18181b' },
  grandTotalValue: { fontSize: 14, fontWeight: 700, color: '#18181b' },
  payment: { marginTop: 22, padding: 14, backgroundColor: '#fafafa', borderRadius: 6, flexDirection: 'row', gap: 12 },
  paymentLeft: { flex: 1 },
  paymentTitle: { fontSize: 9, color: '#71717a', textTransform: 'uppercase', letterSpacing: 0.6, fontWeight: 700, marginBottom: 7 },
  paymentGrid: { flexDirection: 'row', gap: 14, flexWrap: 'wrap' },
  paymentCol: { flexBasis: '48%' },
  paymentKey: { fontSize: 8, color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 1 },
  paymentVal: { fontSize: 10, color: '#18181b', fontWeight: 700, fontFamily: 'RobotoMono' },
  qrBox: { width: 100, alignItems: 'center', justifyContent: 'center' },
  qrImg: { width: 96, height: 96 },
  qrLabel: { fontSize: 7, color: '#a1a1aa', marginTop: 3, textAlign: 'center' },
  notes: { marginTop: 16, fontSize: 9, color: '#3f3f46', fontStyle: 'italic' },
  footer: { position: 'absolute', bottom: 20, left: 38, right: 38, textAlign: 'center', fontSize: 8, color: '#a1a1aa', borderTop: '1 solid #e4e4e7', paddingTop: 6 },
  watermark: { fontSize: 7, color: '#d4d4d8', marginTop: 3, letterSpacing: 0.3 },
});

function fmtDate(d: string | null | undefined): string {
  if (!d) return '—';
  const [y, m, day] = d.split('-');
  return `${day}. ${m}. ${y}`;
}
function fmtMoney(n: number, currency = 'EUR'): string {
  const v = (n || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ' ').replace('.', ',');
  return `${v} ${currency}`;
}

export function InvoicePdfDoc({ invoice }: { invoice: InvoiceForPdf }) {
  const co = invoice.company;
  const b = invoice.branding || {};
  const lang = (invoice.language || 'sk') as PdfLang;
  const t = getT(lang);
  const docType = (t as unknown as Record<string, string>)[invoice.type] || invoice.type;

  const headerStyle = { ...styles.header, borderBottom: `1 solid #e4e4e7` };
  const docTypeStyle = { ...styles.docType, color: '#71717a' };
  const grandTotalRowStyle = { ...styles.grandTotalRow, borderTop: `2 solid #18181b` };
  const grandTotalValueStyle = { ...styles.grandTotalValue, color: '#18181b' };
  const numLocale = lang === 'de' ? 'de-DE' : lang === 'en' ? 'en-US' : 'sk-SK';

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={headerStyle}>
          <View style={styles.brand}>
            {b.logo_url ? (
              // eslint-disable-next-line jsx-a11y/alt-text
              <Image src={b.logo_url} style={{ width: 100, height: 40, objectFit: 'contain', marginBottom: 8 }} />
            ) : null}
            <Text style={styles.brandTitle}>{co.name}</Text>
            <Text style={styles.brandSubtitle}>{co.street ? `${co.street}, ` : ''}{co.zip} {co.city}</Text>
            <Text style={styles.brandSubtitle}>{t.ico} {co.ico || '—'} · {t.dic} {co.dic || '—'}{co.ic_dph ? ` · ${t.icDph} ${co.ic_dph}` : ''}</Text>
          </View>
          <View style={styles.docNumber}>
            <Text style={docTypeStyle}>{docType}</Text>
            <Text style={styles.docNo}>{invoice.number}</Text>
          </View>
        </View>

        <View style={styles.parties}>
          <View style={styles.partyBox}>
            <Text style={styles.partyLabel}>{t.supplier}</Text>
            <Text style={styles.partyName}>{co.name}</Text>
            {co.street && <Text style={styles.partyLine}>{co.street}</Text>}
            {(co.zip || co.city) && <Text style={styles.partyLine}>{co.zip || ''} {co.city || ''}</Text>}
            <Text style={styles.partyLine}><Text style={styles.partyKey}>{t.ico}: </Text>{co.ico || '—'}</Text>
            <Text style={styles.partyLine}><Text style={styles.partyKey}>{t.dic}: </Text>{co.dic || '—'}</Text>
            {co.ic_dph && <Text style={styles.partyLine}><Text style={styles.partyKey}>{t.icDph}: </Text>{co.ic_dph}</Text>}
          </View>
          <View style={styles.partyBox}>
            <Text style={styles.partyLabel}>{t.customer}</Text>
            <Text style={styles.partyName}>{invoice.customer_name || '—'}</Text>
            {invoice.customer_street && <Text style={styles.partyLine}>{invoice.customer_street}</Text>}
            {(invoice.customer_zip || invoice.customer_city) && <Text style={styles.partyLine}>{invoice.customer_zip || ''} {invoice.customer_city || ''}</Text>}
            <Text style={styles.partyLine}><Text style={styles.partyKey}>{t.ico}: </Text>{invoice.customer_ico || '—'}</Text>
            <Text style={styles.partyLine}><Text style={styles.partyKey}>{t.dic}: </Text>{invoice.customer_dic || '—'}</Text>
            {invoice.customer_ic_dph && <Text style={styles.partyLine}><Text style={styles.partyKey}>{t.icDph}: </Text>{invoice.customer_ic_dph}</Text>}
          </View>
        </View>

        <View style={styles.meta}>
          <View style={styles.metaCell}><Text style={styles.metaLabel}>{t.issueDate}</Text><Text style={styles.metaValue}>{fmtDate(invoice.issue_date)}</Text></View>
          <View style={styles.metaCell}><Text style={styles.metaLabel}>{t.deliveryDate}</Text><Text style={styles.metaValue}>{fmtDate(invoice.delivery_date || invoice.issue_date)}</Text></View>
          <View style={styles.metaCell}><Text style={styles.metaLabel}>{t.dueDate}</Text><Text style={styles.metaValue}>{fmtDate(invoice.due_date)}</Text></View>
          <View style={styles.metaCell}><Text style={styles.metaLabel}>{t.variableSymbolShort}</Text><Text style={styles.metaValue}>{invoice.variable_symbol || invoice.number.replace(/\D/g, '')}</Text></View>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, styles.c1]}>{t.colHash}</Text>
            <Text style={[styles.tableHeaderCell, styles.c2]}>{t.colDescription}</Text>
            <Text style={[styles.tableHeaderCell, styles.c3]}>{t.colQuantity}</Text>
            <Text style={[styles.tableHeaderCell, styles.c4]}>{t.colUnit}</Text>
            <Text style={[styles.tableHeaderCell, styles.c5]}>{t.colUnitPrice}</Text>
            <Text style={[styles.tableHeaderCell, styles.c6]}>{t.colVat}</Text>
            <Text style={[styles.tableHeaderCell, styles.c7]}>{t.colTotal}</Text>
          </View>
          {invoice.items.map((it) => (
            <View key={it.position} style={styles.tableRow}>
              <Text style={[styles.tableCell, styles.c1]}>{it.position}</Text>
              <Text style={[styles.tableCell, styles.c2]}>{it.description}</Text>
              <Text style={[styles.tableCell, styles.c3]}>{Number(it.quantity).toLocaleString(numLocale)}</Text>
              <Text style={[styles.tableCell, styles.c4]}>{it.unit}</Text>
              <Text style={[styles.tableCell, styles.c5]}>{fmtMoney(Number(it.unit_price), invoice.currency)}</Text>
              <Text style={[styles.tableCell, styles.c6]}>{it.vat_rate}%</Text>
              <Text style={[styles.tableCell, styles.c7]}>{fmtMoney(Number(it.total), invoice.currency)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.totalsBox}>
          <View style={styles.totalsRow}><Text style={styles.totalsLabel}>{t.subtotal}</Text><Text style={styles.totalsValue}>{fmtMoney(Number(invoice.subtotal), invoice.currency)}</Text></View>
          <View style={styles.totalsRow}><Text style={styles.totalsLabel}>{t.vat}</Text><Text style={styles.totalsValue}>{fmtMoney(Number(invoice.vat_amount), invoice.currency)}</Text></View>
          <View style={grandTotalRowStyle}><Text style={styles.grandTotalLabel}>{t.amountDue}</Text><Text style={grandTotalValueStyle}>{fmtMoney(Number(invoice.total), invoice.currency)}</Text></View>
        </View>

        {(co.iban || co.bank_name) && (
          <View style={styles.payment}>
            <View style={styles.paymentLeft}>
              <Text style={styles.paymentTitle}>{t.paymentDetails}</Text>
              <View style={styles.paymentGrid}>
                <View style={styles.paymentCol}><Text style={styles.paymentKey}>{t.iban}</Text><Text style={styles.paymentVal}>{co.iban || '—'}</Text></View>
                <View style={styles.paymentCol}><Text style={styles.paymentKey}>{t.bicSwift}</Text><Text style={styles.paymentVal}>{co.bic || '—'}</Text></View>
                <View style={styles.paymentCol}><Text style={styles.paymentKey}>{t.bank}</Text><Text style={styles.paymentVal}>{co.bank_name || '—'}</Text></View>
                <View style={styles.paymentCol}><Text style={styles.paymentKey}>{t.variableSymbol}</Text><Text style={styles.paymentVal}>{invoice.variable_symbol || invoice.number.replace(/\D/g, '')}</Text></View>
              </View>
            </View>
            {invoice.qr_data_url && (
              <View style={styles.qrBox}>
                <Image src={invoice.qr_data_url} style={styles.qrImg} />
                <Text style={styles.qrLabel}>{t.payBySquare}</Text>
              </View>
            )}
          </View>
        )}

        {invoice.notes && (<Text style={styles.notes}>{invoice.notes}</Text>)}
        {b.footer_text && (<Text style={{ ...styles.notes, fontStyle: 'normal', marginTop: 8 }}>{b.footer_text}</Text>)}

        {invoice.watermark && (
          <View style={{ position: 'absolute', top: '40%', left: 0, right: 0, alignItems: 'center', opacity: 0.12, transform: 'rotate(-30deg)' }} fixed>
            <Text style={{ fontSize: 120, fontWeight: 700, color: '#dc2626', letterSpacing: 8 }}>
              {invoice.watermark}
            </Text>
          </View>
        )}

        <View style={styles.footer} fixed>
          <Text render={({ pageNumber, totalPages }) => `${co.name} · ${t.pageOf} ${pageNumber} / ${totalPages}`} />
          <Text style={styles.watermark}>{t.generatedBy}</Text>
        </View>
      </Page>
    </Document>
  );
}
