import { createClient } from '@/lib/supabase/server';
import { PageHeader, Card, CardHeader } from '@/components/ui';
import { fmtEur } from '@/lib/utils';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Koeficient DPH' };

export default async function VatCoefficientPage({ searchParams }: { searchParams: Promise<{ year?: string }> }) {
  const sp = await searchParams;
  const y = sp.year ? parseInt(sp.year, 10) : new Date().getFullYear();
  const sb = await createClient();

  // Sum vat-relevant outputs (602/604) vs vat-exempt outputs (e.g., booked to 648 or other exempt)
  // For SK: koeficient = výnosy s DPH / všetky výnosy
  const { data: rows } = await sb
    .from('chart_of_accounts')
    .select(`
      account_code,
      journal_entry_lines!journal_entry_lines_account_id_fkey(
        debit_amount, credit_amount,
        journal_entries!journal_entry_lines_journal_entry_id_fkey(entry_date)
      )
    `)
    .eq('is_active', true)
    .or('account_code.like.6%,account_code.like.34302');

  type R = { account_code: string; journal_entry_lines: { debit_amount: number; credit_amount: number; journal_entries: { entry_date: string } | { entry_date: string }[] | null }[] | null };

  let taxableRev = 0;
  let exemptRev = 0;
  let outputVat = 0;

  for (const r of (rows || []) as R[]) {
    let bal = 0;
    for (const l of r.journal_entry_lines || []) {
      const je = Array.isArray(l.journal_entries) ? l.journal_entries[0] : l.journal_entries;
      if (!je || parseInt(je.entry_date.slice(0, 4), 10) !== y) continue;
      bal += Number(l.credit_amount || 0) - Number(l.debit_amount || 0);
    }
    if (r.account_code === '34302') {
      outputVat = bal;
    } else if (r.account_code.startsWith('602') || r.account_code.startsWith('604') || r.account_code.startsWith('601')) {
      taxableRev += bal;
    } else if (r.account_code.startsWith('6')) {
      exemptRev += bal;
    }
  }

  const totalRev = taxableRev + exemptRev;
  const koeficient = totalRev > 0 ? taxableRev / totalRev : 0;
  const koeficientPercent = +(koeficient * 100).toFixed(2);

  return (
    <div className="p-4 sm:p-8 max-w-4xl">
      <Link href="/dashboard/vat" className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-900 mb-3">
        <ArrowLeft size={14} /> Späť
      </Link>
      <PageHeader title={`Koeficient DPH ${y}`} subtitle="Pomerné odpočítavanie DPH pri mixovaných výnosoch (zdaniteľné + oslobodené)" />

      <div className="grid grid-cols-3 gap-3 mb-4">
        <Card><div className="p-5"><div className="text-xs text-zinc-500 font-semibold uppercase">Zdaniteľné výnosy</div><div className="text-2xl font-bold mt-1 font-mono">{fmtEur(taxableRev)}</div></div></Card>
        <Card><div className="p-5"><div className="text-xs text-zinc-500 font-semibold uppercase">Oslobodené výnosy</div><div className="text-2xl font-bold mt-1 font-mono">{fmtEur(exemptRev)}</div></div></Card>
        <Card><div className="p-5"><div className="text-xs text-zinc-500 font-semibold uppercase">Koeficient</div><div className="text-2xl font-bold mt-1 text-zinc-900">{koeficientPercent.toFixed(2)} %</div></div></Card>
      </div>

      <Card>
        <CardHeader title="Vysvetlenie" />
        <div className="p-5 text-sm text-zinc-700 leading-relaxed space-y-3">
          <p>
            <strong>Koeficient {koeficientPercent.toFixed(2)} %</strong> znamená, že z DPH na vstupe (34301) môžeš odpočítať iba {koeficientPercent.toFixed(2)} % a zvyšok ide do nákladov (5xx).
          </p>
          {totalRev === 0 ? (
            <p className="text-amber-700">Nemáš žiadne výnosy za rok {y} — koeficient sa nedá vypočítať.</p>
          ) : exemptRev === 0 ? (
            <p className="text-emerald-700">Všetky tvoje výnosy sú zdaniteľné — odpočítavaš 100 % DPH na vstupe. Koeficient sa nepoužije.</p>
          ) : (
            <p>
              Použi {koeficientPercent.toFixed(2)} % pri ročnom zúčtovaní DPH. Mesačné/štvrťročné výkazy môžu používať predbežný koeficient z minulého roka.
            </p>
          )}
          <p className="text-xs text-zinc-500">
            Výpočet: zdaniteľné výnosy ({fmtEur(taxableRev)}) ÷ celkové výnosy ({fmtEur(totalRev)}) × 100
            <br />
            DPH na výstupe za rok: {fmtEur(outputVat)}
          </p>
        </div>
      </Card>
    </div>
  );
}
