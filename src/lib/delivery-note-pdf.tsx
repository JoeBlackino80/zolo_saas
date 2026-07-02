import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import type { InvoiceForPdf } from './invoice-pdf';

// DL — Dodací list
// Bez cien (voliteľne s cenami), signature lines pre odovzdávajúceho a prijímajúceho.

const styles = StyleSheet.create({
  page: { fontFamily: 'Roboto', fontSize: 9.5, padding: 38, color: '#18181b', lineHeight: 1.5 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, borderBottom: '1 solid #e4e4e7', paddingBottom: 14 },
  brand: { flexDirection: 'column', width: '65%' },
  brandTitle: { fontSize: 20, fontWeight: 700, color: '#18181b', letterSpacing: -0.3, marginBottom: 6, lineHeight: 1.15 },
  brandSubtitle: { fontSize: 9, color: '#71717a', marginTop: 3, lineHeight: 1.4 },
  docNumber: { textAlign: 'right', width: '35%' },
  docType: { fontSize: 10, color: '#71717a', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 },
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
  linkedInvoice: { marginBottom: 16, padding: 10, backgroundColor: '#fafafa', borderRadius: 6, borderLeft: '3 solid #18181b' },
  linkedText: { fontSize: 10, color: '#3f3f46' },
  linkedStrong: { fontWeight: 700, color: '#18181b' },
  table: { marginBottom: 16 },
  tableHeader: { flexDirection: 'row', backgroundColor: '#f4f4f5', paddingVertical: 8, paddingHorizontal: 10, borderTop: '1 solid #e4e4e7', borderBottom: '1 solid #e4e4e7' },
  tableHeaderCell: { fontSize: 8, color: '#3f3f46', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.3, paddingRight: 4 },
  tableRow: { flexDirection: 'row', paddingVertical: 10, paddingHorizontal: 10, borderBottom: '1 solid #f4f4f5' },
  tableCell: { fontSize: 9.5, color: '#18181b', paddingRight: 4 },
  c1: { width: '6%' },
  c2: { width: '50%' },
  c3: { width: '10%', textAlign: 'center' },
  c4: { width: '12%', textAlign: 'right' },
  c5: { width: '10%', textAlign: 'left', paddingLeft: 4 },
  c6: { width: '12%', textAlign: 'right' },
  totalQty: { marginTop: 4, padding: 10, backgroundColor: '#fafafa', flexDirection: 'row', justifyContent: 'space-between' },
  totalQtyLabel: { fontSize: 10, color: '#71717a', fontWeight: 700 },
  totalQtyValue: { fontSize: 12, fontWeight: 700, color: '#18181b', fontFamily: 'RobotoMono' },
  notes: { marginTop: 16, padding: 12, backgroundColor: '#fafafa', borderRadius: 4, fontSize: 9, color: '#3f3f46', fontStyle: 'italic' },
  signatures: { marginTop: 40, flexDirection: 'row', gap: 40, justifyContent: 'space-between' },
  signBox: { flex: 1, alignItems: 'center' },
  signLine: { width: '100%', borderTop: '1 solid #71717a', marginBottom: 4 },
  signLabel: { fontSize: 8, color: '#71717a', textTransform: 'uppercase', letterSpacing: 0.5 },
  signDate: { fontSize: 8, color: '#a1a1aa', marginTop: 2 },
  footer: { position: 'absolute', bottom: 20, left: 38, right: 38, textAlign: 'center', fontSize: 8, color: '#a1a1aa', borderTop: '1 solid #e4e4e7', paddingTop: 6 },
  watermark: { fontSize: 7, color: '#d4d4d8', marginTop: 3, letterSpacing: 0.3 },
});

function fmtDate(d: string | null | undefined): string {
  if (!d) return '—';
  const [y, m, day] = d.split('-');
  return `${day}. ${m}. ${y}`;
}

