'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Button, Input, Field, Select } from '@/components/ui';
import { ArrowRight, Sparkles, Building2, Search, Palette, Check, ArrowLeft } from 'lucide-react';
import { useToast } from '@/components/Toast';

const STEPS = ['Vitaj', 'Firma', 'Detaily', 'Značka', 'Hotovo'];

export default function OnboardingClient({ userEmail }: { userEmail: string }) {
  const router = useRouter();
  const toast = useToast();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    name: '', ico: '', dic: '', ic_dph: '', street: '', city: '', zip: '',
    country: 'Slovensko', is_vat_payer: false, business_type: 'sro', iban: '',
  });
  const [brand, setBrand] = useState({ color: '#18181b' });
  const [inviteEmails, setInviteEmails] = useState('');
  const [loading, setLoading] = useState(false);
  const [createdCompanyId, setCreatedCompanyId] = useState<string | null>(null);

  async function lookupIco() {
    if (!/^\d{8}$/.test(form.ico)) { toast('IČO musí mať 8 číslic', 'error'); return; }
    setLoading(true);
    try {
      const r = await fetch('https://orsr-lookup.joeblackino.workers.dev?ico=' + form.ico);
      if (!r.ok) throw new Error('Worker HTTP ' + r.status);
      const payload = await r.json();
      const data = payload.data || payload;
      if (!data.name) {
        toast('IČO ' + form.ico + ' sa nenašlo. Vyplň údaje ručne.', 'error');
        setStep(2);
        return;
      }
      let street = '', city = '', zip = '';
      if (data.address) {
        const parts = String(data.address).split(',').map((s: string) => s.trim());
        if (parts.length >= 2) {
          street = parts[0];
          const zipMatch = parts[1].match(/(\d{3}\s?\d{2})/);
          zip = zipMatch ? zipMatch[1].replace(/\s/g, ' ') : '';
          city = parts[1].replace(/\d{3}\s?\d{2}/, '').replace(/-\s.*/, '').trim();
        } else { street = String(data.address); }
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
      toast('Údaje z ORSR: ' + data.name, 'success');
      setStep(2);
    } catch (e) { toast('Lookup zlyhal: ' + (e as Error).message, 'error'); }
    finally { setLoading(false); }
  }

  async function create() {
    if (!form.name) { toast('Názov je povinný', 'error'); return; }
    setLoading(true);
    const sb = createClient();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) { setLoading(false); return; }
    const { data, error } = await sb.from('companies').insert([{ ...form, created_by: user.id }]).select().single();
    if (error) { toast(error.message, 'error'); setLoading(false); return; }
    if (data?.id) {
      setCreatedCompanyId(data.id);
      if (typeof window !== 'undefined') localStorage.setItem('zolo_firm', data.id);
    }
    setLoading(false);
    setStep(3);
  }

  async function saveBrandingAndInvites() {
    setLoading(true);
    const sb = createClient();
    if (createdCompanyId && brand.color) {
      try { await sb.from('companies').update({ brand_color: brand.color }).eq('id', createdCompanyId); } catch {}
    }
    const emails = inviteEmails.split(/[,\s]+/).filter((e) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e));
    if (emails.length > 0 && createdCompanyId) {
      const { data: { user } } = await sb.auth.getUser();
      for (const email of emails) {
        try {
          await sb.from('company_invites').insert({
            company_id: createdCompanyId, email, role: 'member', invited_by: user?.id,
          });
        } catch {}
      }
      toast(`${emails.length} pozvánok odoslaných`, 'success');
    }
    setLoading(false);
    setStep(4);
    setTimeout(() => router.push('/dashboard'), 1500);
  }

  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-6">
      <div className="w-full max-w-2xl">
        {/* Progress rail — Apple-pro dot connector */}
        <div className="flex items-center gap-2 mb-10 px-1">
          {STEPS.map((label, i) => (
            <div key={i} className="flex items-center gap-2 flex-1">
              <div className={`flex items-center gap-2 ${i === step ? 'text-zinc-900' : i < step ? 'text-zinc-500' : 'text-zinc-300'}`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold tracking-tight transition-colors ${
                  i === step ? 'bg-zinc-900 text-white' : i < step ? 'bg-zinc-200 text-zinc-500' : 'bg-transparent border border-zinc-200 text-zinc-300'
                }`}>
                  {i < step ? <Check size={11} strokeWidth={3} /> : i + 1}
                </div>
                <span className="text-[11px] font-semibold uppercase tracking-[0.08em] hidden sm:inline">{label}</span>
              </div>
              {i < STEPS.length - 1 && (<div className={`flex-1 h-px ${i < step ? 'bg-zinc-300' : 'bg-zinc-200'}`} />)}
            </div>
          ))}
        </div>

        <div className="bg-white border border-zinc-100 rounded-3xl overflow-hidden">
          <div className="p-8 sm:p-10">
            {step === 0 && (
              <div>
                <div className="w-14 h-14 rounded-2xl bg-zinc-900 text-white flex items-center justify-center mb-6">
                  <Sparkles size={24} strokeWidth={1.8} />
                </div>
                <h1 className="text-[32px] font-bold text-zinc-900 tracking-[-0.02em] leading-tight">Vitaj v ZOLO.</h1>
                <p className="text-[15px] text-zinc-500 mt-2 leading-relaxed">
                  Prihlásený ako <strong className="text-zinc-800">{userEmail}</strong>. Za 60 sekúnd vytvoríme tvoju firmu — stačí IČO, zvyšok doplníme z ORSR.
                </p>
                <div className="mt-8 flex gap-2">
                  <Button variant="primary" onClick={() => setStep(1)}>
                    Začať <ArrowRight size={14} />
                  </Button>
                  <a href="/dashboard" className="inline-flex items-center px-3.5 py-2 rounded-lg text-[13px] text-zinc-500 hover:text-zinc-900 tracking-tight transition-colors">
                    Preskočiť
                  </a>
                </div>
              </div>
            )}

            {step === 1 && (
              <div>
                <div className="w-12 h-12 rounded-2xl bg-zinc-100 text-zinc-900 flex items-center justify-center mb-5">
                  <Building2 size={20} />
                </div>
                <h2 className="text-[26px] font-bold text-zinc-900 tracking-[-0.02em] leading-tight">Aké je IČO tvojej firmy?</h2>
                <p className="text-[14px] text-zinc-500 mt-2 leading-relaxed">Doplníme názov, adresu, DIČ a IČ DPH z Obchodného registra.</p>
                <div className="mt-6">
                  <div className="flex gap-2">
                    <Input value={form.ico} onChange={(e) => setForm({ ...form, ico: e.target.value.trim() })} placeholder="47518309" maxLength={8} className="text-[16px] font-mono tabular-nums" />
                    <Button variant="primary" onClick={lookupIco} disabled={loading || form.ico.length !== 8}>
                      <Search size={14} /> {loading ? 'Hľadám…' : 'Overiť'}
                    </Button>
                  </div>
                  <div className="mt-2 text-[12px] text-zinc-500">8 číslic, žiadne medzery ani pomlčky.</div>
                </div>
                <div className="mt-8 flex items-center justify-between">
                  <button onClick={() => setStep(0)} className="inline-flex items-center gap-1 text-[13px] text-zinc-500 hover:text-zinc-900 transition-colors">
                    <ArrowLeft size={13} /> Späť
                  </button>
                  <button onClick={() => setStep(2)} className="text-[13px] text-zinc-500 hover:text-zinc-900 underline underline-offset-4 tracking-tight">
                    Nemám IČO / SZČO
                  </button>
                </div>
              </div>
            )}

            {step === 2 && (
              <div>
                <div className="w-12 h-12 rounded-2xl bg-zinc-100 text-zinc-900 flex items-center justify-center mb-5">
                  <Building2 size={20} />
                </div>
                <h2 className="text-[26px] font-bold text-zinc-900 tracking-[-0.02em] leading-tight">Skontroluj údaje</h2>
                <p className="text-[14px] text-zinc-500 mt-2 leading-relaxed">Uprav čokoľvek čo nesedí. Neskôr sa dá zmeniť v nastaveniach.</p>
                <div className="grid grid-cols-2 gap-3 mt-6">
                  <div className="col-span-2"><Field label="Názov firmy *"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></Field></div>
                  <Field label="Typ">
                    <Select value={form.business_type} onChange={(e) => setForm({ ...form, business_type: e.target.value })}>
                      <option value="sro">s.r.o.</option>
                      <option value="szco">SZČO</option>
                      <option value="as">a.s.</option>
                    </Select>
                  </Field>
                  <Field label="DIČ"><Input value={form.dic} onChange={(e) => setForm({ ...form, dic: e.target.value })} /></Field>
                  <Field label="IČ DPH"><Input value={form.ic_dph} onChange={(e) => setForm({ ...form, ic_dph: e.target.value })} placeholder="SK…" /></Field>
                  <div className="flex items-end">
                    <label className="flex items-center gap-2 text-[13px] text-zinc-700 tracking-tight">
                      <input type="checkbox" checked={form.is_vat_payer} onChange={(e) => setForm({ ...form, is_vat_payer: e.target.checked })} className="rounded" />
                      Platca DPH
                    </label>
                  </div>
                  <div className="col-span-2"><Field label="Ulica"><Input value={form.street} onChange={(e) => setForm({ ...form, street: e.target.value })} /></Field></div>
                  <Field label="Mesto"><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></Field>
                  <Field label="PSČ"><Input value={form.zip} onChange={(e) => setForm({ ...form, zip: e.target.value })} /></Field>
                  <div className="col-span-2"><Field label="IBAN (voliteľné)"><Input value={form.iban} onChange={(e) => setForm({ ...form, iban: e.target.value.toUpperCase() })} placeholder="SK…" /></Field></div>
                </div>
                <div className="mt-8 flex items-center justify-between">
                  <button onClick={() => setStep(1)} className="inline-flex items-center gap-1 text-[13px] text-zinc-500 hover:text-zinc-900 transition-colors">
                    <ArrowLeft size={13} /> Späť
                  </button>
                  <Button variant="primary" onClick={create} disabled={loading}>
                    {loading ? 'Vytváram…' : 'Vytvoriť firmu'} <ArrowRight size={14} />
                  </Button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div>
                <div className="w-12 h-12 rounded-2xl bg-zinc-100 text-zinc-900 flex items-center justify-center mb-5">
                  <Palette size={20} />
                </div>
                <h2 className="text-[26px] font-bold text-zinc-900 tracking-[-0.02em] leading-tight">Značka a tím</h2>
                <p className="text-[14px] text-zinc-500 mt-2 leading-relaxed">Nastav farbu pre PDF faktúr a pozvi kolegov. Voliteľné.</p>

                <div className="mt-6 space-y-5">
                  <div>
                    <div className="text-[12px] font-medium text-zinc-700 tracking-tight mb-2">Farba značky</div>
                    <div className="flex items-center gap-3">
                      <input type="color" value={brand.color} onChange={(e) => setBrand({ color: e.target.value })} className="w-12 h-12 rounded-xl border border-zinc-200 cursor-pointer bg-white" />
                      <div className="font-mono text-[13px] text-zinc-700 tabular-nums">{brand.color.toUpperCase()}</div>
                      <div className="flex gap-1.5 ml-auto">
                        {['#18181b', '#0f172a', '#7c2d12', '#052e16', '#4c1d95'].map((c) => (
                          <button key={c} onClick={() => setBrand({ color: c })} className="w-8 h-8 rounded-lg border border-zinc-200 hover:scale-110 transition-transform" style={{ backgroundColor: c }} aria-label={c} />
                        ))}
                      </div>
                    </div>
                  </div>

                  <Field label="Pozvi tím (voliteľné)">
                    <Input value={inviteEmails} onChange={(e) => setInviteEmails(e.target.value)} placeholder="jan@firma.sk, maria@firma.sk" />
                    <div className="text-[11px] text-zinc-500 mt-1">Oddel čiarkou alebo medzerou. Pozvánka pôjde na email.</div>
                  </Field>
                </div>

                <div className="mt-8 flex items-center justify-between">
                  <button onClick={() => setStep(4)} className="text-[13px] text-zinc-500 hover:text-zinc-900 tracking-tight transition-colors">
                    Preskočiť
                  </button>
                  <Button variant="primary" onClick={saveBrandingAndInvites} disabled={loading}>
                    {loading ? 'Ukladám…' : 'Uložiť a pokračovať'} <ArrowRight size={14} />
                  </Button>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="text-center py-4">
                <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                  <Check size={30} strokeWidth={2.5} />
                </div>
                <h1 className="text-[32px] font-bold text-zinc-900 tracking-[-0.02em]">Hotovo.</h1>
                <p className="text-[15px] text-zinc-500 mt-2 leading-relaxed">
                  Firma <strong className="text-zinc-800">{form.name}</strong> je pripravená.
                </p>
                <p className="text-[13px] text-zinc-400 mt-4 tracking-tight">Presmerujem ťa na dashboard…</p>
              </div>
            )}
          </div>
        </div>

        <div className="text-center mt-6 text-[12px] text-zinc-500">
          Máš otázku? <a href="mailto:support@zolo.sk" className="text-zinc-900 hover:underline">support@zolo.sk</a>
        </div>
      </div>
    </div>
  );
}
