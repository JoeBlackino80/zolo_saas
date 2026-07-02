import Link from 'next/link';

export const metadata = { title: 'Obchodné podmienky · ZOLO' };

export default function TermsPage() {
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

      <main className="max-w-3xl mx-auto px-6 py-12 prose prose-slate">
        <h1 className="text-3xl font-bold text-zinc-900 tracking-tight mb-2">Obchodné podmienky</h1>
        <p className="text-sm text-zinc-500 mb-8">Účinné od 15. júna 2026</p>

        <section className="space-y-6 text-zinc-700 leading-relaxed">
          <div>
            <h2 className="text-xl font-semibold text-zinc-900 mt-8 mb-3">1. Úvodné ustanovenia</h2>
            <p>Prevádzkovateľom služby ZOLO (ďalej len &ldquo;Služba&rdquo;) je <strong>Prevádzkovateľ</strong> (kontaktné údaje na <Link href="/contact" className="text-zinc-900 hover:underline">stránke kontaktu</Link>). Tieto obchodné podmienky upravujú práva a povinnosti zmluvných strán pri používaní Služby.</p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-zinc-900 mt-8 mb-3">2. Definícia služby</h2>
            <p>ZOLO je cloudová aplikácia pre evidenciu fakturácie, daňových výkazov, účtovníctva, miezd, skladov a súvisiacich účtovných agend pre fyzické a právnické osoby na území Slovenskej republiky podľa platnej legislatívy.</p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-zinc-900 mt-8 mb-3">3. Registrácia a prístup</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>Pre používanie Služby je nutná registrácia s platným emailom.</li>
              <li>Používateľ je povinný uvádzať pravdivé údaje.</li>
              <li>Heslo a prihlasovacie údaje sú dôverné — nesmú byť zdieľané s tretími osobami.</li>
              <li>Odporúčame aktivovať dvojfaktorovú autentifikáciu (MFA).</li>
            </ul>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-zinc-900 mt-8 mb-3">4. Cenové podmienky</h2>
            <p>Služba je momentálne dostupná v rámci verejnej beta verzie zadarmo. Prevádzkovateľ si vyhradzuje právo zaviesť spoplatnenie s aspoň 30-dňovou výpoveďou.</p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-zinc-900 mt-8 mb-3">5. Práva a povinnosti používateľa</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>Používateľ je výhradne zodpovedný za správnosť dát, ktoré zadáva.</li>
              <li>Prevádzkovateľ nezodpovedá za škodu spôsobenú nesprávnym používaním alebo nesprávnymi údajmi.</li>
              <li>Používateľ je povinný dodržiavať platnú legislatívu SR (zákony o DPH, dani z príjmov, účtovníctve).</li>
            </ul>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-zinc-900 mt-8 mb-3">6. Dostupnosť služby</h2>
            <p>Prevádzkovateľ sa snaží zabezpečiť maximálnu dostupnosť (SLA 99% v beta režime). Plánované odstávky budú vopred oznámené.</p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-zinc-900 mt-8 mb-3">7. Spracovanie údajov</h2>
            <p>Spracovanie osobných údajov sa riadi samostatným dokumentom <Link href="/privacy" className="text-zinc-900 hover:underline">Ochrana osobných údajov</Link>.</p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-zinc-900 mt-8 mb-3">8. Zodpovednosť za škodu</h2>
            <p>Maximálna zodpovednosť Prevádzkovateľa za škodu spôsobenú v súvislosti so Službou je obmedzená sumou rovnajúcou sa mesačnému poplatku, najviac však 100 €.</p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-zinc-900 mt-8 mb-3">9. Ukončenie</h2>
            <p>Používateľ môže kedykoľvek ukončiť používanie Služby zmazaním svojho účtu. Prevádzkovateľ môže ukončiť poskytovanie pri porušení týchto podmienok.</p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-zinc-900 mt-8 mb-3">10. Záverečné ustanovenia</h2>
            <p>Tieto podmienky sa riadia právom Slovenskej republiky. Spory budú riešené pred vecne a miestne príslušným súdom SR.</p>
            <p className="mt-2">Prevádzkovateľ si vyhradzuje právo zmeniť tieto podmienky. O zmenách budete informovaní emailom aspoň 14 dní vopred.</p>
          </div>
        </section>

        <div className="mt-12 pt-6 border-t border-zinc-200 text-sm text-zinc-500 flex gap-4">
          <Link href="/privacy" className="hover:text-zinc-900">Ochrana osobných údajov</Link>
          <Link href="/cookies" className="hover:text-zinc-900">Cookies</Link>
          <Link href="/" className="hover:text-zinc-900">Späť na hlavnú</Link>
        </div>
      </main>
    </div>
  );
}
