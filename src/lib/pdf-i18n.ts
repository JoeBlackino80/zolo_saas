// Preklady pre invoice PDF templates (InvoicePdfDoc, CashReceiptPdfDoc,
// DeliveryNotePdfDoc). Podporované jazyky: SK (default), EN, DE.

export type PdfLang = 'sk' | 'en' | 'de';

export const PDF_LANGS: { code: PdfLang; label: string; flag: string }[] = [
  { code: 'sk', label: 'Slovenčina', flag: '🇸🇰' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
];

type Translations = {
  // Document types
  invoice: string;
  received_invoice: string;
  proforma: string;
  advance_invoice: string;
  received_proforma: string;
  credit_note: string;
  received_credit_note: string;
  storno: string;
  debit_note: string;
  delivery_note: string;
  quote: string;
  cash_receipt: string;
  cash_payout: string;

  // Header labels
  supplier: string;
  customer: string;
  senderDL: string;
  receiverDL: string;
  ico: string;
  dic: string;
  icDph: string;

  // Meta
  issueDate: string;
  deliveryDate: string;
  dueDate: string;
  variableSymbol: string;
  variableSymbolShort: string;

  // Table
  colHash: string;
  colDescription: string;
  colQuantity: string;
  colUnit: string;
  colUnitPrice: string;
  colVat: string;
  colTotal: string;
  colCode: string;
  colNote: string;

  // Totals
  subtotal: string;
  vat: string;
  amountDue: string;

  // Payment
  paymentDetails: string;
  iban: string;
  bicSwift: string;
  bank: string;
  paymentPayByCard: string;
  payBySquare: string;

  // Cash receipt (PPD/VPD)
  receiptTitle: string;
  payoutTitle: string;
  number: string;
  receivedFrom: string;
  paidTo: string;
  organization: string;
  amountReceived: string;
  amountPaid: string;
  inWords: string;
  purposePayment: string;
  cashier: string;
  payer: string;
  receiver: string;

  // Delivery note
  deliveryNoteTitle: string;
  relatesTo: string;
  totalItems: string;
  itemsCount: string;
  handedOver: string;
  receivedBy: string;
  dateSignature: string;

  // Footer
  pageOf: string;
  generatedBy: string;
};

export const T: Record<PdfLang, Translations> = {
  sk: {
    invoice: 'Faktúra',
    received_invoice: 'Prijatá faktúra',
    proforma: 'Zálohová faktúra',
    advance_invoice: 'Preddavková faktúra',
    received_proforma: 'Prijatá zálohová faktúra',
    credit_note: 'Dobropis',
    received_credit_note: 'Prijatý dobropis',
    storno: 'Storno doklad',
    debit_note: 'Ťarchopis',
    delivery_note: 'Dodací list',
    quote: 'Cenová ponuka',
    cash_receipt: 'Príjmový pokladničný doklad',
    cash_payout: 'Výdavkový pokladničný doklad',

    supplier: 'Dodávateľ',
    customer: 'Odberateľ',
    senderDL: 'Odosielateľ',
    receiverDL: 'Príjemca',
    ico: 'IČO',
    dic: 'DIČ',
    icDph: 'IČ DPH',

    issueDate: 'Vystavená',
    deliveryDate: 'DZP',
    dueDate: 'Splatná',
    variableSymbol: 'Variabilný symbol',
    variableSymbolShort: 'Var. symbol',

    colHash: '#',
    colDescription: 'Popis',
    colQuantity: 'Množstvo',
    colUnit: 'MJ',
    colUnitPrice: 'Cena/MJ',
    colVat: 'DPH',
    colTotal: 'Spolu',
    colCode: 'Kód',
    colNote: 'Poznámka',

    subtotal: 'Základ DPH:',
    vat: 'DPH:',
    amountDue: 'K úhrade',

    paymentDetails: 'Platobné údaje',
    iban: 'IBAN',
    bicSwift: 'BIC / SWIFT',
    bank: 'Banka',
    paymentPayByCard: 'Zaplatiť kartou',
    payBySquare: 'PAY by square',

    receiptTitle: 'Príjmový pokladničný doklad',
    payoutTitle: 'Výdavkový pokladničný doklad',
    number: 'Číslo',
    receivedFrom: 'Prijaté od',
    paidTo: 'Vyplatené',
    organization: 'Organizácia',
    amountReceived: 'Prijatá suma',
    amountPaid: 'Vyplatená suma',
    inWords: 'Slovom',
    purposePayment: 'Účel platby',
    cashier: 'Pokladník',
    payer: 'Platiteľ',
    receiver: 'Príjemca',

    deliveryNoteTitle: 'Dodací list',
    relatesTo: 'Vzťahuje sa k faktúre',
    totalItems: 'Spolu položiek',
    itemsCount: 'Počet položiek',
    handedOver: 'Odovzdal (dátum, podpis)',
    receivedBy: 'Prevzal (dátum, podpis)',
    dateSignature: 'Dátum, podpis',

    pageOf: 'strana',
    generatedBy: 'Doklad vygenerovaný systémom ZOLO · zolo.sk',
  },

  en: {
    invoice: 'Invoice',
    received_invoice: 'Received invoice',
    proforma: 'Proforma invoice',
    advance_invoice: 'Advance invoice',
    received_proforma: 'Received proforma',
    credit_note: 'Credit note',
    received_credit_note: 'Received credit note',
    storno: 'Cancellation note',
    debit_note: 'Debit note',
    delivery_note: 'Delivery note',
    quote: 'Quote',
    cash_receipt: 'Cash receipt',
    cash_payout: 'Cash payout',

    supplier: 'Supplier',
    customer: 'Customer',
    senderDL: 'Sender',
    receiverDL: 'Recipient',
    ico: 'Reg. No.',
    dic: 'Tax ID',
    icDph: 'VAT ID',

    issueDate: 'Issue date',
    deliveryDate: 'Delivery date',
    dueDate: 'Due date',
    variableSymbol: 'Reference',
    variableSymbolShort: 'Reference',

    colHash: '#',
    colDescription: 'Description',
    colQuantity: 'Quantity',
    colUnit: 'Unit',
    colUnitPrice: 'Unit price',
    colVat: 'VAT',
    colTotal: 'Total',
    colCode: 'Code',
    colNote: 'Note',

    subtotal: 'Subtotal:',
    vat: 'VAT:',
    amountDue: 'Amount due',

    paymentDetails: 'Payment details',
    iban: 'IBAN',
    bicSwift: 'BIC / SWIFT',
    bank: 'Bank',
    paymentPayByCard: 'Pay by card',
    payBySquare: 'PAY by square',

    receiptTitle: 'Cash receipt',
    payoutTitle: 'Cash payout',
    number: 'Number',
    receivedFrom: 'Received from',
    paidTo: 'Paid to',
    organization: 'Organization',
    amountReceived: 'Amount received',
    amountPaid: 'Amount paid',
    inWords: 'In words',
    purposePayment: 'Purpose',
    cashier: 'Cashier',
    payer: 'Payer',
    receiver: 'Recipient',

    deliveryNoteTitle: 'Delivery note',
    relatesTo: 'Related to invoice',
    totalItems: 'Total items',
    itemsCount: 'Number of items',
    handedOver: 'Handed over (date, signature)',
    receivedBy: 'Received by (date, signature)',
    dateSignature: 'Date, signature',

    pageOf: 'page',
    generatedBy: 'Document generated by ZOLO system · zolo.sk',
  },

  de: {
    invoice: 'Rechnung',
    received_invoice: 'Eingangsrechnung',
    proforma: 'Proforma-Rechnung',
    advance_invoice: 'Vorauszahlungsrechnung',
    received_proforma: 'Eingangs-Proforma',
    credit_note: 'Gutschrift',
    received_credit_note: 'Eingangs-Gutschrift',
    storno: 'Stornorechnung',
    debit_note: 'Lastschrift',
    delivery_note: 'Lieferschein',
    quote: 'Angebot',
    cash_receipt: 'Kasseneingangsbeleg',
    cash_payout: 'Kassenausgangsbeleg',

    supplier: 'Lieferant',
    customer: 'Kunde',
    senderDL: 'Absender',
    receiverDL: 'Empfänger',
    ico: 'Reg.-Nr.',
    dic: 'St.-Nr.',
    icDph: 'USt-IdNr.',

    issueDate: 'Rechnungsdatum',
    deliveryDate: 'Leistungsdatum',
    dueDate: 'Fälligkeitsdatum',
    variableSymbol: 'Referenz',
    variableSymbolShort: 'Referenz',

    colHash: '#',
    colDescription: 'Beschreibung',
    colQuantity: 'Menge',
    colUnit: 'Einh.',
    colUnitPrice: 'Einzelpreis',
    colVat: 'MwSt',
    colTotal: 'Gesamt',
    colCode: 'Code',
    colNote: 'Notiz',

    subtotal: 'Nettosumme:',
    vat: 'MwSt:',
    amountDue: 'Zu zahlen',

    paymentDetails: 'Zahlungsdaten',
    iban: 'IBAN',
    bicSwift: 'BIC / SWIFT',
    bank: 'Bank',
    paymentPayByCard: 'Per Karte zahlen',
    payBySquare: 'PAY by square',

    receiptTitle: 'Kasseneingangsbeleg',
    payoutTitle: 'Kassenausgangsbeleg',
    number: 'Nummer',
    receivedFrom: 'Erhalten von',
    paidTo: 'Ausgezahlt an',
    organization: 'Organisation',
    amountReceived: 'Erhaltener Betrag',
    amountPaid: 'Ausgezahlter Betrag',
    inWords: 'In Worten',
    purposePayment: 'Verwendungszweck',
    cashier: 'Kassierer',
    payer: 'Einzahler',
    receiver: 'Empfänger',

    deliveryNoteTitle: 'Lieferschein',
    relatesTo: 'Bezieht sich auf Rechnung',
    totalItems: 'Positionen gesamt',
    itemsCount: 'Anzahl Positionen',
    handedOver: 'Übergeben (Datum, Unterschrift)',
    receivedBy: 'Erhalten (Datum, Unterschrift)',
    dateSignature: 'Datum, Unterschrift',

    pageOf: 'Seite',
    generatedBy: 'Beleg erstellt durch ZOLO · zolo.sk',
  },
};

export function getT(lang: string | null | undefined): Translations {
  const code = (lang as PdfLang) || 'sk';
  return T[code] || T.sk;
}

export function docTypeLabel(type: string, lang: PdfLang): string {
  const t = T[lang] || T.sk;
  return (t as unknown as Record<string, string>)[type] || type;
}
