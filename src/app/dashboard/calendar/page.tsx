'use client';

import { PageHeader, Card, CardHeader, Button, Badge } from '@/components/ui';
import { Download } from 'lucide-react';

type Deadline = { date: Date; type: string; kind: string; title: string; desc: string; severity: 'high' | 'medium' | 'low' };

function generateDeadlines(year: number): Deadline[] {
  const out: Deadline[] = [];
  for (let m = 1; m <= 12; m++) {
    out.push({
      date: new Date(year, m, 25),
      type: 'dph',
      kind: 'DPH priznanie',
      title: `DPH ${String(m).padStart(2, '0')}/${year}`,
      desc: `Podanie DP DPH + KV + SV za ${String(m).padStart(2, '0')}/${year}`,
      severity: 'high',
    });
    out.push({
      date: new Date(year, m - 1, 8),
      type: 'mzdy',
      kind: 'Mzdy',
      title: `Odvody SP/ZP ${String(m).padStart(2, '0')}/${year}`,
      desc: 'Odvody sociálneho a zdravotného poistenia',
      severity: 'medium',
    });
    out.push({
      date: new Date(year, m - 1, 20),
      type: 'mzdy',
      kind: 'Mzdy',
      title: `Mzdová daň ${String(m).padStart(2, '0')}/${year}`,
      desc: 'Odvod zrazenej dane',
      severity: 'medium',
    });
  }
  out.push({
    date: new Date(year, 2, 31),
    type: 'dzp',
    kind: 'DZP',
    title: `DZP priznanie za ${year - 1}`,
    desc: 'Podanie daňového priznania k dani z príjmov',
    severity: 'high',
  });
  out.push({
    date: new Date(year, 2, 31),
    type: 'zavierka',
    kind: 'Závierka',
    title: `Účtovná závierka ${year - 1}`,
    desc: 'Podanie do registra účtovných závierok',
    severity: 'high',
  });
  return out.sort((a, b) => a.date.getTime() - b.date.getTime());
}

function downloadIcs(deadlines: Deadline[]) {
  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//ZOLO//Tax Calendar//SK',
    'CALSCALE:GREGORIAN',
    ...deadlines.flatMap((d) => {
      const dt = d.date.getFullYear() + String(d.date.getMonth() + 1).padStart(2, '0') + String(d.date.getDate()).padStart(2, '0');
      return [
        'BEGIN:VEVENT',
        `UID:${d.title.replace(/\s/g, '-')}-${dt}@zolo.sk`,
        `DTSTAMP:${dt}T080000Z`,
        `DTSTART;VALUE=DATE:${dt}`,
        `DTEND;VALUE=DATE:${dt}`,
        `SUMMARY:${d.title}`,
        `DESCRIPTION:${d.desc.replace(/,/g, '\\,')}`,
        'BEGIN:VALARM',
        'TRIGGER:-P3D',
        'ACTION:DISPLAY',
        'DESCRIPTION:3 dni pred',
        'END:VALARM',
        'END:VEVENT',
      ];
    }),
    'END:VCALENDAR',
  ].join('\r\n');
  const blob = new Blob([ics], { type: 'text/calendar' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'zolo-danovy-kalendar.ics';
  a.click();
  URL.revokeObjectURL(url);
}

export default function CalendarPage() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const all = [...generateDeadlines(today.getFullYear()), ...generateDeadlines(today.getFullYear() + 1)];
  const future = all.filter((d) => d.date >= today);
  const next30 = future.filter((d) => (d.date.getTime() - today.getTime()) / 86400000 <= 30);

  const sevColor: Record<string, 'red' | 'amber' | 'gray'> = { high: 'red', medium: 'amber', low: 'gray' };

  return (
    <div className="p-8 max-w-6xl">
      <PageHeader
        title="Daňový kalendár"
        subtitle="Nadchádzajúce DPH, DZP, mzdové a iné termíny"
        actions={
          <Button variant="secondary" onClick={() => downloadIcs(all)}>
            <Download size={14} /> Pridať do Apple/Google kalendára
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader title="Najbližších 30 dní" subtitle={`${next30.length} termínov`} />
          {next30.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">Žiadne termíny v najbližšom mesiaci</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {next30.slice(0, 15).map((d, i) => {
                const days = Math.ceil((d.date.getTime() - today.getTime()) / 86400000);
                return (
                  <div key={i} className="flex items-center gap-3 px-4 py-3">
                    <div className="text-center w-12 flex-shrink-0">
                      <div className="text-lg font-bold text-slate-900 leading-none">{d.date.getDate()}</div>
                      <div className="text-[9px] uppercase tracking-wider text-slate-500 mt-1">
                        {['JAN','FEB','MAR','APR','MÁJ','JÚN','JÚL','AUG','SEP','OKT','NOV','DEC'][d.date.getMonth()]}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="font-semibold text-sm text-slate-900">{d.title}</div>
                        <Badge variant={sevColor[d.severity]}>{d.kind}</Badge>
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">{d.desc}</div>
                    </div>
                    <div className={`text-xs font-semibold whitespace-nowrap ${days <= 3 ? 'text-red-600' : days <= 7 ? 'text-amber-600' : 'text-slate-500'}`}>
                      {days === 0 ? 'dnes' : days === 1 ? 'zajtra' : `o ${days} dní`}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <Card>
          <CardHeader title={`Tento rok — ${today.getFullYear()}`} subtitle={`${future.filter((d) => d.date.getFullYear() === today.getFullYear()).length} zostávajúcich`} />
          <div className="divide-y divide-slate-100 max-h-[500px] overflow-auto">
            {future
              .filter((d) => d.date.getFullYear() === today.getFullYear())
              .slice(0, 30)
              .map((d, i) => (
                <div key={i} className="flex items-center justify-between px-4 py-2.5 text-sm">
                  <div className="flex items-center gap-2.5">
                    <div className="font-mono text-xs text-slate-500 w-16">
                      {String(d.date.getDate()).padStart(2, '0')}.{String(d.date.getMonth() + 1).padStart(2, '0')}.
                    </div>
                    <div className="text-slate-900">{d.title}</div>
                  </div>
                  <Badge variant={sevColor[d.severity]}>{d.kind}</Badge>
                </div>
              ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
