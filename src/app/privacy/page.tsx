import Link from 'next/link';

export const metadata = { title: 'Ochrana osobných údajov · ZOLO' };

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-extrabold">Z</div>
            <span className="font-bold text-slate-900">ZOLO</span>
          </Link>
          <Link href="/login" className="text-sm text-blue-600 hover:underline">Prihlásiť sa</Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight mb-2">Ochrana osobných údajov</h1>
        <p className="text-sm text-slate-500 mb-8">Účinné od 15. júna 2026 · v súlade s GDPR (EÚ 2016/679) a zákonom č. 18/2018 Z.z.</p>

        <section className="space-y-6 text-slate-700 leading-relaxed">
          <div>
            <h2 className="text-xl font-semibold text-slate-900 mt-8 mb-3">1. Prevádzkovateľ</h2>
            <p>Prevádzkovateľom v zmysle GDPR je <strong>ZOLO</strong> (kontaktné údaje na <Link href="/contact" className="text-blue-600 hover:underline">stránke kontaktu</Link>).</p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-slate-900 mt-8 mb-3">2. Aké údaje zbierame</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Identifikačné údaje:</strong> email, meno, ID účtu</li>
              <li><strong>Údaje firiem:</strong> názov, IČO, DIČ, IČ DPH, adresa, IBAN, kontakty</li>
              <li><strong>Účtovné údaje:</strong> faktúry, doklady, denníkové zápisy, mzdy</li>
              <li><strong>Technické údaje:</strong> IP adresa, čas prístupu, prehliadač (logy)</li>
              <li><strong>MFA údaje:</strong> registrovaný TOTP autentifikátor</li>
            </ul>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-slate-900 mt-8 mb-3">3. Účel spracovania</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>Plnenie zmluvy o poskytovaní Služby</li>
              <li>Plnenie zákonných povinností (zákon o účtovníctve, DPH, dani z príjmov)</li>
              <li>Zabezpečenie prístupu (autentifikácia, MFA)</li>
              <li>Detekcia bezpečnostných incidentov</li>
              <li>Komunikácia s používateľom</li>
            </ul>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-slate-900 mt-8 mb-3">4. Právny základ</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>Plnenie zmluvy (čl. 6 ods. 1 písm. b GDPR)</li>
              <li>Plnenie zákonnej povinnosti (čl. 6 ods. 1 písm. c GDPR)</li>
              <li>Oprávnený záujem prevádzkovateľa pri detekcii podvodov (čl. 6 ods. 1 písm. f GDPR)</li>
            </ul>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-slate-900 mt-8 mb-3">5. Doba uchovávania</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Účtovné doklady:</strong> 10 rokov (§ 35 zákona č. 431/2002 Z.z. o účtovníctve)</li>
              <li><strong>Daňové údaje:</strong> 10 rokov od splatnosti dane</li>
              <li><strong>Mzdové údaje:</strong> 50 rokov (§ 35a ZoÚ)</li>
              <li><strong>Audit logy:</strong> 2 roky</li>
              <li><strong>Inaktívne účty:</strong> zmazané po 3 rokoch nečinnosti</li>
            </ul>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-slate-900 mt-8 mb-3">6. Komu odovzdávame údaje</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Supabase Inc.</strong> (databáza + auth) — EU hosting</li>
              <li><strong>Vercel Inc.</strong> (CDN, hosting) — EU edge (Frankfurt)</li>
              <li><strong>Resend Inc.</strong> (email delivery)</li>
              <li><strong>Stripe Inc.</strong> (platby — iba ak používateľ nastaví)</li>
              <li><strong>Cloudflare Inc.</strong> (DNS + DDoS protection)</li>
              <li><strong>Orgány verejnej moci</strong> na základe zákonnej povinnosti</li>
            </ul>
            <p className="mt-2">So všetkými spracovateľmi máme uzavretú spracovateľskú zmluvu (DPA) v súlade s čl. 28 GDPR.</p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-slate-900 mt-8 mb-3">7. Tvoje práva</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Právo na prístup</strong> (čl. 15 GDPR) — vidieť aké údaje o tebe máme</li>
              <li><strong>Právo na opravu</strong> (čl. 16) — opraviť nesprávne údaje</li>
              <li><strong>Právo na vymazanie</strong> (čl. 17) — &ldquo;právo byť zabudnutý&rdquo;</li>
              <li><strong>Právo na obmedzenie spracovania</strong> (čl. 18)</li>
              <li><strong>Právo na prenosnosť</strong> (čl. 20) — JSON export tvojich dát</li>
              <li><strong>Právo namietať</strong> (čl. 21)</li>
              <li><strong>Právo podať sťažnosť</strong> na <a href="https://dataprotection.gov.sk" target="_blank" rel="noopener" className="text-blue-600 hover:underline">Úrad na ochranu osobných údajov SR</a></li>
            </ul>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-slate-900 mt-8 mb-3">8. Bezpečnosť</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>HTTPS šifrovanie pre všetky pripojenia (TLS 1.2+)</li>
              <li>Row-Level Security (RLS) na všetkých dátových tabuľkách</li>
              <li>Voliteľná dvojfaktorová autentifikácia (TOTP)</li>
              <li>Heslá hashované bcryptom (Supabase Auth)</li>
              <li>Automatické zálohy denne (Supabase)</li>
              <li>Audit log všetkých zmien</li>
            </ul>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-slate-900 mt-8 mb-3">9. Cookies</h2>
            <p>Používame iba nevyhnutné cookies pre autentifikáciu. Bližšie info: <Link href="/cookies" className="text-blue-600 hover:underline">Cookies politika</Link>.</p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-slate-900 mt-8 mb-3">10. Kontakt v otázkach ochrany údajov</h2>
            <p>Pre uplatnenie tvojich práv alebo otázky napíš na <a href="mailto:privacy@zolo.sk" className="text-blue-600 hover:underline">privacy@zolo.sk</a>. Odpovieme do 30 dní.</p>
          </div>
        </section>

        <div className="mt-12 pt-6 border-t border-slate-200 text-sm text-slate-500 flex gap-4">
          <Link href="/terms" className="hover:text-blue-600">Obchodné podmienky</Link>
          <Link href="/cookies" className="hover:text-blue-600">Cookies</Link>
          <Link href="/" className="hover:text-blue-600">Späť na hlavnú</Link>
        </div>
      </main>
    </div>
  );
}
