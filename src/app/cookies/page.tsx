import Link from 'next/link';

export const metadata = { title: 'Cookies · ZOLO' };

export default function CookiesPage() {
  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="bg-white border-b border-zinc-200">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-md bg-zinc-900 text-white flex items-center justify-center font-black text-[13px] tracking-tight">Z</div>
            <span className="font-semibold text-zinc-900 tracking-tight">ZOLO</span>
          </Link>
          <Link href="/login" className="text-sm text-zinc-900 hover:underline">Prihlásiť sa</Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold text-zinc-900 tracking-tight mb-2">Cookies politika</h1>
        <p className="text-sm text-zinc-500 mb-8">Účinné od 15. júna 2026</p>

        <section className="space-y-6 text-zinc-700 leading-relaxed">
          <div>
            <h2 className="text-xl font-semibold text-zinc-900 mt-8 mb-3">1. Čo sú cookies</h2>
            <p>Cookies sú malé textové súbory, ktoré server ukladá do tvojho prehliadača, aby si zapamätal informácie medzi návštevami.</p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-zinc-900 mt-8 mb-3">2. Aké cookies používame</h2>
            <p>ZOLO používa <strong>iba nevyhnutné cookies</strong> potrebné pre fungovanie Služby:</p>
            <table className="w-full mt-4 text-sm border border-zinc-200 rounded">
              <thead className="bg-zinc-100">
                <tr><th className="text-left p-3">Cookie</th><th className="text-left p-3">Účel</th><th className="text-left p-3">Doba</th></tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                <tr><td className="p-3 font-mono">sb-access-token</td><td className="p-3">Autentifikácia (Supabase)</td><td className="p-3">1 hodina</td></tr>
                <tr><td className="p-3 font-mono">sb-refresh-token</td><td className="p-3">Obnovenie session</td><td className="p-3">7 dní</td></tr>
                <tr><td className="p-3 font-mono">zolo_firm</td><td className="p-3">Aktuálne vybraná firma</td><td className="p-3">localStorage</td></tr>
                <tr><td className="p-3 font-mono">zolo_locale</td><td className="p-3">Jazyk rozhrania</td><td className="p-3">localStorage</td></tr>
              </tbody>
            </table>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-zinc-900 mt-8 mb-3">3. Tracking cookies</h2>
            <p><strong>Nepoužívame</strong> žiadne marketingové, reklamné ani analytické tracking cookies tretích strán. Žiadny Facebook Pixel, žiadny Google Analytics, žiadne LinkedIn Insight.</p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-zinc-900 mt-8 mb-3">4. Ako spravovať cookies</h2>
            <p>Keďže používame iba <strong>nevyhnutné cookies</strong>, nepotrebujeme od teba súhlas (GDPR čl. 7 + ePrivacy čl. 5.3 — &ldquo;technicky nevyhnutné&rdquo;).</p>
            <p className="mt-2">Cookies môžeš ručne zmazať v nastaveniach tvojho prehliadača, ale po ich vymazaní bude potrebné znova sa prihlásiť.</p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-zinc-900 mt-8 mb-3">5. Zmeny politiky</h2>
            <p>Ak začneme používať voliteľné cookies (napr. analytické), zobrazíme cookie banner pre tvoj súhlas.</p>
          </div>
        </section>

        <div className="mt-12 pt-6 border-t border-zinc-200 text-sm text-zinc-500 flex gap-4">
          <Link href="/terms" className="hover:text-zinc-900">Obchodné podmienky</Link>
          <Link href="/privacy" className="hover:text-zinc-900">Ochrana osobných údajov</Link>
          <Link href="/" className="hover:text-zinc-900">Späť na hlavnú</Link>
        </div>
      </main>
    </div>
  );
}
