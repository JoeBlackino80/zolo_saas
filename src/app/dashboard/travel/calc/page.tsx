'use client';

import { useState } from 'react';
import { PageHeader, Card, CardHeader, Input, Field, Select, Button } from '@/components/ui';
import { calcTravel, DIETY_SK_2026, DIETY_FOREIGN_2026, SAZBA_KM_2026 } from '@/lib/travel';
import { fmtEur } from '@/lib/utils';
import { ArrowLeft, Calculator } from 'lucide-react';
import Link from 'next/link';

export default function TravelCalcPage() {
  const [domestic, setDomestic] = useState(true);
  const [country, setCountry] = useState('AT');
  const [hours, setHours] = useState(24);
  const [km, setKm] = useState(100);
  const [fuelPrice, setFuelPrice] = useState(1.55);
  const [consumption, setConsumption] = useState(6.5);
  const [breakfast, setBreakfast] = useState(0);
  const [lunch, setLunch] = useState(0);
  const [dinner, setDinner] = useState(0);
  const [advance, setAdvance] = useState(0);

  const r = calcTravel({
    domestic, country, hoursTotal: hours, distanceKm: km, fuelPrice, vehicleConsumption: consumption,
    meals: { breakfast, lunch, dinner }, advanceAmount: advance,
  });

  return (
    <div className="p-4 sm:p-8 max-w-5xl">
      <PageHeader back={{ href: "/dashboard/travel" }} title="Kalkulačka cestovných náhrad" subtitle="SK 2026 sadzby — diéty + amortizácia auta + spotreba PHM" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader title="Vstupy" />
          <div className="p-5 space-y-4">
            <Field label="Typ cesty">
              <Select value={domestic ? 'dom' : 'for'} onChange={(e) => setDomestic(e.target.value === 'dom')}>
                <option value="dom">Tuzemská (SR)</option>
                <option value="for">Zahraničná</option>
              </Select>
            </Field>
            {!domestic && (
              <Field label="Krajina">
                <Select value={country} onChange={(e) => setCountry(e.target.value)}>
                  {Object.keys(DIETY_FOREIGN_2026).map((c) => <option key={c} value={c}>{c} — {fmtEur(DIETY_FOREIGN_2026[c])}/deň</option>)}
                </Select>
              </Field>
            )}
            <Field label="Trvanie cesty (hodiny)">
              <Input type="number" min={0} step={0.5} value={hours} onChange={(e) => setHours(+e.target.value)} />
            </Field>
            <Field label="Najazdené km vlastným autom">
              <Input type="number" min={0} value={km} onChange={(e) => setKm(+e.target.value)} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Spotreba (L/100km)">
                <Input type="number" step={0.1} value={consumption} onChange={(e) => setConsumption(+e.target.value)} />
              </Field>
              <Field label="Cena PHM (€/L)">
                <Input type="number" step={0.01} value={fuelPrice} onChange={(e) => setFuelPrice(+e.target.value)} />
              </Field>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Raňajky (počet)">
                <Input type="number" min={0} value={breakfast} onChange={(e) => setBreakfast(+e.target.value)} />
              </Field>
              <Field label="Obed (počet)">
                <Input type="number" min={0} value={lunch} onChange={(e) => setLunch(+e.target.value)} />
              </Field>
              <Field label="Večera (počet)">
                <Input type="number" min={0} value={dinner} onChange={(e) => setDinner(+e.target.value)} />
              </Field>
            </div>
            <Field label="Vyplatený preddavok (€)">
              <Input type="number" step={1} value={advance} onChange={(e) => setAdvance(+e.target.value)} />
            </Field>
          </div>
        </Card>

        <Card>
          <CardHeader title={<><Calculator className="inline mr-2" size={14} /> Výpočet náhrad</>} />
          <div className="p-5 space-y-3 text-sm">
            <div className="border-l-2 border-zinc-200 pl-3">
              <div className="text-xs uppercase text-zinc-500 font-semibold">Stravné (diéty)</div>
              <div className="text-2xl font-bold mt-1">{fmtEur(r.diety)}</div>
              <div className="text-xs text-zinc-500 mt-1">{r.diety_breakdown}</div>
            </div>
            <div className="border-l-2 border-zinc-200 pl-3">
              <div className="text-xs uppercase text-zinc-500 font-semibold">Amortizácia auta</div>
              <div className="text-2xl font-bold mt-1">{fmtEur(r.km_compensation)}</div>
              <div className="text-xs text-zinc-500 mt-1">{km} km × {SAZBA_KM_2026.toFixed(3)} €</div>
            </div>
            <div className="border-l-2 border-zinc-200 pl-3">
              <div className="text-xs uppercase text-zinc-500 font-semibold">Spotreba PHM</div>
              <div className="text-2xl font-bold mt-1">{fmtEur(r.fuel_compensation)}</div>
              <div className="text-xs text-zinc-500 mt-1">{km} km × ({consumption}/100) L × {fuelPrice} €</div>
            </div>
            <div className="border-t border-zinc-200 pt-3" />
            <div className="flex justify-between text-base">
              <span className="text-zinc-600">Spolu náhrady</span>
              <span className="font-mono font-bold">{fmtEur(r.total_expenses)}</span>
            </div>
            {advance > 0 && (
              <div className="flex justify-between">
                <span className="text-zinc-600">Preddavok</span>
                <span className="font-mono text-zinc-700">-{fmtEur(advance)}</span>
              </div>
            )}
            <div className="border-t-2 border-zinc-500 pt-3 flex justify-between text-lg">
              <span className="font-semibold">{r.to_pay >= 0 ? 'K vyplateniu zamest.' : 'Vrátiť firme'}</span>
              <span className={`font-mono font-bold ${r.to_pay >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{fmtEur(Math.abs(r.to_pay))}</span>
            </div>
          </div>
        </Card>
      </div>

      <div className="mt-4 text-xs text-zinc-500">
        Tuzemsko 2026: 5–12h {fmtEur(DIETY_SK_2026.domestic.band_5_12h)} · 12–18h {fmtEur(DIETY_SK_2026.domestic.band_12_18h)} · 18h+ {fmtEur(DIETY_SK_2026.domestic.band_18plus)}.
        Zahraničie — vreckové 40% z diéty. Stravovanie kráti diétu o 25/40/35% (R/O/V).
      </div>
    </div>
  );
}
