import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { Check } from 'lucide-react';

export default async function Home() {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (user) {
    const { redirect } = await import('next/navigation');
    redirect('/dashboard');
  }

  const features = [
    { title: 'Fakturácia bez limitov', desc: 'FA, ZF, DO, DL, PPD, CP — všetky typy dokladov so živým prepočtom DPH' },
    { title: 'DPH výkazy 1 klikom', desc: 'DP DPH, KV, SV — automaticky generované XML pripravené na podanie' },
    { title: 'Multi-firm portfolio', desc: 'Neobmedzene firiem pod jedným účtom. Účtovníčka pristupuje cez pozvánku.' },
    { title: 'AI Vision import', desc: 'Odfotíš účtenku → Claude Sonnet automaticky extrahuje sumy a údaje' },
    { title: 'Optimalizácia cez firmy', desc: 'Skupinové započítanie DPH naprieč tvojím portfóliom — úspora cash flow' },
    { title: 'Bankový výpis autopairing', desc: 'CSV import + auto-match na faktúry podľa VS a sumy' },
    { title: 'Cash flow 90-dňová predikcia', desc: 'Vidíš kedy budeš platiť a kedy ti zaplatia, týždeň po týždni' },
    { title: 'Účtovníctvo komplet', desc: 'Denník, hlavná kniha, súvaha, P&L, odpisy, mzdy SK 2026 sadzby' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-extrabold">Z</div>
            <span className="font-bold text-slate-900">ZOLO</span>
          </div>
          <Link href="/login" className="px-4 py-2 bg-slate-900 text-white text-sm font-semibold rounded-lg hover:bg-slate-800 transition">Prihlásiť sa</Link>
        </div>
      </header>

      <section className="max-w-5xl mx-auto px-6 py-20 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold mb-6">
          <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
          Cloud-first SaaS pre slovenský trh
        </div>
        <h1 className="text-5xl font-extrabold text-slate-900 tracking-tight">
          Moderné účtovníctvo<br />pre tvoje firmy
        </h1>
        <p className="text-lg text-slate-600 mt-4 max-w-2xl mx-auto">
          Fakturácia · DPH výkazy · účtovníctvo · mzdy · sklady · projekty.
          Všetko v jednom moderne navrhnutom cloude.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link href="/login" className="px-6 py-3 bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-semibold rounded-lg shadow-lg shadow-blue-500/25 hover:translate-y-[-1px] transition">Začať zadarmo</Link>
          <Link href="#features" className="px-6 py-3 bg-white border border-slate-200 text-slate-700 font-semibold rounded-lg hover:bg-slate-50 transition">Pozri funkcie</Link>
        </div>
      </section>

      <section id="features" className="max-w-6xl mx-auto px-6 py-16">
        <h2 className="text-3xl font-bold text-slate-900 text-center mb-12">Všetko čo potrebuješ na slovenský účtovný workflow</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {features.map((f, i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition">
              <Check className="text-emerald-500 mb-3" size={20} />
              <div className="font-semibold text-slate-900 mb-1">{f.title}</div>
              <div className="text-sm text-slate-500">{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-white border-t border-slate-200">
        <div className="max-w-4xl mx-auto px-6 py-16 text-center">
          <h2 className="text-3xl font-bold text-slate-900 mb-4">Pripravený začať?</h2>
          <p className="text-slate-600 mb-8">Bez kreditnej karty. Bez záväzkov. 100% slovenský zákon.</p>
          <Link href="/login" className="inline-block px-8 py-3 bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-semibold rounded-lg shadow-xl shadow-blue-500/30 hover:translate-y-[-1px] transition">Vytvoriť účet zadarmo</Link>
        </div>
      </section>

      <footer className="bg-slate-900 text-slate-400 py-8">
        <div className="max-w-6xl mx-auto px-6 text-sm flex flex-wrap items-center justify-between gap-3">
          <div>© 2026 ZOLO · Hostované v EÚ · GDPR compliant</div>
          <div className="flex gap-4">
            <Link href="/terms" className="hover:text-white">Obchodné podmienky</Link>
            <Link href="/privacy" className="hover:text-white">Ochrana údajov</Link>
            <Link href="/cookies" className="hover:text-white">Cookies</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
