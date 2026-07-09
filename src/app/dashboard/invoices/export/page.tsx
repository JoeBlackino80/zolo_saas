'use client';

import { useState } from 'react';
import { PageHeader, Card, CardHeader, Field, Input, Select, Button } from '@/components/ui';
import { Download, FileText, Archive, Loader2 } from 'lucide-react';
import { useToast } from '@/components/Toast';

export default function ExportInvoicesPage() {
  const toast = useToast();
  const [from, setFrom] = useState(new Date().getFullYear() + '-01-01');
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10));
  const [type, setType] = useState('');
  const [busy, setBusy] = useState<'csv' | 'zip' | null>(null);

  async function downloadCsv() {
    setBusy('csv');
    try {
      const url = new URL('/api/export/invoices', window.location.origin);
      url.searchParams.set('from', from);
      url.searchParams.set('to', to);
      if (type) url.searchParams.set('type', type);
      window.location.href = url.toString();
      setTimeout(() => setBusy(null), 2000);
    } catch (e) {
      toast('Chyba: ' + (e as Error).message, 'error');
      setBusy(null);
    }
  }

  async function downloadZip() {
    setBusy('zip');
    try {
      const url = new URL('/api/export/invoices-zip', window.location.origin);
      url.searchParams.set('from', from);
      url.searchParams.set('to', to);
      if (type) url.searchParams.set('type', type);
      // Fetch first to check for errors
      const r = await fetch(url.toString());
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        toast(j.error || `HTTP ${r.status}`, 'error');
        setBusy(null); return;
      }
      const blob = await r.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = r.headers.get('Content-Disposition')?.match(/filename="([^"]+)"/)?.[1] || 'export.zip';
      a.click();
      URL.revokeObjectURL(a.href);
      const ok = r.headers.get('X-Success-Count');
      const err = r.headers.get('X-Error-Count');
      toast(`ZIP stiahnutý: ${ok} PDF-iek${err && err !== '0' ? `, ${err} zlyhaní` : ''}`, 'success');
    } catch (e) {
      toast('Chyba: ' + (e as Error).message, 'error');
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="p-4 sm:p-8 max-w-3xl">
      <PageHeader
        back={{ href: '/dashboard/invoices' }}
        title="Bulk export faktúr"
        subtitle="Pre daňového agenta na koniec roka — CSV alebo ZIP so všetkými PDF-kami"
      />

      <Card className="mb-4">
        <CardHeader title="Nastavenia exportu" />
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Od dátumu">
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </Field>
            <Field label="Do dátumu">
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </Field>
          </div>
          <Field label="Typ dokladov (voliteľné)">
            <Select value={type} onChange={(e) => setType(e.target.value)}>
              <option value="">Všetky typy</option>
              <option value="invoice">Vystavené faktúry (FA)</option>
              <option value="received_invoice">Prijaté faktúry (PFA)</option>
              <option value="proforma">Zálohové faktúry (ZF)</option>
              <option value="credit_note">Dobropisy (DOB)</option>
              <option value="storno">Storno (STO)</option>
              <option value="delivery_note">Dodacie listy (DL)</option>
              <option value="cash_receipt">Príjmové PPD</option>
              <option value="cash_payout">Výdavkové VPD</option>
              <option value="quote">Cenové ponuky (CP)</option>
            </Select>
          </Field>
        </div>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <div className="p-5">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-zinc-100 flex items-center justify-center">
                <FileText size={18} className="text-zinc-700" />
              </div>
              <div>
                <div className="font-semibold text-zinc-900">CSV export</div>
                <div className="text-[12px] text-zinc-500 mt-0.5">Prehľadová tabuľka pre Excel</div>
              </div>
            </div>
            <p className="text-[13px] text-zinc-600 leading-relaxed mb-4">
              Zoznam všetkých dokladov v jednom CSV — číslo, dátumy, klient, suma, DPH, stav. Ideálne pre analýzu, konsolidáciu, ročné uzávierky.
            </p>
            <Button variant="secondary" onClick={downloadCsv} disabled={busy !== null}>
              {busy === 'csv' ? <><Loader2 size={14} className="animate-spin" /> Sťahujem…</> : <><Download size={14} /> Stiahnuť CSV</>}
            </Button>
          </div>
        </Card>

        <Card>
          <div className="p-5">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-zinc-900 text-white flex items-center justify-center">
                <Archive size={18} />
              </div>
              <div>
                <div className="font-semibold text-zinc-900">ZIP so všetkými PDF</div>
                <div className="text-[12px] text-zinc-500 mt-0.5">Kompletné dokumenty pre daňového agenta</div>
              </div>
            </div>
            <p className="text-[13px] text-zinc-600 leading-relaxed mb-4">
              ZIP archív s PDF-kami všetkých dokladov v organizovaných priečinkoch (01_FA, 02_PFA, 03_ZF…). Rate limit 3/hod. Max 500 dokladov naraz.
            </p>
            <Button variant="primary" onClick={downloadZip} disabled={busy !== null}>
              {busy === 'zip' ? <><Loader2 size={14} className="animate-spin" /> Generujem PDF-ka…</> : <><Download size={14} /> Stiahnuť ZIP</>}
            </Button>
          </div>
        </Card>
      </div>

      <div className="mt-6 p-4 bg-zinc-50 border border-zinc-100 rounded-xl text-[12px] text-zinc-600 leading-relaxed">
        <strong className="text-zinc-900">Tip pre daňového agenta:</strong> Pošli mu ZIP na konci roka, ktorý obsahuje všetky doklady rozdelené do priečinkov. Namiesto klikania jednotlivo. CSV mu daj tiež — potrebuje ho na Súvahu.
      </div>
    </div>
  );
}
