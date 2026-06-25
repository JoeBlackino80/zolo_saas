'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Button, Input, Field, Card, Select } from '@/components/ui';
import { ArrowRight, Sparkles, Building2, Search } from 'lucide-react';
import { useToast } from '@/components/Toast';

const STEPS = ['Vitaj', 'Tvoja firma', 'Doplníme údaje', 'Hotovo'];

export default function OnboardingClient({ userEmail }: { userEmail: string }) {
  const router = useRouter();
  const toast = useToast();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    name: '', ico: '', dic: '', ic_dph: '', street: '', city: '', zip: '',
    country: 'Slovensko', is_vat_payer: false, business_type: 'sro', iban: '',
  });
  const [loading, setLoading] = useState(false);

  async function lookupIco() {
    if (!/^\d{8}$/.test(form.ico)) { toast('IČO musí mať 8 číslic', 'error'); return; }
    setLoading(true);
    try {
      const r = await fetch('https://orsr-lookup.joeblackino.workers.dev?ico=' + form.ico);
      if (!r.ok) throw new Error('Worker HTTP ' + r.status);
      const payload = await r.json();
      // Worker returns { success, source, data: {...} } — extract .data
      const data = payload.data || payload;
      if (!data.name) {
        toast('IČO ' + form.ico + ' sa nenašlo v ORSR/Finstat. Vyplň údaje ručne.', 'error');
        setStep(2);
        return;
      }
      // Try to parse address into street/city/zip ("Karpatske namestie 10A, 831 06 Bratislava - mestska cast Raca")
      let street = '', city = '', zip = '';
      if (data.address) {
        const parts = String(data.address).split(',').map((s: string) => s.trim());
        if (parts.length >= 2) {
          street = parts[0];
          const zipMatch = parts[1].match(/(\d{3}\s?\d{2})/);
          zip = zipMatch ? zipMatch[1].replace(/\s/g, ' ') : '';
          city = parts[1].replace(/\d{3}\s?\d{2}/, '').replace(/-\s.*/, '').trim();
        } else {
          street = String(data.address);
        }
      }
      setForm({
        ...form,
        name: data.name || form.name,
        dic: data.dic || form.dic,
        ic_dph: data.icDph || form.ic_dph,
        street: street || form.street,
        city: city || form.city,
        zip: zip || form.zip,
        is_vat_payer: !!data.icDph,
      });
      toast('Údaje doplnené: ' + data.name, 'success');
      setStep(2);
    } catch (e) { toast('Lookup zlyhal: ' + (e as Error).message, 'error'); }
    finally { setLoading(false); }
  }

  async function create() {
    if (!form.name) { toast('Názov povinný', 'error'); return; }
    setLoading(true);
    const sb = createClient();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) { setLoading(false); return; }
    const { data, error } = await sb.from('companies').insert([{ ...form, created_by: user.id }]).select().single();
    if (error) { toast(error.message, 'error'); setLoading(false); return; }
    // admin role is granted automatically by auto_grant_company_admin_trigger
    if (data?.id && typeof window !== 'undefined') localStorage.setItem('zolo_firm', data.id);
    setStep(3);
    setTimeout(() => router.push('/dashboard'), 1500);
  }

  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-6">
      <div className="w-full max-w-xl">
        {/* Progress */}
        <div className="flex items-center justify-between mb-8 px-2">
          {STEPS.map((label, i) => (
            <div key={i} className="flex flex-col items-center flex-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${i <= step ? 'bg-zinc-900 text-white' : 'bg-zinc-200 text-zinc-500'}`}>
                {i + 1}
              </div>
              <div className={`text-[10px] uppercase tracking-wider mt-1.5 font-semibold ${i <= step ? 'text-zinc-900' : 'text-zinc-400'}`}>{label}</div>
              {i < STEPS.length - 1 && <div className={`absolute h-0.5 top-4 ${i < step ? 'bg-zinc-900' : 'bg-zinc-200'}`} style={{ width: '20%' }} />}
            </div>
          ))}
        </div>

        <Card>
          <div className="p-8">
            {step === 0 && (
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-zinc-900 text-white flex items-center justify-center">
                  <Sparkles size={28} strokeWidth={1.8} />
                </div>
                <h1 className="text-2xl font-bold text-slate-900">Vitaj v ZOLO!</h1>
                <p className="text-slate-600 mt-2">Si prihlásený ako <strong>{userEmail}</strong></p>
                <p className="text-slate-500 mt-4 leading-relaxed">Za 2 minúty vytvoríme tvoju prvú firmu. Stačí IČO — ostatné údaje sa auto-doplnia z ORSR (slovenský obchodný register).</p>
                <Button variant="primary" className="mt-6" onClick={() => setStep(1)}>Začať <ArrowRight size={14} /></Button>
              </div>
            )}

            {step === 1 && (
              <div>
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center"><Building2 size={20} /></div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">Tvoja firma</h2>
                    <p className="text-sm text-slate-500">Zadaj IČO firmy</p>
                  </div>
                </div>
                <Field label="IČO (8 číslic)">
                  <div className="flex gap-2">
                    <Input value={form.ico} onChange={(e) => setForm({ ...form, ico: e.target.value.trim() })} placeholder="napr. 47518309" maxLength={8} />
                    <Button variant="primary" onClick={lookupIco} disabled={loading}>
                      <Search size={14} /> {loading ? 'Hľadám…' : 'Hľadať'}
                    </Button>
                  </div>
                </Field>
                <div className="mt-4 text-center text-xs text-slate-500">
                  Nemáš ešte firmu? <button onClick={() => setStep(2)} className="text-blue-600 hover:underline">Pokračovať bez ORSR</button>
                </div>
              </div>
            )}

            {step === 2 && (
              <div>
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center"><Building2 size={20} /></div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">Detaily firmy</h2>
                    <p className="text-sm text-slate-500">Skontroluj alebo dopln údaje</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Názov *"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></Field>
                  <Field label="Typ"><Select value={form.business_type} onChange={(e) => setForm({ ...form, business_type: e.target.value })}><option value="sro">s.r.o.</option><option value="szco">SZČO</option><option value="as">a.s.</option></Select></Field>
                  <Field label="DIČ"><Input value={form.dic} onChange={(e) => setForm({ ...form, dic: e.target.value })} /></Field>
                  <Field label="IČ DPH"><Input value={form.ic_dph} onChange={(e) => setForm({ ...form, ic_dph: e.target.value })} placeholder="SK..." /></Field>
                  <Field label="Ulica"><Input value={form.street} onChange={(e) => setForm({ ...form, street: e.target.value })} /></Field>
                  <Field label="Mesto"><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></Field>
                  <Field label="PSČ"><Input value={form.zip} onChange={(e) => setForm({ ...form, zip: e.target.value })} /></Field>
                  <Field label="IBAN"><Input value={form.iban} onChange={(e) => setForm({ ...form, iban: e.target.value.toUpperCase() })} /></Field>
                </div>
                <div className="mt-4 flex items-center gap-3">
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={form.is_vat_payer} onChange={(e) => setForm({ ...form, is_vat_payer: e.target.checked })} />
                    Som platca DPH
                  </label>
                </div>
                <div className="mt-6 flex gap-2">
                  <Button variant="ghost" onClick={() => setStep(1)}>Späť</Button>
                  <Button variant="primary" onClick={create} disabled={loading}>{loading ? 'Vytváram…' : 'Vytvoriť firmu'} <ArrowRight size={14} /></Button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                  <span className="text-3xl">✓</span>
                </div>
                <h1 className="text-2xl font-bold text-slate-900">Hotovo!</h1>
                <p className="text-slate-600 mt-2">Firma <strong>{form.name}</strong> bola vytvorená.</p>
                <p className="text-slate-500 mt-4">Presmerujem ťa na dashboard…</p>
              </div>
            )}
          </div>
        </Card>

        <div className="text-center mt-6 text-xs text-slate-500">
          Môžeš preskočiť: <a href="/dashboard" className="text-blue-600 hover:underline">Pokračovať bez vytvorenia firmy</a>
        </div>
      </div>
    </div>
  );
}