export function DeliveryNotePdfDoc({ invoice, parentInvoiceNumber }: { invoice: InvoiceForPdf; parentInvoiceNumber?: string | null }) {
  const co = invoice.company;
  const totalQty = invoice.items.reduce((s, i) => s + Number(i.quantity || 0), 0);
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.brand}>
            <Text style={styles.brandTitle}>{co.name}</Text>
            <Text style={styles.brandSubtitle}>{co.street ? `${co.street}, ` : ''}{co.zip} {co.city}</Text>
            <Text style={styles.brandSubtitle}>IČO {co.ico || '—'} · DIČ {co.dic || '—'}{co.ic_dph ? ` · IČ DPH ${co.ic_dph}` : ''}</Text>
          </View>
          <View style={styles.docNumber}>
            <Text style={styles.docType}>Dodací list</Text>
            <Text style={styles.docNo}>{invoice.number}</Text>
          </View>
        </View>

        {parentInvoiceNumber && (
          <View style={styles.linkedInvoice}>
            <Text style={styles.linkedText}>
              Vzťahuje sa k faktúre <Text style={styles.linkedStrong}>{parentInvoiceNumber}</Text>
            </Text>
          </View>
        )}

        <View style={styles.parties}>
          <View style={styles.partyBox}>
            <Text style={styles.partyLabel}>Odosielateľ</Text>
            <Text style={styles.partyName}>{co.name}</Text>
            {co.street && <Text style={styles.partyLine}>{co.street}</Text>}
            {(co.zip || co.city) && <Text style={styles.partyLine}>{co.zip || ''} {co.city || ''}</Text>}
            <Text style={styles.partyLine}><Text style={styles.partyKey}>IČO: </Text>{co.ico || '—'}</Text>
          </View>
          <View style={styles.partyBox}>
            <Text style={styles.partyLabel}>Príjemca</Text>
            <Text style={styles.partyName}>{invoice.customer_name || '—'}</Text>
            {invoice.customer_street && <Text style={styles.partyLine}>{invoice.customer_street}</Text>}
            {(invoice.customer_zip || invoice.customer_city) && <Text style={styles.partyLine}>{invoice.customer_zip || ''} {invoice.customer_city || ''}</Text>}
            <Text style={styles.partyLine}><Text style={styles.partyKey}>IČO: </Text>{invoice.customer_ico || '—'}</Text>
          </View>
        </View>

        <View style={styles.meta}>
          <View style={styles.metaCell}>
            <Text style={styles.metaLabel}>Dátum vystavenia</Text>
            <Text style={styles.metaValue}>{fmtDate(invoice.issue_date)}</Text>
          </View>
          <View style={styles.metaCell}>
            <Text style={styles.metaLabel}>Dátum dodania</Text>
            <Text style={styles.metaValue}>{fmtDate(invoice.delivery_date || invoice.issue_date)}</Text>
          </View>
          <View style={styles.metaCell}>
            <Text style={styles.metaLabel}>Počet položiek</Text>
            <Text style={styles.metaValue}>{invoice.items.length}</Text>
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, styles.c1]}>#</Text>
            <Text style={[styles.tableHeaderCell, styles.c2]}>Popis položky</Text>
            <Text style={[styles.tableHeaderCell, styles.c3]}>Kód</Text>
            <Text style={[styles.tableHeaderCell, styles.c4]}>Množstvo</Text>
            <Text style={[styles.tableHeaderCell, styles.c5]}>MJ</Text>
            <Text style={[styles.tableHeaderCell, styles.c6]}>Poznámka</Text>
          </View>
          {invoice.items.map((it) => (
            <View key={it.position} style={styles.tableRow}>
              <Text style={[styles.tableCell, styles.c1]}>{it.position}</Text>
              <Text style={[styles.tableCell, styles.c2]}>{it.description}</Text>
              <Text style={[styles.tableCell, styles.c3]}>—</Text>
              <Text style={[styles.tableCell, styles.c4, { fontWeight: 700 }]}>{Number(it.quantity).toLocaleString('sk-SK')}</Text>
              <Text style={[styles.tableCell, styles.c5]}>{it.unit}</Text>
              <Text style={[styles.tableCell, styles.c6]}>—</Text>
            </View>
          ))}
        </View>

        <View style={styles.totalQty}>
          <Text style={styles.totalQtyLabel}>Spolu položiek</Text>
          <Text style={styles.totalQtyValue}>{totalQty.toLocaleString('sk-SK')} ks</Text>
        </View>

        {invoice.notes && (<Text style={styles.notes}>{invoice.notes}</Text>)}

        <View style={styles.signatures}>
          <View style={styles.signBox}>
            <View style={styles.signLine} />
            <Text style={styles.signLabel}>Odovzdal (dátum, podpis)</Text>
            <Text style={styles.signDate}>{fmtDate(invoice.delivery_date || invoice.issue_date)}</Text>
          </View>
          <View style={styles.signBox}>
            <View style={styles.signLine} />
            <Text style={styles.signLabel}>Prevzal (dátum, podpis)</Text>
            <Text style={styles.signDate}>{'.'.padEnd(14, ' ') + '.'.padEnd(14, ' ') + '.'.padEnd(6, ' ')}</Text>
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
