'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Download, FileDown } from 'lucide-react';
import { PageHeader, Card, Field, Input, Select, Button } from '@/components/ui';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/components/Toast';
import { fmtEur, fmtDate } from '@/lib/utils';
import { generateSepaCreditTransfer } from '@/lib/sepa';

type PFA = { id: string; number: string; total: number; paid_amount: number; supplier_name: string | null; supplier_iban: string | null; supplier_bic: string | null; variable_symbol: string | null; due_date: string };
type Bank = { id: string; bank_name: string | null; iban: string; bic: string | null };

export default function PaymentOrdersPage() {
  const toast = useToast();
  const [pfas, setPfas] = useState<PFA[]>([]);
  const [bankAccounts, setBankAccounts] = useState<Bank[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [debtorBankId, setDebtorBankId] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [companyId, setCompanyId] = useState('');

  useEffect(() => {
    (async () => {
      const sb = createClient();
      const cid = typeof window !== 'undefined' ? localStorage.getItem('zolo_firm') : null;
      if (cid) {
        setCompanyId(cid);
        const { data: c } = await sb.from('companies').select('name').eq('id', cid).single();
        if (c) setCompanyName(c.name);
        const { data: ba } = await sb.from('bank_accounts').select('id, bank_name, iban, bic').eq('company_id', cid).eq('is_active', true);
        setBankAccounts((ba as Bank[]) || []);
        if (ba?.length) setDebtorBankId(ba[0].id);
      }
      const { data: invs } = await sb
        .from('invoices')
        .select('id, number, total, paid_amount, supplier_name, supplier_iban, supplier_bic, variable_symbol, due_date')
        .eq('type', 'received_invoice')
        .neq('status', 'paid')
        .is('deleted_at', null)
        .order('due_date', { ascending: true });
      setPfas((invs as PFA[]) || []);
    })();
  }, []);

  function toggle(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelected(next);
  }

  const selectedPfas = pfas.filter((p) => selected.has(p.id));
  const total = selectedPfas.reduce((s, p) => s + (Number(p.total) - Number(p.paid_amount || 0)), 0);

  function downloadSepa() {
    if (selectedPfas.length === 0) { toast('Označ aspoň jednu PFA', 'error'); return; }
    const debtor = bankAccounts.find((b) => b.id === debtorBankId);
    if (!debtor) { toast('Vyber svoj bankový účet', 'error'); return; }
    const missingIban = selectedPfas.filter((p) => !p.supplier_iban);
    if (missingIban.length > 0) {
      toast(`${missingIban.length} PFA nemá IBAN dodávateľa — preskočené`, 'error');
    }
    const payable = selectedPfas.filter((p) => p.supplier_iban);
    if (payable.length === 0) return;

    const xml = generateSepaCreditTransfer(
      { name: companyName || 'Zolo', iban: debtor.iban, bic: debtor.bic },
      payable.map((p) => ({
        amount: Number(p.total) - Number(p.paid_amount || 0),
        currency: 'EUR',
        beneficiaryName: p.supplier_name || 'Dodávateľ',
        beneficiaryIban: p.supplier_iban!,
        beneficiaryBic: p.supplier_bic,
        variableSymbol: p.variable_symbol,
        message: p.number,
      })),
    );
    const blob = new Blob([xml], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `prevodny-prikaz-${new Date().toISOString().slice(0, 10)}.xml`;
    a.click();
    URL.revokeObjectURL(url);
    toast(`SEPA XML stiahnuté · ${payable.length} platieb`, 'success');
  }

  return (
    <div className="p-4 sm:p-8 max-w-6xl">
      <PageHeader back={{ href: "/dashboard/bank" }} title="Prevodný príkaz" subtitle="Označ neuhradené PFA a vygeneruj SEPA XML pre internetbanking" />

      <Card className="mb-4">
        <div className="p-5">
          <Field label="Tvoj bankový účet (debtor)">
            <Select value={debtorBankId} onChange={(e) => setDebtorBankId(e.target.value)}>
              {bankAccounts.map((b) => <option key={b.id} value={b.id}>{b.bank_name || 'Banka'} · {b.iban}</option>)}
            </Select>
          </Field>
        </div>
      </Card>

      <Card>
        <div className="px-5 py-3 border-b border-zinc-100 flex items-center justify-between">
          <div className="text-sm font-semibold">{pfas.length} neuhradených PFA · {selected.size} označených · spolu {fmtEur(total)}</div>
          <Button variant="primary" onClick={downloadSepa} disabled={selected.size === 0}>
            <FileDown size={14} /> Stiahnuť SEPA XML
          </Button>
        </div>
        <div className="overflow-auto max-h-[60vh]">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 sticky top-0">
              <tr className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">
                <th className="text-center px-3 py-3 w-8"></th>
                <th className="text-left px-3 py-3">Číslo PFA</th>
                <th className="text-left px-3 py-3">Dodávateľ</th>
                <th className="text-left px-3 py-3">IBAN</th>
                <th className="text-left px-3 py-3">VS</th>
                <th className="text-center px-3 py-3">Splatnosť</th>
                <th className="text-right px-3 py-3">Suma</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {pfas.map((p) => {
                const remaining = Number(p.total) - Number(p.paid_amount || 0);
                return (
                  <tr key={p.id} className={selected.has(p.id) ? 'bg-zinc-50/50' : ''}>
                    <td className="text-center px-3 py-2"><input type="checkbox" checked={selected.has(p.id)} onChange={() => toggle(p.id)} /></td>
                    <td className="px-3 py-2 font-mono">{p.number}</td>
                    <td className="px-3 py-2">{p.supplier_name || '—'}</td>
                    <td className={`px-3 py-2 font-mono text-xs ${!p.supplier_iban ? 'text-red-600' : ''}`}>{p.supplier_iban || 'chýba IBAN'}</td>
                    <td className="px-3 py-2 font-mono text-xs">{p.variable_symbol || '—'}</td>
                    <td className="px-3 py-2 text-center text-xs">{fmtDate(p.due_date)}</td>
                    <td className="px-3 py-2 text-right font-mono">{fmtEur(remaining)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
