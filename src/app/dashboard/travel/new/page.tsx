'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Button, Input, Field, Card, PageHeader, Select, Textarea } from '@/components/ui';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/components/Toast';

export default function NewTravelPage() {
  const router = useRouter();
  const toast = useToast();
  const [companies, setCompanies] = useState<{ id: string; name: string }[]>([]);
  const [employees, setEmployees] = useState<{ id: string; name: string; surname: string }[]>([]);
  const [form, setForm] = useState({
    company_id: '', employee_id: '', type: 'domestic', purpose: '',
    destination: '', country: 'Slovensko', departure_date: '', departure_time: '08:00',
    arrival_date: '', arrival_time: '17:00', transport_type: 'car', vehicle_plate: '',
    vehicle_consumption: 6.5, distance_km: 0, fuel_price: 1.50, advance_amount: 0, advance_currency: 'EUR', status: 'pending',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const sb = createClient();
      const { data: cs } = await sb.from('companies').select('id, name').is('deleted_at', null).order('name');
      setCompanies(cs || []);
      const fid = cs?.[0]?.id || '';
      setForm((f) => ({ ...f, company_id: localStorage.getItem('zolo_firm') || fid }));
      if (fid) {
        const { data: es } = await sb.from('employees').select('id, name, surname').is('deleted_at', null);
        setEmployees(es || []);
      }
    })();
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form.destination) { toast('Cieľ je povinný', 'error'); return; }
    setSaving(true);
    const sb = createClient();
    const { data: { user } } = await sb.auth.getUser();
    const payload = {
      ...form,
      employee_id: form.employee_id || null,
      departure_date: form.departure_date || null,
      arrival_date: form.arrival_date || null,
      created_by: user?.id,
    };
    const { error } = await sb.from('travel_orders').insert([payload]);
    if (error) { toast(error.message, 'error'); setSaving(false); return; }
    toast('Cestovný príkaz vytvorený', 'success');
    router.push('/dashboard/travel');
    router.refresh();
  }

  return (
    <div className="p-4 sm:p-8 max-w-3xl">
      <PageHeader back={{ href: "/dashboard/travel" }} title="Nový cestovný príkaz" />

      <form onSubmit={save} className="space-y-4">
        <Card>
          <div className="p-5 grid grid-cols-2 gap-4">
            <Field label="Firma"><Select value={form.company_id} onChange={(e) => setForm({ ...form, company_id: e.target.value })}>{companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></Field>
            <Field label="Zamestnanec"><Select value={form.employee_id} onChange={(e) => setForm({ ...form, employee_id: e.target.value })}><option value="">— vyber —</option>{employees.map((e) => <option key={e.id} value={e.id}>{e.name} {e.surname}</option>)}</Select></Field>
            <Field label="Typ cesty"><Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}><option value="domestic">Tuzemská</option><option value="foreign">Zahraničná</option></Select></Field>
            <Field label="Krajina"><Input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} /></Field>
            <Field label="Cieľ *"><Input value={form.destination} onChange={(e) => setForm({ ...form, destination: e.target.value })} required /></Field>
            <Field label="Účel"><Input value={form.purpose} onChange={(e) => setForm({ ...form, purpose: e.target.value })} placeholder="Obchodné stretnutie" /></Field>
            <Field label="Odchod (dátum)"><Input type="date" value={form.departure_date} onChange={(e) => setForm({ ...form, departure_date: e.target.value })} /></Field>
            <Field label="Odchod (čas)"><Input type="time" value={form.departure_time} onChange={(e) => setForm({ ...form, departure_time: e.target.value })} /></Field>
            <Field label="Návrat (dátum)"><Input type="date" value={form.arrival_date} onChange={(e) => setForm({ ...form, arrival_date: e.target.value })} /></Field>
            <Field label="Návrat (čas)"><Input type="time" value={form.arrival_time} onChange={(e) => setForm({ ...form, arrival_time: e.target.value })} /></Field>
            <Field label="Doprava"><Select value={form.transport_type} onChange={(e) => setForm({ ...form, transport_type: e.target.value })}><option value="car">Auto (vlastné)</option><option value="company_car">Firemné auto</option><option value="train">Vlak</option><option value="bus">Autobus</option><option value="plane">Lietadlo</option></Select></Field>
            <Field label="EČV"><Input value={form.vehicle_plate} onChange={(e) => setForm({ ...form, vehicle_plate: e.target.value })} /></Field>
            <Field label="Vzdialenosť (km)"><Input type="number" step="0.1" value={form.distance_km} onChange={(e) => setForm({ ...form, distance_km: +e.target.value || 0 })} /></Field>
            <Field label="Spotreba (l/100km)"><Input type="number" step="0.1" value={form.vehicle_consumption} onChange={(e) => setForm({ ...form, vehicle_consumption: +e.target.value || 0 })} /></Field>
            <Field label="Cena paliva (€/l)"><Input type="number" step="0.01" value={form.fuel_price} onChange={(e) => setForm({ ...form, fuel_price: +e.target.value || 0 })} /></Field>
            <Field label="Záloha (€)"><Input type="number" step="0.01" value={form.advance_amount} onChange={(e) => setForm({ ...form, advance_amount: +e.target.value || 0 })} /></Field>
          </div>
        </Card>
        <div className="flex gap-2">
          <Button type="submit" variant="primary" disabled={saving}>{saving ? 'Ukladám…' : 'Vytvoriť príkaz'}</Button>
          <Link href="/dashboard/travel"><Button type="button" variant="ghost">Zrušiť</Button></Link>
        </div>
      </form>
    </div>
  );
}
