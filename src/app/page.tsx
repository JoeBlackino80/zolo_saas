import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export default async function Home() {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (user) {
    const { redirect } = await import('next/navigation');
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen bg-white text-zinc-900 antialiased">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-zinc-100">
        <div className="max-w-6xl mx-auto px-6 h-12 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-zinc-900 text-white flex items-center justify-center font-black text-[13px] tracking-tight">Z</div>
            <span className="font-semibold text-[14px] tracking-tight">ZOLO</span>
          </Link>
          <nav className="flex items-center gap-1 text-[13px]">
            <Link href="/pricing" className="px-3 py-1.5 text-zinc-700 hover:text-zinc-950">Cenník</Link>
            <Link href="/contact" className="px-3 py-1.5 text-zinc-700 hover:text-zinc-950">Kontakt</Link>
            <Link href="/login" className="ml-2 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-full font-medium transition-colors">
              Prihlásiť
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="pt-24 sm:pt-32 pb-20 sm:pb-28 px-6">
        <div className="max-w-5xl mx-auto text-center">
          <h1 className="text-[44px] sm:text-7xl lg:text-[88px] font-bold tracking-[-0.04em] leading-[0.95]">
            Účtovníctvo,
            <br />
            <span className="text-zinc-400">znovu navrhnuté.</span>
          </h1>
          <p className="mt-6 text-lg sm:text-xl text-zinc-600 max-w-2xl mx-auto leading-relaxed">
            Cloud-first SaaS pre slovenský trh. Fakturuj, podávaj DPH, sleduj cashflow — všetko z jedného miesta.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/login"
              className="px-5 py-2.5 bg-zinc-900 hover:bg-zinc-700 text-white text-[15px] font-medium rounded-full transition-colors min-w-[200px] text-center"
            >
              Začať zadarmo
            </Link>
            <Link
              href="#funkcie"
              className="px-5 py-2.5 text-[15px] font-medium text-zinc-700 hover:text-zinc-950 inline-flex items-center gap-1.5 transition-colors"
            >
              Pozri funkcie <ArrowRight size={15} strokeWidth={2.2} />
            </Link>
          </div>
          <p className="mt-6 text-[13px] text-zinc-500">
            Bez kreditnej karty · Bez záväzkov · GDPR · Hosting v EÚ
          </p>
        </div>
      </section>

      {/* Product showcase strip */}
      <section className="px-6 pb-20 sm:pb-28">
        <div className="max-w-6xl mx-auto">
          <div className="relative bg-zinc-50 rounded-3xl overflow-hidden border border-zinc-100">
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-white/40 pointer-events-none" />
            <div className="p-8 sm:p-12 grid sm:grid-cols-3 gap-8 sm:gap-12 relative">
              <Stat number="91" label="cloudových tabuliek" sub="Účtovníctvo · sklady · mzdy · DPH" />
              <Stat number="3" label="XML výkazov 1 klikom" sub="DP DPH · KV · SV" />
              <Stat number="∞" label="firiem pod účtom" sub="Multi-tenant cez user_company_roles" />
            </div>
          </div>
        </div>
      </section>

      {/* Features grid */}
      <section id="funkcie" className="px-6 pb-20 sm:pb-28">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl sm:text-5xl font-bold tracking-[-0.03em] leading-[1.05] max-w-3xl">
            Všetko, čo potrebuje slovenská firma.
            <span className="text-zinc-400"> Nič navyše.</span>
          </h2>
          <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            <FeatureCard
              title="Fakturácia bez limitov"
              desc="FA · ZF · DO · DL · PPD · CP. Auto-prepočet DPH 23/19/10, multi-currency, PDF prílohy, Resend mailing."
              accent="dark"
            />
            <FeatureCard
              title="DPH 1 klikom"
              desc="DP DPH, KV, SV výkazy ako XML, pripravené na podanie na Finančnú správu."
            />
            <FeatureCard
              title="Multi-firma"
              desc="Neobmedzene firiem pod jedným účtom. Účtovníčka cez team pozvánku s vlastnou rolou."
            />
            <FeatureCard
              title="AI Import"
              desc="Odfoť účtenku alebo dodávateľskú FA — Claude Vision automaticky doplní sumy a kontá."
              badge="Beta"
            />
            <FeatureCard
              title="Cashflow predikcia"
              desc="90-dňová predikcia podľa splatností. Vidíš kedy ti zaplatia a kedy musíš platiť ty."
            />
            <FeatureCard
              title="Bankový autopairing"
              desc="CSV import → auto-match faktúr cez VS a sumu. Odsúhlasenie 1 klikom."
            />
            <FeatureCard
              title="Mzdy SK 2026"
              desc="SP 9.4% · ZP 4% · daň 19/25% · daňový bonus. Generovanie mzdových listov."
              badge="Beta"
            />
            <FeatureCard
              title="eDane + eKasa"
              desc="Export podaní pre Finančnú správu. Pripojenie virtuálnej registračnej pokladne."
            />
            <FeatureCard
              title="Bezpečnosť na prvom mieste"
              desc="MFA TOTP · RLS na DB · audit log · Sentry · rate limit · 30-min idle logout · GDPR DPA."
              accent="dark"
            />
          </div>
        </div>
      </section>

      {/* Pricing teaser */}
      <section className="px-6 pb-20 sm:pb-28">
        <div className="max-w-5xl mx-auto bg-zinc-950 text-white rounded-3xl p-10 sm:p-16 text-center">
          <h2 className="text-3xl sm:text-5xl font-bold tracking-[-0.03em] leading-[1.05]">
            Začni zadarmo.
            <br />
            <span className="text-zinc-500">Upgrade keď narastieš.</span>
          </h2>
          <p className="mt-5 text-zinc-400 max-w-xl mx-auto text-[15px]">
            Free navždy zadarmo, Pro €15/mes, Business €49/mes. Bez záväzkov, bez kreditky pre Free.
          </p>
          <div className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/pricing"
              className="px-5 py-2.5 bg-white hover:bg-zinc-100 text-zinc-900 text-[15px] font-medium rounded-full transition-colors min-w-[200px] text-center"
            >
              Pozri cenník
            </Link>
            <Link
              href="/login"
              className="px-5 py-2.5 text-[15px] font-medium text-zinc-300 hover:text-white inline-flex items-center gap-1.5 transition-colors"
            >
              Vytvoriť účet <ArrowRight size={15} strokeWidth={2.2} />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-100 px-6 py-10">
        <div className="max-w-6xl mx-auto grid sm:grid-cols-4 gap-8 text-[13px]">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-5 h-5 rounded bg-zinc-900 text-white flex items-center justify-center font-black text-[11px]">Z</div>
              <span className="font-semibold tracking-tight">ZOLO</span>
            </div>
            <p className="text-zinc-500 leading-relaxed">
              Cloud-first účtovníctvo pre slovenský trh. Hostované v EÚ.
            </p>
          </div>
          <FooterCol
            title="Produkt"
            links={[
              { href: '/pricing', label: 'Cenník' },
              { href: '/login', label: 'Vytvoriť účet' },
              { href: '/#funkcie', label: 'Funkcie' },
            ]}
          />
          <FooterCol
            title="Spoločnosť"
            links={[
              { href: '/contact', label: 'Kontakt' },
              { href: 'mailto:security@zolo.sk', label: 'Bezpečnosť' },
              { href: 'https://github.com/JoeBlackino80/zolo_saas', label: 'GitHub' },
            ]}
          />
          <FooterCol
            title="Právne"
            links={[
              { href: '/terms', label: 'Obchodné podmienky' },
              { href: '/privacy', label: 'Ochrana údajov' },
              { href: '/cookies', label: 'Cookies' },
            ]}
          />
        </div>
        <div className="max-w-6xl mx-auto mt-10 pt-6 border-t border-zinc-100 text-[12px] text-zinc-500 flex flex-wrap items-center justify-between gap-2">
          <div>© 2026 ZOLO · Všetky práva vyhradené.</div>
          <div>Hostované v EÚ · Made in Slovakia</div>
        </div>
      </footer>
    </div>
  );
}

