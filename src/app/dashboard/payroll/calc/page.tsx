'use client';

import { useState } from 'react';
import { PageHeader, Card, CardHeader, Input, Field } from '@/components/ui';
import { calcPayroll } from '@/lib/payroll';
import { fmtEur } from '@/lib/utils';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function PayrollCalcPage() {
  const [gross, setGross] = useState(1500);
  const [children, setChildren] = useState(0);
  const calc = calcPayroll(gross, { childCount: children });

  return (
    <div className="p-4 sm:p-8 max-w-5xl">
      <PageHeader back={{ href: "/dashboard/payroll" }} title="Mzdová kalkulačka 2026" subtitle="Slovenské sadzby SP/ZP/daň podľa zákona č. 595/2003 a 461/2003" />

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader title="Vstupy" />
          <div className="p-5 space-y-4">
            <Field label="Hrubá mzda (€/mes)">
              <Input type="number" step="10" value={gross} onChange={(e) => setGross(+e.target.value || 0)} />
            </Field>
            <Field label="Počet detí (daňový bonus)">
              <Input type="number" min={0} max={10} value={children} onChange={(e) => setChildren(+e.target.value || 0)} />
            </Field>
          </div>
        </Card>

        <Card>
          <CardHeader title="Zamestnanec" />
          <div className="p-5 space-y-2 text-sm">
            <Row label="Hrubá mzda" value={fmtEur(calc.gross)} bold />
            <Row label="Soc. poistenie (9.4%)" value={`-${fmtEur(calc.emp_sp)}`} />
            <Row label="Zdrav. poistenie (4%)" value={`-${fmtEur(calc.emp_zp)}`} />
            <Row label="Základ dane" value={fmtEur(calc.taxBase)} />
            <Row label="Daň (19/25%)" value={`-${fmtEur(calc.tax)}`} />
            {calc.childBonus > 0 && <Row label="Daňový bonus" value={`+${fmtEur(calc.childBonus)}`} variant="green" />}
            <div className="border-t border-zinc-200 pt-3 mt-3" />
            <Row label="Čistá mzda" value={fmtEur(calc.net)} bold variant="green" />
          </div>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader title="Zamestnávateľ — celkový náklad" />
        <div className="p-5 grid grid-cols-3 gap-4 text-sm">
          <Row label="Hrubá mzda" value={fmtEur(calc.gross)} />
          <Row label="SP zamestnávateľ (25.2%)" value={fmtEur(calc.empr_sp)} />
          <Row label="ZP zamestnávateľ (11%)" value={fmtEur(calc.empr_zp)} />
        </div>
        <div className="border-t border-zinc-100 px-5 py-4 bg-zinc-50 flex justify-between">
          <div className="text-sm text-zinc-500">Celkový mesačný náklad firmy</div>
          <div className="font-mono font-bold text-lg text-zinc-900">{fmtEur(calc.totalCost)}</div>
        </div>
      </Card>

      <div className="mt-4 text-xs text-zinc-500">
        ⚠ Výpočet pre rok 2026. Pre presné odvody konzultuj s účtovníčkou — môžu existovať výnimky (maximálny VZ, znížené sadzby, ZŤP, atď.).
      </div>
    </div>
  );
}

function Row({ label, value, bold, variant }: { label: string; value: string; bold?: boolean; variant?: 'green' }) {
  const color = variant === 'green' ? 'text-emerald-600' : 'text-zinc-900';
  return (
    <div className="flex items-center justify-between">
      <span className="text-zinc-600">{label}</span>
      <span className={`font-mono ${bold ? 'font-bold' : ''} ${color}`}>{value}</span>
    </div>
  );
}
