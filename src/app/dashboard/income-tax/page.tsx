'use client';

import { useState } from 'react';
import { PageHeader, Card, CardHeader, Input, Field, Select } from '@/components/ui';
import { calcDzp } from '@/lib/dzp';
import { fmtEur } from '@/lib/utils';

export default function IncomeTaxPage() {
  const [type, setType] = useState<'FO-A' | 'FO-B' | 'PO'>('PO');
  const [revenue, setRevenue] = useState(50000);
  const [expenses, setExpenses] = useState(30000);
  const [prepaid, setPrepaid] = useState(0);
  const [children, setChildren] = useState(0);

  const res = calcDzp({ type, revenue, expenses, prepaid, childCount: children });

  return (
    <div className="p-8 max-w-5xl">
      <PageHeader title="Daň z príjmov" subtitle="DZP FO (typ A/B) alebo DZP PO — výpočet 2026" />

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader title="Vstupy" />
          <div className="p-5 space-y-4">
            <Field label="Typ priznania">
              <Select value={type} onChange={(e) => setType(e.target.value as 'FO-A' | 'FO-B' | 'PO')}>
                <option value="PO">DZP PO — Právnická osoba</option>
                <option value="FO-B">DZP FO typ B — Podnikanie / iné</option>
                <option value="FO-A">DZP FO typ A — Iba zamestnanecké</option>
              </Select>
            </Field>
            <Field label="Príjmy / Výnosy (€/rok)">
              <Input type="number" step="100" value={revenue} onChange={(e) => setRevenue(+e.target.value || 0)} />
            </Field>
            <Field label="Výdavky / Náklady (€/rok)">
              <Input type="number" step="100" value={expenses} onChange={(e) => setExpenses(+e.target.value || 0)} />
            </Field>
            <Field label="Zaplatené preddavky (€)">
              <Input type="number" step="10" value={prepaid} onChange={(e) => setPrepaid(+e.target.value || 0)} />
            </Field>
            {type !== 'PO' && (
              <Field label="Počet vyživovaných detí">
                <Input type="number" min={0} max={10} value={children} onChange={(e) => setChildren(+e.target.value || 0)} />
              </Field>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader title="Výpočet" />
          <div className="p-5 space-y-3 text-sm">
            <Row label="Príjmy" value={fmtEur(res.revenue)} />
            <Row label="Výdavky" value={`-${fmtEur(res.expenses)}`} />
            <Row label="Zisk / Strata" value={fmtEur(res.profit)} bold variant={res.profit >= 0 ? undefined : 'red'} />
            <div className="border-t border-slate-200 pt-3" />
            <Row label="Základ dane" value={fmtEur(res.taxBase)} />
            <Row label={`Daň ${type === 'PO' ? (res.revenue <= 60000 ? '15%' : '21%') : '19/25%'}`} value={`-${fmtEur(res.tax)}`} />
            {type !== 'PO' && children > 0 && (
              <Row label={`Daňový bonus (${children}×600€)`} value={`+${fmtEur(children * 600)}`} variant="green" />
            )}
            <Row label="Daň po bonusoch" value={fmtEur(res.taxAfterBonus)} bold />
            {res.prepaid > 0 && <Row label="Zaplatené preddavky" value={`-${fmtEur(res.prepaid)}`} />}
            <div className="border-t border-slate-200 pt-3" />
            <Row
              label={res.toPay >= 0 ? 'K úhrade do 31.3.' : 'Preplatok na vrátenie'}
              value={fmtEur(Math.abs(res.toPay))}
              bold
              variant={res.toPay >= 0 ? 'red' : 'green'}
            />
            <Row label="Efektívna sadzba" value={`${res.effectiveRate}%`} />
          </div>
        </Card>
      </div>

      <div className="mt-4 text-xs text-slate-500">
        ⚠ Výpočet je orientačný. Zákon 595/2003 Z.z. s úpravami pre rok 2026. PO s obratom do 60 000 € platí 15%, ostatné 21%.
        FO: 19% do {fmtEur(47537.5)} základu, nad to 25%. Nezdaniteľná suma FO 2026: {fmtEur(5753.76)} (mení sa medziročne).
      </div>
    </div>
  );
}

function Row({ label, value, bold, variant }: { label: string; value: string; bold?: boolean; variant?: 'green' | 'red' }) {
  const color = variant === 'green' ? 'text-emerald-600' : variant === 'red' ? 'text-red-600' : 'text-slate-900';
  return (
    <div className="flex items-center justify-between">
      <span className="text-slate-600">{label}</span>
      <span className={`font-mono ${bold ? 'font-bold' : ''} ${color}`}>{value}</span>
    </div>
  );
}
