import { encode } from 'bysquare/pay';
import QRCode from 'qrcode';

export async function generatePayBySquareQR(opts: {
  iban: string;
  amount: number;
  currency: string;
  beneficiaryName: string;
  variableSymbol?: string | null;
  constantSymbol?: string | null;
  specificSymbol?: string | null;
  message?: string | null;
}): Promise<string | null> {
  try {
    const iban = (opts.iban || '').replace(/\s+/g, '');
    if (!iban) return null;
    const text = await encode({
      payments: [
        {
          type: 1,
          amount: Number(opts.amount.toFixed(2)),
          currencyCode: opts.currency || 'EUR',
          variableSymbol: opts.variableSymbol || '',
          constantSymbol: opts.constantSymbol || '',
          specificSymbol: opts.specificSymbol || '',
          paymentNote: opts.message || '',
          bankAccounts: [{ iban }],
          beneficiary: { name: (opts.beneficiaryName || 'Príjemca').slice(0, 70) },
        },
      ],
    });
    const dataUrl = await QRCode.toDataURL(text, { errorCorrectionLevel: 'M', margin: 1, width: 220 });
    return dataUrl;
  } catch (e) {
    console.warn('PAY by square QR generation failed:', e instanceof Error ? e.message : e);
    return null;
  }
}

// Mod-97 IBAN check (ISO 13616)
export function validateIban(iban: string): { ok: boolean; reason?: string } {
  const cleaned = (iban || '').replace(/\s+/g, '').toUpperCase();
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{1,30}$/.test(cleaned)) return { ok: false, reason: 'Neplatný formát' };
  if (cleaned.length < 15 || cleaned.length > 34) return { ok: false, reason: 'Neplatná dĺžka' };
  // Move first 4 chars to end, convert letters to numbers (A=10..Z=35), mod 97 must be 1
  const rearranged = cleaned.slice(4) + cleaned.slice(0, 4);
  let num = '';
  for (const ch of rearranged) {
    const c = ch.charCodeAt(0);
    if (c >= 48 && c <= 57) num += ch;
    else if (c >= 65 && c <= 90) num += String(c - 55);
    else return { ok: false, reason: 'Neplatný znak' };
  }
  // mod 97 on huge string
  let rem = 0;
  for (let i = 0; i < num.length; i++) {
    rem = (rem * 10 + (num.charCodeAt(i) - 48)) % 97;
  }
  return rem === 1 ? { ok: true } : { ok: false, reason: 'Nesprávny kontrolný súčet' };
}
