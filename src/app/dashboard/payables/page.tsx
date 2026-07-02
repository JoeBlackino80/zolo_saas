'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { PageHeader, Card, EmptyState, Badge, Button } from '@/components/ui';
import { Clock, CheckSquare, Square, Download, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { fmtEur, fmtDate } from '@/lib/utils';
import { generateSepaCreditTransfer, type SepaPayment } from '@/lib/sepa';
import { useToast } from '@/components/Toast';

type Payable = {
  id: string;
  number: string;
  supplier_name: string | null;
  supplier_ico: string | null;
  supplier_ic_dph: string | null;
  supplier_iban?: string | null;
  supplier_bic?: string | null;
  issue_date: string;
  due_date: string;
  total: number;
  paid_amount: number | null;
  status: string;
  currency: string;
  variable_symbol: string | null;
  notes: string | null;
};

export default function PayablesPage() {
  const toast = useToast();
  const [rows, setRows] = useState<Payable[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [firm, setFirm] = useState<{ id: string; name: string; iban: string | null; bic: string | null } | null>(null);
  const [busy, setBusy] = useState(false);
  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    (async () => {
      const sb = createClient();
      const firmId = typeof window !== 'undefined' ? localStorage.getItem('zolo_firm') : '';
      if (firmId) {
        const { data: co } = await sb.from('companies').select('id, name, iban, bic').eq('id', firmId).maybeSingle();
        setFirm(co as { id: string; name: string; iban: string | null; bic: string | null } | null);
      }

      const { data } = await sb
        .from('invoices')
        .select('id, number, supplier_name, supplier_ico, supplier_ic_dph, supplier_iban, supplier_bic, issue_date, due_date, total, paid_amount, status, currency, variable_symbol, notes')
        .eq('type', 'received_invoice')
        .is('deleted_at', null)
        .order('due_date', { ascending: true })
        .limit(500);

      const unpaid = ((data || []) as Payable[]).filter((r) => Number(r.total) - Number(r.paid_amount || 0) > 0.01);
      setRows(unpaid);
    })();
  }, []);

  function toggle(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelected(next);
  }
  function toggleAll() {
    if (selected.size === rows.length) setSelected(new Set());
    else setSelected(new Set(rows.map((r) => r.id)));
  }

  async function downloadSepa() {
    if (!firm?.iban) { toast('Firma nemá nastavený IBAN. Doplň v Nastaveniach.', 'error'); return; }
    const toPay = rows.filter((r) => selected.has(r.id));
    const missingIban = toPay.filter((r) => !r.supplier_iban);
    if (missingIban.length > 0) {
      if (!confirm(`${missingIban.length} PFA nemá IBAN dodávateľa — budú vynechané. Pokračovať?`)) return;
    }
    const valid = toPay.filter((r) => r.supplier_iban);
    if (valid.length === 0) { toast('Žiadne platby s IBAN', 'error'); return; }

    setBusy(true);
    const payments: SepaPayment[] = valid.map((r) => ({
      amount: +(Number(r.total) - Number(r.paid_amount || 0)).toFixed(2),
      currency: r.currency || 'EUR',
      beneficiaryName: r.supplier_name || 'Dodávateľ',
      beneficiaryIban: r.supplier_iban || '',
      beneficiaryBic: r.supplier_bic,
      variableSymbol: r.variable_symbol || r.number.replace(/\D/g, ''),
      message: `Uhrada ${r.number}`,
    }));

    const xml = generateSepaCreditTransfer(
      { name: firm.name, iban: firm.iban, bic: firm.bic || undefined },
      payments,
      `ZOLO-BATCH-${Date.now()}`
    );

    const blob = new Blob([xml], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SEPA_batch_${new Date().toISOString().slice(0, 10)}.xml`;
    a.click();
    URL.revokeObjectURL(url);
    setBusy(false);
    toast(`SEPA XML pre ${valid.length} platieb pripravené na upload do banky`, 'success');
  }

  const totalDue = rows.reduce((s, r) => s + (Number(r.total) - Number(r.paid_amount || 0)), 0);
  const overdue = rows.filter((r) => r.due_date < today);
  const overdueDue = overdue.reduce((s, r) => s + (Number(r.total) - Number(r.paid_amount || 0)), 0);
  const selectedRows = rows.filter((r) => selected.has(r.id));
  const selectedTotal = selectedRows.reduce((s, r) => s + (Number(r.total) - Number(r.paid_amount || 0)), 0);

  return (
    <div className="p-4 sm:p-8 max-w-7xl">
      <PageHeader
        title="Záväzky"
        subtitle={`${rows.length} nezaplatených PFA · ${fmtEur(totalDue)} celkom · ${overdue.length} po splatnosti (${fmtEur(overdueDue)})`}
        actions={
          selected.size > 0 && (
            <div className="flex items-center gap-3">
              <div className="text-[13px] text-zinc-600">
                Označené: <strong className="text-zinc-900 font-mono">{fmtEur(selectedTotal)}</strong>
              </div>
              <Button variant="primary" onClick={downloadSepa} disabled={busy || !firm?.iban}>
                {busy ? <><Loader2 size={14} className="animate-spin" /> Generujem…</> : <><Download size={14} /> SEPA XML ({selected.size})</>}
              </Button>
            </div>
          )
        }
      />

      {!firm?.iban && (
        <Card className="mb-4 border-amber-200 bg-amber-50/50">
          <div className="p-4 text-[13px] text-amber-900">
            ⚠ Tvoja firma <strong>{firm?.name}</strong> nemá nastavený IBAN. Pre generovanie SEPA XML → <Link href="/dashboard/settings" className="underline">nastav IBAN</Link>.
          </div>
        </Card>
      )}

      {rows.length === 0 ? (
        <Card><EmptyState icon={<Clock size={24} />} title="Žiadne nezaplatené záväzky" description="Všetky prijaté faktúry sú uhradené." /></Card>
      ) : (
        <Card>
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-zinc-50 text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">
                  <th className="px-4 py-3 w-8 text-center">
                    <button onClick={toggleAll}>
                      {selected.size === rows.length && rows.length > 0 ? <CheckSquare size={14} className="text-zinc-900" /> : <Square size={14} className="text-zinc-400" />}
                    </button>
                  </th>
                  <th className="text-left px-3 py-3">Číslo PFA</th>
                  <th className="text-left px-3 py-3">Dodávateľ</th>
                  <th className="text-left px-3 py-3">IBAN</th>
                  <th className="text-center px-3 py-3">Splatná</th>
                  <th className="text-right px-3 py-3">Suma</th>
                  <th className="text-right px-3 py-3">Zaplatené</th>
                  <th className="text-right px-3 py-3">Zostáva</th>
                  <th className="text-center px-3 py-3">Stav</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {rows.map((r) => {
                  const remaining = Number(r.total) - Number(r.paid_amount || 0);
                  const isOverdue = r.due_date < today;
                  const isSelected = selected.has(r.id);
                  return (
                    <tr key={r.id} className={`hover:bg-zinc-50 transition ${isSelected ? 'bg-zinc-50' : ''}`}>
                      <td className="px-4 py-3 text-center">
                        <button onClick={() => toggle(r.id)}>
                          {isSelected ? <CheckSquare size={14} className="text-zinc-900" /> : <Square size={14} className="text-zinc-400" />}
                        </button>
                      </td>
                      <td className="px-3 py-3"><Link href={`/dashboard/invoices/${r.id}`} className="font-mono text-xs font-medium text-zinc-900 hover:underline">{r.number}</Link></td>
                      <td className="px-3 py-3 text-zinc-700">{r.supplier_name || '—'}</td>
                      <td className="px-3 py-3 font-mono text-[10px] text-zinc-500">
                        {r.supplier_iban ? `${r.supplier_iban.slice(0, 4)}…${r.supplier_iban.slice(-4)}` : <Badge variant="red">chýba</Badge>}
                      </td>
                      <td className={`px-3 py-3 text-center font-mono text-xs ${isOverdue ? 'text-red-600 font-bold' : 'text-zinc-600'}`}>{fmtDate(r.due_date)}</td>
                      <td className="px-3 py-3 text-right font-mono text-zinc-900">{fmtEur(Number(r.total))}</td>
                      <td className="px-3 py-3 text-right font-mono text-zinc-500">{fmtEur(Number(r.paid_amount || 0))}</td>
                      <td className="px-3 py-3 text-right font-mono font-bold">{fmtEur(remaining)}</td>
                      <td className="px-3 py-3 text-center">
                        <Badge variant={isOverdue ? 'red' : Number(r.paid_amount || 0) > 0 ? 'amber' : 'blue'}>
                          {isOverdue ? 'Po splatnosti' : Number(r.paid_amount || 0) > 0 ? 'Čiastočne' : 'Nezaplatené'}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
