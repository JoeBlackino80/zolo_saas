import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { PageHeader, Card, CardHeader, Badge } from '@/components/ui';
import { fmtEur, fmtDate } from '@/lib/utils';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import SettleForm from './settle-form';

export const dynamic = 'force-dynamic';

export default async function TravelOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sb = await createClient();
  const { data: order } = await sb
    .from('travel_orders')
    .select('*, employees(name, surname)')
    .eq('id', id)
    .is('deleted_at', null)
    .single();
  if (!order) notFound();

  const { data: expenses } = await sb
    .from('travel_expenses')
    .select('id, expense_type, amount, currency, description')
    .eq('travel_order_id', id);

  const { data: settlement } = await sb
    .from('travel_settlements')
    .select('id, settlement_date, total_expenses, meal_allowance, vehicle_compensation, accommodation, other_expenses, advance_amount, difference, journal_entry_id')
    .eq('travel_order_id', id)
    .maybeSingle();

  const emp = Array.isArray(order.employees) ? order.employees[0] : order.employees;

  return (
    <div className="p-4 sm:p-8 max-w-4xl">
      <Link href="/dashboard/travel" className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-900 mb-3">
        <ArrowLeft size={14} /> Späť
      </Link>
      <PageHeader
        title={`Cestovný príkaz · ${order.destination || 'bez cieľa'}`}
        subtitle={`${emp ? emp.name + ' ' + emp.surname : 'bez zamestnanca'} · ${fmtDate(order.departure_date)} – ${fmtDate(order.arrival_date)}`}
      />

      <Card className="mb-4">
        <CardHeader title="Detail" />
        <div className="p-5 grid sm:grid-cols-2 gap-3 text-sm">
          <Detail label="Účel" value={order.purpose || '—'} />
          <Detail label="Krajina" value={order.country || '—'} />
          <Detail label="Doprava" value={order.transport_type || '—'} />
          <Detail label="Preddavok" value={fmtEur(Number(order.advance_amount || 0))} />
          <Detail label="Celková suma" value={fmtEur(Number(order.total_amount || 0))} />
          <Detail label="Stav" value={<Badge variant={order.status === 'approved' ? 'green' : 'amber'}>{order.status || 'pending'}</Badge>} />
        </div>
      </Card>

      {expenses && expenses.length > 0 && (
        <Card className="mb-4">
          <CardHeader title={`Výdavky (${expenses.length})`} />
          <div className="divide-y divide-zinc-100">
            {expenses.map((e) => (
              <div key={e.id} className="px-5 py-3 flex items-center justify-between text-sm">
                <div>
                  <div className="font-medium">{e.expense_type}</div>
                  {e.description && <div className="text-xs text-zinc-500 mt-0.5">{e.description}</div>}
                </div>
                <div className="font-mono">{fmtEur(Number(e.amount))} {e.currency}</div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {settlement ? (
        <Card>
          <CardHeader title="Vyúčtovanie" subtitle={settlement.journal_entry_id ? 'Zaúčtované ✓' : 'Bez denníkového zápisu'} />
          <div className="p-5 space-y-2 text-sm">
            <Row label="Stravné" value={fmtEur(Number(settlement.meal_allowance || 0))} />
            <Row label="Vozidlo" value={fmtEur(Number(settlement.vehicle_compensation || 0))} />
            <Row label="Ubytovanie" value={fmtEur(Number(settlement.accommodation || 0))} />
            <Row label="Iné" value={fmtEur(Number(settlement.other_expenses || 0))} />
            <Row label="Preddavok" value={`− ${fmtEur(Number(settlement.advance_amount || 0))}`} />
            <div className="pt-2 mt-2 border-t border-zinc-100">
              <Row label="Doplatok / Vrátenie" value={fmtEur(Number(settlement.difference || 0))} bold />
            </div>
          </div>
        </Card>
      ) : (
        <SettleForm orderId={id} companyId={order.company_id} advance={Number(order.advance_amount || 0)} />
      )}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wider text-zinc-500 font-semibold">{label}</div>
      <div className="mt-0.5 text-zinc-900">{value}</div>
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: React.ReactNode; bold?: boolean }) {
  return (
    <div className={`flex justify-between ${bold ? 'font-bold text-zinc-900' : 'text-zinc-700'}`}>
      <span>{label}</span>
      <span className="font-mono">{value}</span>
    </div>
  );
}
