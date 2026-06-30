'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Download, Globe } from 'lucide-react';
import { PageHeader, Card, Field, Input, Select, Button } from '@/components/ui';

export default function IntrastatPage() {
  const [period, setPeriod] = useState(new Date().toISOString().slice(0, 7));
  const [direction, setDirection] = useState<'dispatch' | 'arrival'>('dispatch');

  function download() {
    window.location.href = `/api/intrastat?period=${period}&direction=${direction}`;
  }

  return (
    <div className="p-4 sm:p-8 max-w-3xl">
      <Link href="/dashboard/reports" className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-900 mb-3">
        <ArrowLeft size={14} /> Späť
      </Link>
      <PageHeader title="INTRASTAT" subtitle="Hlásenie pre Štatistický úrad — pohyb tovaru v rámci EÚ" />

      <Card>
        <div className="p-5 space-y-4">
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Obdobie (mesiac)">
              <Input type="month" value={period} onChange={(e) => setPeriod(e.target.value)} />
            </Field>
            <Field label="Smer">
              <Select value={direction} onChange={(e) => setDirection(e.target.value as 'dispatch' | 'arrival')}>
                <option value="dispatch">Odoslanie (predaj do EÚ)</option>
                <option value="arrival">Prijatie (nákup z EÚ)</option>
              </Select>
            </Field>
          </div>
          <div className="bg-zinc-50 rounded-lg p-3 text-xs text-zinc-600 leading-relaxed flex gap-2">
            <Globe size={14} className="shrink-0 mt-0.5" />
            <div>
              Vyexportuje CSV so všetkými FA pre {direction === 'dispatch' ? 'odoslania do' : 'prijatia z'} EÚ krajín za {period}.
              Stĺpce: číslo FA, dátum, partner, IČ DPH, krajina, položka, množstvo, MJ, hodnota.
              <br />
              <strong>Prahy 2026:</strong> Odoslania &gt; 1 000 000 €/rok, Prijatia &gt; 1 000 000 €/rok — firmy nad prah podávajú INTRASTAT mesačne na ŠÚ SR.
            </div>
          </div>
          <div className="flex justify-end">
            <Button variant="primary" onClick={download}><Download size={14} /> Stiahnuť CSV</Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