function Stat({ number, label, sub }: { number: string; label: string; sub: string }) {
  return (
    <div>
      <div className="text-6xl sm:text-7xl font-bold tracking-[-0.04em] leading-none text-zinc-900">
        {number}
      </div>
      <div className="mt-3 font-semibold text-[14px] tracking-tight">{label}</div>
      <div className="text-[13px] text-zinc-500 mt-0.5">{sub}</div>
    </div>
  );
}

function FeatureCard({
  title,
  desc,
  accent,
  badge,
}: {
  title: string;
  desc: string;
  accent?: 'dark';
  badge?: string;
}) {
  const dark = accent === 'dark';
  return (
    <div
      className={`rounded-2xl p-7 sm:p-8 transition-colors ${
        dark
          ? 'bg-zinc-950 text-white border border-zinc-900'
          : 'bg-zinc-50 hover:bg-zinc-100 border border-zinc-100'
      }`}
    >
      <div className="flex items-center gap-2">
        <h3 className={`text-[19px] font-semibold tracking-tight ${dark ? 'text-white' : 'text-zinc-900'}`}>
          {title}
        </h3>
        {badge && (
          <span className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded font-semibold ${dark ? 'bg-white/10 text-zinc-300' : 'bg-zinc-200 text-zinc-700'}`}>
            {badge}
          </span>
        )}
      </div>
      <p className={`mt-2 text-[14px] leading-relaxed ${dark ? 'text-zinc-400' : 'text-zinc-600'}`}>{desc}</p>
    </div>
  );
}

function FooterCol({ title, links }: { title: string; links: { href: string; label: string }[] }) {
  return (
    <div>
      <div className="font-semibold text-zinc-900 mb-3 tracking-tight">{title}</div>
      <ul className="space-y-2">
        {links.map((l) => (
          <li key={l.href}>
            <Link href={l.href} className="text-zinc-500 hover:text-zinc-900 transition-colors">
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
