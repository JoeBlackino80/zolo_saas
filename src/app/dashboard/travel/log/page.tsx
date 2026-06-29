import { createClient } from '@/lib/supabase/server';
import { PageHeader, Card, EmptyState } from '@/components/ui';
import { Car } from 'lucide-react';
import { fmtDate } from '@/lib/utils';
import Link from 'next/link';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Kniha jázd' };

export default async function VehicleLogPage({ searchParams }: { searchParams: Promise<{ year?: string }> }) {
  const sp = await searchParams;
  const y = sp.year || String(new Date().getFullYear());
  const sb = await createClient();
  const { data: orders } = await sb
    .from('travel_orders')
    .select('id, purpose, destination, departure_date, arrival_date, transport_type, vehicle_plate, distance_km, vehicle_consumption, fuel_price, employees(name, surname)')
    .gte('departure_date', `${y}-01-01`)
    .lte('departure_date', `${y}-12-31`)
    .is('deleted_at', null)
    .not('vehicle_plate', 'is', null)
    .order('departure_date', { ascending: false });

  type R = { id: string; purpose: string | null; destination: string | null; departure_date: string; arrival_date: string | null; transport_type: string | null; vehicle_plate: string | null; distance_km: number | null; vehicle_consumption: number | null; fuel_price: number | null; employees: { name: string; surname: string } | { name: string; surname: string }[] | null };
  const rows = (orders || []) as R[];

  const perVehicle = new Map<string, { km: number; trips: number; fuel: number }>();
  for (const r of rows) {
    const plate = r.vehicle_plate || '?';
    const km = Number(r.distance_km || 0);
    const fuelL = (km / 100) * Number(r.vehicle_consumption || 0);
    const fuelEur = fuelL * Number(r.fuel_price || 0);
    const v = perVehicle.get(plate) || { km: 0, trips: 0, fuel: 0 };
    perVehicle.set(plate, { km: v.km + km, trips: v.trips + 1, fuel: v.fuel + fuelEur });
  }

  return (
    <div className="p-4 sm:p-8 max-w-7xl">
      <PageHeader
        title={`Kniha jázd ${y}`}
        subtitle={`${rows.length} jázd · ${perVehicle.size} vozidiel`}
        actions={
          <div className="flex gap-1">
            {[+y - 1, +y, +y + 1].map((yy) => (
              <Link key={yy} href={`/dashboard/travel/log?year=${yy}`} className={`px-3 py-1.5 text-sm rounded ${yy === +y ? 'bg-zinc-900 text-white' : 'text-zinc-600 hover:bg-zinc-100'}`}>{yy}</Link>
            ))}
          </div>
        }
      />

      {perVehicle.size > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          {Array.from(perVehicle.entries()).map(([plate, v]) => (
            <Card key={plate}>
              <div className="p-4">
                <div className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">{plate}</div>
                <div className="text-2xl font-bold tracking-tight mt-1">{v.km.toFixed(0)} km</div>
                <div className="text-xs text-zinc-500 mt-1">{v.trips} jázd · cca {v.fuel.toFixed(2)} € palivo</div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {!rows.length ? (
        <Card><EmptyState icon={<Car size={24} />} title="Žiadne jazdy" description="Cestovné príkazy s vyplneným EČV a kilometrami sa zobrazia tu." /></Card>
      ) : (
        <Card>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-zinc-50 text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">
                <th className="text-left px-5 py-3">EČV</th>
                <th className="text-left px-3 py-3">Vodič</th>
                <th className="text-left px-3 py-3">Cieľ</th>
                <th className="text-left px-3 py-3">Účel</th>
                <th className="text-center px-3 py-3">Dátum</th>
                <th className="text-right px-3 py-3">km</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {rows.map((o) => {
                const emp = Array.isArray(o.employees) ? o.employees[0] : o.employees;
                return (
                  <tr key={o.id} className="hover:bg-zinc-50">
                    <td className="px-5 py-3 font-mono">{o.vehicle_plate}</td>
                    <td className="px-3 py-3 text-zinc-700">{emp ? `${emp.name} ${emp.surname}` : '—'}</td>
                    <td className="px-3 py-3 text-zinc-700">{o.destination || '—'}</td>
                    <td className="px-3 py-3 text-zinc-600 text-xs truncate max-w-[260px]">{o.purpose || '—'}</td>
                    <td className="px-3 py-3 text-center font-mono text-xs">{fmtDate(o.departure_date)}</td>
                    <td className="px-3 py-3 text-right font-mono">{Number(o.distance_km || 0).toFixed(0)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
