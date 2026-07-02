import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import type { InvoiceForPdf } from './invoice-pdf';

// PPD/VPD — Pokladničný Príjmový/Výdavkový Doklad
// Kompaktný layout, A5 rozmer, štandardný SK cash receipt formát.

const styles = StyleSheet.create({
  page: { fontFamily: 'Roboto', fontSize: 10, padding: 30, color: '#18181b', lineHeight: 1.5 },
  header: { textAlign: 'center', marginBottom: 24, borderBottom: '2 solid #18181b', paddingBottom: 12 },
  docType: { fontSize: 18, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' },
  docNo: { fontSize: 14, fontWeight: 700, marginTop: 6, color: '#18181b' },
  row: { flexDirection: 'row', marginBottom: 10, alignItems: 'flex-end' },
  label: { fontSize: 9, color: '#71717a', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 700, width: 130 },
  value: { fontSize: 11, color: '#18181b', flex: 1, borderBottom: '1 solid #d4d4d8', paddingBottom: 2, fontWeight: 500 },
  amountBox: { marginTop: 20, marginBottom: 20, padding: 16, border: '2 solid #18181b', borderRadius: 4 },
  amountLabel: { fontSize: 9, color: '#71717a', textTransform: 'uppercase', letterSpacing: 0.6, fontWeight: 700, marginBottom: 4 },
  amountValue: { fontSize: 24, fontWeight: 700, color: '#18181b', fontFamily: 'RobotoMono', letterSpacing: -0.3 },
  amountWords: { fontSize: 10, color: '#52525b', fontStyle: 'italic', marginTop: 6 },
  purposeBox: { marginBottom: 20, padding: 12, backgroundColor: '#fafafa', borderRadius: 4 },
  purposeLabel: { fontSize: 9, color: '#71717a', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 700, marginBottom: 4 },
  purposeValue: { fontSize: 10, color: '#18181b', minHeight: 24 },
  signatures: { marginTop: 40, flexDirection: 'row', gap: 40, justifyContent: 'space-between' },
  signBox: { flex: 1, alignItems: 'center' },
  signLine: { width: '100%', borderTop: '1 solid #71717a', marginBottom: 4 },
  signLabel: { fontSize: 8, color: '#71717a', textTransform: 'uppercase', letterSpacing: 0.5 },
  footer: { position: 'absolute', bottom: 20, left: 30, right: 30, textAlign: 'center', fontSize: 7, color: '#a1a1aa', borderTop: '1 solid #e4e4e7', paddingTop: 6 },
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

// SK number to words (basic — for cash receipt "slovom")
const UNITS = ['', 'jeden', 'dva', 'tri', 'štyri', 'päť', 'šesť', 'sedem', 'osem', 'deväť'];
const TEENS = ['desať', 'jedenásť', 'dvanásť', 'trinásť', 'štrnásť', 'pätnásť', 'šestnásť', 'sedemnásť', 'osemnásť', 'devätnásť'];
const TENS = ['', '', 'dvadsať', 'tridsať', 'štyridsať', 'päťdesiat', 'šesťdesiat', 'sedemdesiat', 'osemdesiat', 'deväťdesiat'];

function numToWordsSk(n: number): string {
  n = Math.floor(n);
  if (n === 0) return 'nula';
  if (n < 10) return UNITS[n];
  if (n < 20) return TEENS[n - 10];
  if (n < 100) return TENS[Math.floor(n / 10)] + (n % 10 ? ' ' + UNITS[n % 10] : '');
  if (n < 1000) {
    const h = Math.floor(n / 100);
    const rest = n % 100;
    const hundred = h === 1 ? 'sto' : h === 2 ? 'dvesto' : h + 'sto';
    return hundred + (rest > 0 ? ' ' + numToWordsSk(rest) : '');
  }
  if (n < 1000000) {
    const th = Math.floor(n / 1000);
    const rest = n % 1000;
    const tisic = th === 1 ? 'jeden tisíc' : th < 5 ? numToWordsSk(th) + ' tisíc' : numToWordsSk(th) + ' tisíc';
    return tisic + (rest > 0 ? ' ' + numToWordsSk(rest) : '');
  }
  return String(n);
}

function amountToWords(amount: number, currency = 'EUR'): string {
  const whole = Math.floor(amount);
  const cents = Math.round((amount - whole) * 100);
  const curr = currency === 'EUR' ? 'eur' : currency.toLowerCase();
  return `${numToWordsSk(whole)} ${curr} ${cents} centov`;
}

export function CashReceiptPdfDoc({ invoice }: { invoice: InvoiceForPdf }) {
  const co = invoice.company;
  const isIncome = invoice.type === 'cash_receipt';
  const title = isIncome ? 'Príjmový pokladničný doklad' : 'Výdavkový pokladničný doklad';
  const partnerLabel = isIncome ? 'Prijaté od' : 'Vyplatené';
  const partnerName = invoice.customer_name || co.name;
  return (
    <Document>
      <Page size="A5" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.docType}>{title}</Text>
          <Text style={styles.docNo}>Číslo: {invoice.number}</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Dátum vystavenia:</Text>
          <Text style={styles.value}>{fmtDate(invoice.issue_date)}</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Organizácia:</Text>
          <Text style={styles.value}>{co.name}</Text>
        </View>

        {co.ico && (
          <View style={styles.row}>
            <Text style={styles.label}>IČO:</Text>
            <Text style={styles.value}>{co.ico}</Text>
          </View>
        )}

        <View style={styles.row}>
          <Text style={styles.label}>{partnerLabel}:</Text>
          <Text style={styles.value}>{partnerName}</Text>
        </View>

        {invoice.customer_ico && (
          <View style={styles.row}>
            <Text style={styles.label}>IČO príjemcu/platcu:</Text>
            <Text style={styles.value}>{invoice.customer_ico}</Text>
          </View>
        )}

        <View style={styles.amountBox}>
          <Text style={styles.amountLabel}>{isIncome ? 'Prijatá suma' : 'Vyplatená suma'}</Text>
          <Text style={styles.amountValue}>{fmtMoney(Number(invoice.total), invoice.currency)}</Text>
          <Text style={styles.amountWords}>
            Slovom: <Text style={{ fontWeight: 700 }}>{amountToWords(Number(invoice.total), invoice.currency)}</Text>
          </Text>
        </View>

        <View style={styles.purposeBox}>
          <Text style={styles.purposeLabel}>Účel platby</Text>
          <Text style={styles.purposeValue}>
            {invoice.notes || (invoice.items?.[0]?.description) || (isIncome ? 'Príjem hotovosti' : 'Výdaj hotovosti')}
          </Text>
        </View>

        {invoice.variable_symbol && (
          <View style={styles.row}>
            <Text style={styles.label}>Variabilný symbol:</Text>
            <Text style={styles.value}>{invoice.variable_symbol}</Text>
          </View>
        )}

        <View style={styles.signatures}>
          <View style={styles.signBox}>
            <View style={styles.signLine} />
            <Text style={styles.signLabel}>Pokladník</Text>
          </View>
          <View style={styles.signBox}>
            <View style={styles.signLine} />
            <Text style={styles.signLabel}>{isIncome ? 'Platiteľ' : 'Príjemca'}</Text>
          </View>
        </View>

        <View style={styles.footer} fixed>
          <Text>{co.name} · {invoice.number}</Text>
          <Text style={styles.watermark}>Doklad vygenerovaný systémom ZOLO · zolo.sk</Text>
        </View>
      </Page>
    </Document>
  );
}
