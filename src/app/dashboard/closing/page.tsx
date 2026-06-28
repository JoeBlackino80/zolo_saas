import { createClient } from '@/lib/supabase/server';
import { PageHeader, Card, CardHeader, Badge } from '@/components/ui';
import { Check, AlertCircle } from 'lucide-react';
import YearEndButton from './year-end-button';

const CHECKLIST = [
  { key: 'inventura', label: 'Inventarizácia majetku a záväzkov', desc: 'Fyzická + dokladová inventúra k 31.12.' },
  { key: 'odpisy', label: 'Účtovné a daňové odpisy', desc: 'Zaúčtovať odpisy DHM/DNM za rok' },
  { key: 'casove_rozlisenie', label: 'Časové rozlíšenie', desc: 'Nákladov a výnosov budúcich období' },
  { key: 'opravne_polozky', label: 'Opravné položky a rezervy', desc: 'K pohľadávkam, zásobám, na záväzky' },
  { key: 'banka_pokladnica', label: 'Banka a pokladnica', desc: 'Kontrola stavu k 31.12., kurzové rozdiely' },
  { key: 'mzdy', label: 'Mzdy a odvody', desc: 'Roč. zúčtovanie zdrav., daň z miezd' },
  { key: 'dzp_vypocet', label: 'DZP — výpočet a podanie', desc: 'Do 31.3. (alebo 30.6. s odkladom)' },
  { key: 'zavierka', label: 'Účtovná závierka', desc: 'Súvaha, výsledovka, poznámky' },
  { key: 'ruz', label: 'Podanie do RÚZ', desc: 'Register účtovných závierok (Štatistický úrad)' },
  { key: 'archivacia', label: 'Archivácia dokladov', desc: 'Minimálne 10 rokov (§ 35 ZoÚ)' },
];

export default async function ClosingPage() {
  const sb = await createClient();
  const { data: ops } = await sb.from('closing_operations').select('id, operation_type, status').limit(100);
  type Op = { id: string; operation_type: string; status: string };
  const opMap: Record<string, Op | undefined> = {};
  for (const o of (ops || []) as Op[]) opMap[o.operation_type] = o;

  const done = Object.values(opMap).filter((o) => o?.status === 'completed').length;
  const pct = CHECKLIST.length > 0 ? Math.round((done / CHECKLIST.length) * 100) : 0;

  return (
    <div className="p-4 sm:p-8 max-w-5xl">
      <PageHeader title="Závierka & podanie" subtitle="Krok za krokom — koncoročná uzávierka pre účtovnú jednotku" />

      <Card className="mb-4">
        <div className="p-5">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-semibold text-slate-900">Progres uzávierky</div>
            <div className="text-sm font-mono text-slate-600">{done} / {CHECKLIST.length}</div>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-zinc-900 transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader title="Checklist krokov" subtitle="V poradí v akom sa zvyčajne robia" />
        <div className="divide-y divide-slate-100">
          {CHECKLIST.map((item, idx) => {
            const op = opMap[item.key];
            const isDone = op?.status === 'completed';
            return (
              <div key={item.key} className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${isDone ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400 border border-slate-200'}`}>
                  {isDone ? <Check size={14} /> : <span className="text-xs font-semibold">{idx + 1}</span>}
                </div>
                <div className="flex-1">
                  <div className="text-sm font-semibold text-slate-900">{item.label}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{item.desc}</div>
                </div>
                {isDone ? (
                  <Badge variant="green">Hotovo</Badge>
                ) : op?.status === 'in_progress' ? (
                  <Badge variant="amber">Prebieha</Badge>
                ) : (
                  <Badge variant="gray">Čaká</Badge>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      <Card className="mt-4 bg-amber-50 border-amber-200">
        <div className="p-4 flex items-start gap-3">
          <AlertCircle size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-amber-900">
            <strong>Pripomienka termínov:</strong> DZP a účtovná závierka — do <strong>31.3.</strong> nasledujúceho roka. Predĺženie do 30.6. cez tlačivo na FS SR.
            Archivačná povinnosť dokladov — <strong>10 rokov</strong> (§ 35 zákona o účtovníctve).
          </div>
        </div>
      </Card>

      <YearEndButton />
    </div>
  );
}
