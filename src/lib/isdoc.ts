// ISDOC 6.0.1 — electronic invoice exchange format used in CZ/SK B2B integrations.
// Spec: http://www.isdoc.cz/

function esc(s: string | null | undefined): string {
  return String(s ?? '').replace(/[<>&"']/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' }[c] || c));
}

export type IsdocItem = {
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

export type IsdocInvoice = {
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
  customer_name: string | null;
  customer_ico: string | null;
  customer_dic: string | null;
  customer_ic_dph: string | null;
  customer_street: string | null;
  customer_city: string | null;
  customer_zip: string | null;
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
  };
  items: IsdocItem[];
};

export function generateIsdoc(inv: IsdocInvoice): string {
  const co = inv.company;
  const docType = inv.type === 'credit_note' ? '2' : inv.type === 'debit_note' ? '3' : '1';
  const itemsXml = inv.items.map((it) => `
    <InvoiceLine>
      <ID>${it.position}</ID>
      <InvoicedQuantity unitCode="${esc(it.unit || 'ks')}">${it.quantity}</InvoicedQuantity>
      <LineExtensionAmount>${it.subtotal.toFixed(2)}</LineExtensionAmount>
      <LineExtensionAmountCurr>${it.subtotal.toFixed(2)}</LineExtensionAmountCurr>
      <UnitPrice>${it.unit_price.toFixed(4)}</UnitPrice>
      <UnitPriceTaxInclusive>${(it.unit_price * (1 + it.vat_rate / 100)).toFixed(4)}</UnitPriceTaxInclusive>
      <ClassifiedTaxCategory>
        <Percent>${it.vat_rate}</Percent>
        <VATCalculationMethod>0</VATCalculationMethod>
      </ClassifiedTaxCategory>
      <Item>
        <Description>${esc(it.description)}</Description>
      </Item>
    </InvoiceLine>`).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="http://isdoc.cz/namespace/2013" version="6.0.1">
  <DocumentType>${docType}</DocumentType>
  <ID>${esc(inv.number)}</ID>
  <UUID>${crypto.randomUUID()}</UUID>
  <IssueDate>${inv.issue_date}</IssueDate>
  <TaxPointDate>${inv.delivery_date || inv.issue_date}</TaxPointDate>
  <VATApplicable>${co.ic_dph ? 'true' : 'false'}</VATApplicable>
  <Note>${esc(inv.notes || '')}</Note>
  <LocalCurrencyCode>${esc(inv.currency || 'EUR')}</LocalCurrencyCode>
  <CurrRate>1</CurrRate>
  <RefCurrRate>1</RefCurrRate>
  <AccountingSupplierParty>
    <Party>
      <PartyIdentification><ID>${esc(co.ico)}</ID></PartyIdentification>
      <PartyName><Name>${esc(co.name)}</Name></PartyName>
      <PostalAddress>
        <StreetName>${esc(co.street)}</StreetName>
        <CityName>${esc(co.city)}</CityName>
        <PostalZone>${esc(co.zip)}</PostalZone>
        <Country><IdentificationCode>SK</IdentificationCode></Country>
      </PostalAddress>
      ${co.dic ? `<PartyTaxScheme><CompanyID>${esc(co.dic)}</CompanyID><TaxScheme>DIČ</TaxScheme></PartyTaxScheme>` : ''}
      ${co.ic_dph ? `<PartyTaxScheme><CompanyID>${esc(co.ic_dph)}</CompanyID><TaxScheme>VAT</TaxScheme></PartyTaxScheme>` : ''}
    </Party>
  </AccountingSupplierParty>
  <AccountingCustomerParty>
    <Party>
      <PartyIdentification><ID>${esc(inv.customer_ico)}</ID></PartyIdentification>
      <PartyName><Name>${esc(inv.customer_name)}</Name></PartyName>
      <PostalAddress>
        <StreetName>${esc(inv.customer_street)}</StreetName>
        <CityName>${esc(inv.customer_city)}</CityName>
        <PostalZone>${esc(inv.customer_zip)}</PostalZone>
        <Country><IdentificationCode>SK</IdentificationCode></Country>
      </PostalAddress>
      ${inv.customer_dic ? `<PartyTaxScheme><CompanyID>${esc(inv.customer_dic)}</CompanyID><TaxScheme>DIČ</TaxScheme></PartyTaxScheme>` : ''}
      ${inv.customer_ic_dph ? `<PartyTaxScheme><CompanyID>${esc(inv.customer_ic_dph)}</CompanyID><TaxScheme>VAT</TaxScheme></PartyTaxScheme>` : ''}
    </Party>
  </AccountingCustomerParty>
  <InvoiceLines>${itemsXml}
  </InvoiceLines>
  <TaxTotal>
    <TaxAmount>${inv.vat_amount.toFixed(2)}</TaxAmount>
    <TaxAmountCurr>${inv.vat_amount.toFixed(2)}</TaxAmountCurr>
  </TaxTotal>
  <LegalMonetaryTotal>
    <TaxExclusiveAmount>${inv.subtotal.toFixed(2)}</TaxExclusiveAmount>
    <TaxExclusiveAmountCurr>${inv.subtotal.toFixed(2)}</TaxExclusiveAmountCurr>
    <TaxInclusiveAmount>${inv.total.toFixed(2)}</TaxInclusiveAmount>
    <TaxInclusiveAmountCurr>${inv.total.toFixed(2)}</TaxInclusiveAmountCurr>
    <PayableAmount>${inv.total.toFixed(2)}</PayableAmount>
    <PayableAmountCurr>${inv.total.toFixed(2)}</PayableAmountCurr>
  </LegalMonetaryTotal>
  ${co.iban ? `<PaymentMeans>
    <Payment>
      <PaidAmount>${inv.total.toFixed(2)}</PaidAmount>
      <PaymentMeansCode>42</PaymentMeansCode>
      <Details>
        <PaymentDueDate>${inv.due_date}</PaymentDueDate>
        <ID>${esc(co.iban)}</ID>
        ${inv.variable_symbol ? `<VariableSymbol>${esc(inv.variable_symbol)}</VariableSymbol>` : ''}
      </Details>
    </Payment>
  </PaymentMeans>` : ''}
</Invoice>`;
}
