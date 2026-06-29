// SEPA Credit Transfer (pain.001.001.03) — bulk payment order XML
// Output suitable for upload to most SK internet banking (SLSP, Tatra, VÚB, ČSOB).

function esc(s: string | null | undefined): string {
  return String(s || '').replace(/[<>&"']/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' }[c] || c));
}

export type SepaPayment = {
  amount: number;
  currency: string;
  beneficiaryName: string;
  beneficiaryIban: string;
  beneficiaryBic?: string | null;
  variableSymbol?: string | null;
  message?: string | null;
};

export type SepaDebtor = {
  name: string;
  iban: string;
  bic?: string | null;
};

export function generateSepaCreditTransfer(debtor: SepaDebtor, payments: SepaPayment[], reqId?: string): string {
  const now = new Date();
  const ts = now.toISOString();
  const msgId = (reqId || `ZOLO-${now.getTime()}`).slice(0, 35);
  const execDate = now.toISOString().slice(0, 10);
  const sumAmount = payments.reduce((s, p) => s + p.amount, 0).toFixed(2);
  const txs = payments.map((p, i) => {
    const vs = (p.variableSymbol || '').replace(/\D/g, '').slice(0, 10);
    const remitInfo = [
      p.message ? esc(p.message).slice(0, 140) : '',
      vs ? `/VS/${vs}` : '',
    ].filter(Boolean).join(' ').trim();
    return `
    <CdtTrfTxInf>
      <PmtId><EndToEndId>${msgId}-${i + 1}</EndToEndId></PmtId>
      <Amt><InstdAmt Ccy="${esc(p.currency || 'EUR')}">${p.amount.toFixed(2)}</InstdAmt></Amt>
      ${p.beneficiaryBic ? `<CdtrAgt><FinInstnId><BIC>${esc(p.beneficiaryBic)}</BIC></FinInstnId></CdtrAgt>` : ''}
      <Cdtr><Nm>${esc(p.beneficiaryName).slice(0, 70)}</Nm></Cdtr>
      <CdtrAcct><Id><IBAN>${esc(p.beneficiaryIban.replace(/\s+/g, ''))}</IBAN></Id></CdtrAcct>
      ${remitInfo ? `<RmtInf><Ustrd>${remitInfo}</Ustrd></RmtInf>` : ''}
    </CdtTrfTxInf>`;
  }).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pain.001.001.03" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <CstmrCdtTrfInitn>
    <GrpHdr>
      <MsgId>${esc(msgId)}</MsgId>
      <CreDtTm>${ts}</CreDtTm>
      <NbOfTxs>${payments.length}</NbOfTxs>
      <CtrlSum>${sumAmount}</CtrlSum>
      <InitgPty><Nm>${esc(debtor.name).slice(0, 70)}</Nm></InitgPty>
    </GrpHdr>
    <PmtInf>
      <PmtInfId>${esc(msgId)}-1</PmtInfId>
      <PmtMtd>TRF</PmtMtd>
      <NbOfTxs>${payments.length}</NbOfTxs>
      <CtrlSum>${sumAmount}</CtrlSum>
      <PmtTpInf><SvcLvl><Cd>SEPA</Cd></SvcLvl></PmtTpInf>
      <ReqdExctnDt>${execDate}</ReqdExctnDt>
      <Dbtr><Nm>${esc(debtor.name).slice(0, 70)}</Nm></Dbtr>
      <DbtrAcct><Id><IBAN>${esc(debtor.iban.replace(/\s+/g, ''))}</IBAN></Id></DbtrAcct>
      ${debtor.bic ? `<DbtrAgt><FinInstnId><BIC>${esc(debtor.bic)}</BIC></FinInstnId></DbtrAgt>` : '<DbtrAgt><FinInstnId/></DbtrAgt>'}
      <ChrgBr>SLEV</ChrgBr>
      ${txs}
    </PmtInf>
  </CstmrCdtTrfInitn>
</Document>`;
}
