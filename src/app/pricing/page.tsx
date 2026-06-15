import Link from 'next/link';
import { Check, X } from 'lucide-react';

export const metadata = { title: 'Cenník · ZOLO' };

const PLANS = [
  {
    name: 'Free',
    price: '0',
    period: '/mes',
    desc: 'Pre začínajúcich podnikateľov',
    cta: 'Začať zadarmo',
    href: '/login',
    highlighted: false,
    features: [
      { ok: true, text: '1 firma' },
      { ok: true, text: 'Neobmedzene faktúr' },
      { ok: true, text: 'DPH výkazy (DP/KV/SV)' },
      { ok: true, text: 'Účtovníctvo + denník' },
      { ok: true, text: 'Pohľadávky + cash flow' },
      { ok: true, text: 'Daňový kalendár' },
      { ok: false, text: 'Pozvánka pre účtovníčku' },
      { ok: false, text: 'AI Vision import' },
      { ok: false, text: 'Stripe platby' },
      { ok: false, text: 'Custom branding' },
    ],
  },
  {
    name: 'Pro',
    price: '15',
    period: '/mes',
    desc: 'Pre rastúce firmy',
    cta: 'Vyskúšať 14 dní zadarmo',
    href: '/login',
    highlighted: true,
    features: [
      { ok: true, text: '3 firmy' },
      { ok: true, text: 'Neobmedzene faktúr' },
      { ok: true, text: 'DPH výkazy (DP/KV/SV)' },
      { ok: true, text: 'Účtovníctvo + denník + mzdy' },
      { ok: true, text: 'Pohľadávky + cash flow' },
      { ok: true, text: 'Daňový kalendár' },
      { ok: true, text: 'Pozvánka pre účtovníčku' },
      { ok: true, text: 'AI Vision import (100/mes)' },
      { ok: true, text: 'Stripe platby' },
      { ok: false, text: 'Custom branding' },
    ],
  },
  {
    name: 'Business',
    price: '49',
    period: '/mes',
    desc: 'Pre holdingy a SaaS',
    cta: 'Kontaktovať predaj',
    href: '/contact',
    highlighted: false,
    features: [
      { ok: true, text: 'Neobmedzene firiem' },
      { ok: true, text: 'Neobmedzene faktúr' },
      { ok: true, text: 'DPH výkazy (DP/KV/SV)' },
      { ok: true, text: 'Účtovníctvo + denník + mzdy' },
      { ok: true, text: 'Pohľadávky + cash flow' },
      { ok: true, text: 'Daňový kalendár' },
      { ok: true, text: 'Pozvánka pre účtovníčku' },
      { ok: true, text: 'AI Vision import (unlimited)' },
      { ok: true, text: 'Stripe platby' },
      { ok: true, text: 'Custom branding + logo' },
    ],
  },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-extrabold">Z</div>
            <span className="font-bold text-slate-900">ZOLO</span>
          </Link>
          <Link href="/login" className="px-4 py-2 bg-slate-900 text-white text-sm font-semibold rounded-lg hover:bg-slate-800">Prihlásiť sa</Link>
        </div>
      </header>

      <section className="max-w-5xl mx-auto px-6 py-16 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold mb-6">
          Transparentný cenník
        </div>
        <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">Vyber si plán</h1>
        <p className="text-lg text-slate-600 mt-3 max-w-2xl mx-auto">
          Začni zadarmo, neskôr upgrade keď budeš potrebovať. Bez kreditnej karty pre Free plán.
        </p>
      </section>

      <section className="max-w-6xl mx-auto px-6 pb-20">
        <div className="grid md:grid-cols-3 gap-6">
          {PLANS.map((p) => (
            <div key={p.name} className={`rounded-2xl border ${p.highlighted ? 'border-blue-500 shadow-xl shadow-blue-500/20 bg-white scale-[1.03] relative' : 'border-slate-200 bg-white'}`}>
              {p.highlighted && <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-gradient-to-br from-blue-500 to-purple-500 text-white text-[10px] font-bold uppercase tracking-wider rounded-full">Odporúčané</div>}
              <div className="p-6 border-b border-slate-100">
                <div className="font-bold text-slate-900 text-lg">{p.name}</div>
                <div className="text-sm text-slate-500 mt-1">{p.desc}</div>
                <div className="flex items-baseline gap-1 mt-4">
                  <span className="text-4xl font-extrabold tracking-tight">€{p.price}</span>
                  <span className="text-slate-500">{p.period}</span>
                </div>
                <Link href={p.href} className={`block mt-5 w-full text-center py-2.5 rounded-lg font-semibold text-sm transition ${p.highlighted ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/25 hover:translate-y-[-1px]' : 'bg-slate-900 text-white hover:bg-slate-800'}`}>
                  {p.cta}
                </Link>
              </div>
              <ul className="p-6 space-y-2.5">
                {p.features.map((f, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm">
                    {f.ok ? <Check size={14} className="text-emerald-500 flex-shrink-0" /> : <X size={14} className="text-slate-300 flex-shrink-0" />}
                    <span className={f.ok ? 'text-slate-700' : 'text-slate-400 line-through'}>{f.text}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <h2 className="text-2xl font-bold text-slate-900">Často kladené otázky</h2>
          <div className="grid md:grid-cols-2 gap-4 mt-8 text-left max-w-4xl mx-auto">
            {[
              { q: 'Mám zaviazok pri Free pláne?', a: 'Nie. Free plán je zadarmo navždy, bez kreditnej karty.' },
              { q: 'Môžem upgrade-ovať kedykoľvek?', a: 'Áno. Upgrade alebo downgrade kedykoľvek, platíš pomerne za zostatok mesiaca.' },
              { q: 'Aké platobné metódy podporujete?', a: 'Karta (Visa/Mastercard) a SEPA priamy debet pre Pro/Business plány.' },
              { q: 'Sú dáta v EÚ?', a: 'Áno. Hosting v Nemecku/Írsku (Supabase + Vercel + Resend EU regióny).' },
              { q: 'Môžem zrušiť?', a: 'Áno, kedykoľvek bez výpovednej lehoty. Tvoje dáta zostávajú prístupné 30 dní pre export.' },
              { q: 'Ponúkate dotácie?', a: 'Áno — neziskové organizácie a vzdelávacie inštitúcie dostanú 50% zľavu na Pro plán.' },
            ].map((f, i) => (
              <div key={i} className="bg-white p-5 rounded-xl border border-slate-200">
                <div className="font-semibold text-slate-900 text-sm">{f.q}</div>
                <div className="text-sm text-slate-600 mt-2">{f.a}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="bg-slate-900 text-slate-400 py-8">
        <div className="max-w-6xl mx-auto px-6 text-sm flex flex-wrap items-center justify-between gap-3">
          <div>© 2026 ZOLO · Hostované v EÚ · GDPR compliant</div>
          <div className="flex gap-4">
            <Link href="/terms" className="hover:text-white">Obchodné podmienky</Link>
            <Link href="/privacy" className="hover:text-white">Ochrana údajov</Link>
            <Link href="/cookies" className="hover:text-white">Cookies</Link>
            <Link href="/contact" className="hover:text-white">Kontakt</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
