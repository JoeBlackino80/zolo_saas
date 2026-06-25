import Link from 'next/link';
import { Check, X } from 'lucide-react';
import PlanCTA from './cta';

export const metadata = { title: 'Cenník' };

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
    <div className="min-h-screen bg-white text-zinc-900 antialiased">
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-zinc-100">
        <div className="max-w-6xl mx-auto px-6 h-12 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-zinc-900 text-white flex items-center justify-center font-black text-[13px] tracking-tight">Z</div>
            <span className="font-semibold text-[14px] tracking-tight">ZOLO</span>
          </Link>
          <Link href="/login" className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white text-[13px] rounded-full font-medium transition-colors">
            Prihlásiť
          </Link>
        </div>
      </header>

      <section className="px-6 pt-20 sm:pt-28 pb-12 text-center">
        <h1 className="text-5xl sm:text-7xl font-bold tracking-[-0.04em] leading-[0.95]">
          Vyber si plán.
        </h1>
        <p className="mt-5 text-lg text-zinc-600 max-w-xl mx-auto">
          Začni zadarmo, upgrade keď narastieš. Bez kreditnej karty pre Free.
        </p>
      </section>

      <section className="px-6 pb-20">
        <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-4 sm:gap-5">
          {PLANS.map((p) => (
            <div
              key={p.name}
              className={`relative rounded-2xl p-7 sm:p-8 flex flex-col ${
                p.highlighted
                  ? 'bg-zinc-950 text-white'
                  : 'bg-zinc-50 border border-zinc-100 text-zinc-900'
              }`}
            >
              {p.highlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-2.5 py-0.5 bg-white text-zinc-900 text-[10px] font-semibold uppercase tracking-[0.1em] rounded-full">
                  Odporúčané
                </div>
              )}
              <div>
                <div className="text-[19px] font-semibold tracking-tight">{p.name}</div>
                <div className={`text-[13px] mt-1 ${p.highlighted ? 'text-zinc-400' : 'text-zinc-500'}`}>{p.desc}</div>
                <div className="flex items-baseline gap-1 mt-5">
                  <span className="text-5xl font-bold tracking-[-0.04em]">€{p.price}</span>
                  <span className={p.highlighted ? 'text-zinc-400' : 'text-zinc-500'}>{p.period}</span>
                </div>
                <PlanCTA
                  plan={p.name.toLowerCase() as 'free' | 'pro' | 'business'}
                  ctaText={p.cta}
                  href={p.href}
                  highlighted={p.highlighted}
                />
              </div>
              <ul className={`mt-7 pt-6 border-t space-y-2.5 ${p.highlighted ? 'border-white/10' : 'border-zinc-200'}`}>
                {p.features.map((f, i) => (
                  <li key={i} className="flex items-center gap-2.5 text-[13px]">
                    {f.ok ? (
                      <Check size={14} className={p.highlighted ? 'text-white shrink-0' : 'text-zinc-900 shrink-0'} strokeWidth={2.5} />
                    ) : (
                      <X size={14} className={p.highlighted ? 'text-zinc-600 shrink-0' : 'text-zinc-300 shrink-0'} strokeWidth={2} />
                    )}
                    <span
                      className={
                        f.ok
                          ? p.highlighted
                            ? 'text-zinc-200'
                            : 'text-zinc-700'
                          : p.highlighted
                            ? 'text-zinc-600 line-through'
                            : 'text-zinc-400 line-through'
                      }
                    >
                      {f.text}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className="px-6 pb-20 sm:pb-28">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-[-0.03em] text-center">
            Často kladené otázky
          </h2>
          <div className="mt-10 grid sm:grid-cols-2 gap-4">
            {[
              { q: 'Mám zaviazok pri Free pláne?', a: 'Nie. Free plán je zadarmo navždy, bez kreditnej karty.' },
              { q: 'Môžem upgrade-ovať kedykoľvek?', a: 'Áno. Upgrade alebo downgrade kedykoľvek, platíš pomerne za zostatok mesiaca.' },
              { q: 'Aké platobné metódy podporujete?', a: 'Karta (Visa/Mastercard) a SEPA priamy debet pre Pro/Business plány.' },
              { q: 'Sú dáta v EÚ?', a: 'Áno. Hosting v Nemecku/Írsku (Supabase + Vercel + Resend EU regióny).' },
              { q: 'Môžem zrušiť?', a: 'Áno, kedykoľvek bez výpovednej lehoty. Tvoje dáta zostávajú prístupné 30 dní pre export.' },
              { q: 'Ponúkate dotácie?', a: 'Áno — neziskové organizácie a vzdelávacie inštitúcie dostanú 50% zľavu na Pro plán.' },
            ].map((f, i) => (
              <div key={i} className="bg-zinc-50 border border-zinc-100 p-5 rounded-2xl">
                <div className="font-semibold text-zinc-900 text-[14px] tracking-tight">{f.q}</div>
                <div className="text-[14px] text-zinc-600 mt-2 leading-relaxed">{f.a}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-zinc-100 px-6 py-10">
        <div className="max-w-6xl mx-auto text-[12px] text-zinc-500 flex flex-wrap items-center justify-between gap-2">
          <div>© 2026 ZOLO · Hostované v EÚ · GDPR compliant</div>
          <div className="flex gap-4">
            <Link href="/terms" className="hover:text-zinc-900">Obchodné podmienky</Link>
            <Link href="/privacy" className="hover:text-zinc-900">Ochrana údajov</Link>
            <Link href="/cookies" className="hover:text-zinc-900">Cookies</Link>
            <Link href="/contact" className="hover:text-zinc-900">Kontakt</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
