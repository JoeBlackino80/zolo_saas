import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image, Font } from '@react-pdf/renderer';

// Register Roboto TTF — obsahuje kompletný Latin Extended set vrátane
// slovenských diakritík (Ľ, Č, Š, Ť, Ž, á, é, í, ó, ú, ý, ĺ, ŕ, ň, ď).
// Helvetica (default v @react-pdf/renderer) diakritiku nemá → "DODÁVATEĽ"
// sa renderuje ako "DODÁVATE=" a "Č" úplne mizne.
Font.register({
  family: 'Roboto',
  fonts: [
    { src: 'https://cdn.jsdelivr.net/gh/googlefonts/roboto@main/src/hinted/Roboto-Regular.ttf', fontWeight: 400 },
    { src: 'https://cdn.jsdelivr.net/gh/googlefonts/roboto@main/src/hinted/Roboto-Medium.ttf', fontWeight: 500 },
    { src: 'https://cdn.jsdelivr.net/gh/googlefonts/roboto@main/src/hinted/Roboto-Bold.ttf', fontWeight: 700 },
  ],
});

// Roboto Mono TTF pre monospace polia (VS/KS/SS čísla, IBAN, sumy)
Font.register({
  family: 'RobotoMono',
  fonts: [
    { src: 'https://cdn.jsdelivr.net/gh/googlefonts/RobotoMono@main/fonts/ttf/RobotoMono-Regular.ttf', fontWeight: 400 },
    { src: 'https://cdn.jsdelivr.net/gh/googlefonts/RobotoMono@main/fonts/ttf/RobotoMono-Bold.ttf', fontWeight: 700 },
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

const TYPE_LABEL: Record<string, string> = {
  invoice: 'Faktúra',
  received_invoice: 'Prijatá faktúra',
  proforma: 'Zálohová faktúra',
  credit_note: 'Dobropis',
  storno: 'Storno doklad',
  delivery_note: 'Dodací list',
  quote: 'Cenová ponuka',
  cash_receipt: 'Pokladničný príjmový doklad',
};

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
  // Default zinc-900 (ZOLO corporate identity). Ak firma nastavi brand color,
  // použije sa len ako subtílny akcent (docType + veľká suma) — nie ako
  // dominantný layout driver. Ostatné borders zostávajú monochromatic.
  const primary = b.primary_color || '#18181b';
  const isDefault = primary === '#18181b' || primary === '#000000';
  // Header border a totals border zostávajú vždy zinc-200 pre monochromatic look.
  // Custom brand color sa zobrazí len na docType label + grand total value.
  const headerStyle = { ...styles.header, borderBottom: `1 solid #e4e4e7` };
  const docTypeStyle = { ...styles.docType, color: isDefault ? '#71717a' : primary };
  const grandTotalRowStyle = { ...styles.grandTotalRow, borderTop: `2 solid ${isDefault ? '#18181b' : primary}` };
  const grandTotalValueStyle = { ...styles.grandTotalValue, color: isDefault ? '#18181b' : primary };
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
            <Text style={styles.brandSubtitle}>IČO {co.ico || '—'} · DIČ {co.dic || '—'}{co.ic_dph ? ` · IČ DPH ${co.ic_dph}` : ''}</Text>
          </View>
          <View style={styles.docNumber}>
            <Text style={docTypeStyle}>{TYPE_LABEL[invoice.type] || invoice.type}</Text>
            <Text style={styles.docNo}>{invoice.number}</Text>
          </View>
        </View>

        <View style={styles.parties}>
          <View style={styles.partyBox}>
            <Text style={styles.partyLabel}>Dodávateľ</Text>
            <Text style={styles.partyName}>{co.name}</Text>
            {co.street && <Text style={styles.partyLine}>{co.street}</Text>}
            {(co.zip || co.city) && <Text style={styles.partyLine}>{co.zip || ''} {co.city || ''}</Text>}
            <Text style={styles.partyLine}><Text style={styles.partyKey}>IČO: </Text>{co.ico || '—'}</Text>
            <Text style={styles.partyLine}><Text style={styles.partyKey}>DIČ: </Text>{co.dic || '—'}</Text>
            {co.ic_dph && <Text style={styles.partyLine}><Text style={styles.partyKey}>IČ DPH: </Text>{co.ic_dph}</Text>}
          </View>
          <View style={styles.partyBox}>
            <Text style={styles.partyLabel}>Odberateľ</Text>
            <Text style={styles.partyName}>{invoice.customer_name || '—'}</Text>
            {invoice.customer_street && <Text style={styles.partyLine}>{invoice.customer_street}</Text>}
            {(invoice.customer_zip || invoice.customer_city) && <Text style={styles.partyLine}>{invoice.customer_zip || ''} {invoice.customer_city || ''}</Text>}
            <Text style={styles.partyLine}><Text style={styles.partyKey}>IČO: </Text>{invoice.customer_ico || '—'}</Text>
            <Text style={styles.partyLine}><Text style={styles.partyKey}>DIČ: </Text>{invoice.customer_dic || '—'}</Text>
            {invoice.customer_ic_dph && <Text style={styles.partyLine}><Text style={styles.partyKey}>IČ DPH: </Text>{invoice.customer_ic_dph}</Text>}
          </View>
        </View>

        <View style={styles.meta}>
          <View style={styles.metaCell}><Text style={styles.metaLabel}>Vystavená</Text><Text style={styles.metaValue}>{fmtDate(invoice.issue_date)}</Text></View>
          <View style={styles.metaCell}><Text style={styles.metaLabel}>DZP</Text><Text style={styles.metaValue}>{fmtDate(invoice.delivery_date || invoice.issue_date)}</Text></View>
          <View style={styles.metaCell}><Text style={styles.metaLabel}>Splatná</Text><Text style={styles.metaValue}>{fmtDate(invoice.due_date)}</Text></View>
          <View style={styles.metaCell}><Text style={styles.metaLabel}>Var. symbol</Text><Text style={styles.metaValue}>{invoice.variable_symbol || invoice.number.replace(/\D/g, '')}</Text></View>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, styles.c1]}>#</Text>
            <Text style={[styles.tableHeaderCell, styles.c2]}>Popis</Text>
            <Text style={[styles.tableHeaderCell, styles.c3]}>Množstvo</Text>
            <Text style={[styles.tableHeaderCell, styles.c4]}>MJ</Text>
            <Text style={[styles.tableHeaderCell, styles.c5]}>Cena/MJ</Text>
            <Text style={[styles.tableHeaderCell, styles.c6]}>DPH</Text>
            <Text style={[styles.tableHeaderCell, styles.c7]}>Spolu</Text>
          </View>
          {invoice.items.map((it) => (
            <View key={it.position} style={styles.tableRow}>
              <Text style={[styles.tableCell, styles.c1]}>{it.position}</Text>
              <Text style={[styles.tableCell, styles.c2]}>{it.description}</Text>
              <Text style={[styles.tableCell, styles.c3]}>{Number(it.quantity).toLocaleString('sk-SK')}</Text>
              <Text style={[styles.tableCell, styles.c4]}>{it.unit}</Text>
              <Text style={[styles.tableCell, styles.c5]}>{fmtMoney(Number(it.unit_price), invoice.currency)}</Text>
              <Text style={[styles.tableCell, styles.c6]}>{it.vat_rate}%</Text>
              <Text style={[styles.tableCell, styles.c7]}>{fmtMoney(Number(it.total), invoice.currency)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.totalsBox}>
          <View style={styles.totalsRow}><Text style={styles.totalsLabel}>Základ DPH:</Text><Text style={styles.totalsValue}>{fmtMoney(Number(invoice.subtotal), invoice.currency)}</Text></View>
          <View style={styles.totalsRow}><Text style={styles.totalsLabel}>DPH:</Text><Text style={styles.totalsValue}>{fmtMoney(Number(invoice.vat_amount), invoice.currency)}</Text></View>
          <View style={grandTotalRowStyle}><Text style={styles.grandTotalLabel}>K úhrade</Text><Text style={grandTotalValueStyle}>{fmtMoney(Number(invoice.total), invoice.currency)}</Text></View>
        </View>

        {(co.iban || co.bank_name) && (
          <View style={styles.payment}>
            <View style={styles.paymentLeft}>
              <Text style={styles.paymentTitle}>Platobné údaje</Text>
              <View style={styles.paymentGrid}>
                <View style={styles.paymentCol}><Text style={styles.paymentKey}>IBAN</Text><Text style={styles.paymentVal}>{co.iban || '—'}</Text></View>
                <View style={styles.paymentCol}><Text style={styles.paymentKey}>BIC / SWIFT</Text><Text style={styles.paymentVal}>{co.bic || '—'}</Text></View>
                <View style={styles.paymentCol}><Text style={styles.paymentKey}>Banka</Text><Text style={styles.paymentVal}>{co.bank_name || '—'}</Text></View>
                <View style={styles.paymentCol}><Text style={styles.paymentKey}>Variabilný symbol</Text><Text style={styles.paymentVal}>{invoice.variable_symbol || invoice.number.replace(/\D/g, '')}</Text></View>
              </View>
            </View>
            {invoice.qr_data_url && (
              <View style={styles.qrBox}>
                <Image src={invoice.qr_data_url} style={styles.qrImg} />
                <Text style={styles.qrLabel}>PAY by square</Text>
              </View>
            )}
          </View>
        )}

        {invoice.notes && (<Text style={styles.notes}>{invoice.notes}</Text>)}
        {b.footer_text && (<Text style={{ ...styles.notes, fontStyle: 'normal', marginTop: 8 }}>{b.footer_text}</Text>)}

        <View style={styles.footer} fixed>
          <Text render={({ pageNumber, totalPages }) => `${co.name} · strana ${pageNumber} / ${totalPages}`} />
          <Text style={styles.watermark}>Doklad vygenerovaný systémom ZOLO · zolo.sk</Text>
        </View>
      </Page>
    </Document>
  );
}
