import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, ShieldCheck } from 'lucide-react';

export const metadata: Metadata = {
  title: 'DPA — Data Processing Agreement',
  description: 'Zmluva o spracúvaní osobných údajov medzi ZOLO a klientom (GDPR čl. 28).',
};

export default function DPAPage() {
  return (
    <div className="min-h-screen bg-white text-zinc-900">
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-zinc-100">
        <div className="max-w-4xl mx-auto px-6 h-12 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <ArrowLeft size={14} />
            <span className="text-[13px] text-zinc-700">Späť</span>
          </Link>
          <div className="flex items-center gap-2 text-[13px]">
            <div className="w-5 h-5 rounded bg-zinc-900 text-white flex items-center justify-center font-black text-[10px]">Z</div>
            <span className="font-semibold">ZOLO DPA</span>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-6 py-16">
        <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500 mb-3">Právne · GDPR čl. 28</div>
        <h1 className="text-[36px] font-bold tracking-[-0.03em] leading-tight mb-4">Zmluva o spracúvaní osobných údajov</h1>
        <p className="text-[14px] text-zinc-500">Data Processing Agreement (DPA) · Verzia 1.0 · Účinná od 1. januára 2026</p>

        <div className="prose prose-zinc max-w-none mt-10 text-[14px] leading-relaxed">
          <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-100 flex items-start gap-3 mb-8">
            <ShieldCheck size={20} className="text-zinc-700 shrink-0 mt-0.5" />
            <div>
              <strong className="text-zinc-900">Automatický súhlas.</strong>
              <div className="text-zinc-600 mt-1">Vytvorením účtu na app.zolo.sk súhlasíš s touto zmluvou. Ako Prevádzkovateľ (Controller) môžeš vyžiadať podpísaný PDF export cez podpora@zolo.sk.</div>
            </div>
          </div>

          <h2>1. Strany zmluvy</h2>
          <p><strong>Sprostredkovateľ (Processor):</strong> ZOLO — Slovak Tax &amp; Accounting, obchodné údaje na <Link href="/contact" className="text-zinc-900 underline">/contact</Link>.</p>
          <p><strong>Prevádzkovateľ (Controller):</strong> Fyzická alebo právnická osoba, ktorá si vytvorila účet na app.zolo.sk. Prevádzkovateľ rozhoduje o účeloch a spôsoboch spracúvania.</p>

          <h2>2. Predmet a účel spracúvania</h2>
          <p>ZOLO ako Sprostredkovateľ spracúva osobné údaje výhradne v mene Prevádzkovateľa na účely:</p>
          <ul>
            <li>Uloženie a spracovanie účtovných dokladov (FA, PFA, PPD, VPD, atď.)</li>
            <li>Generovanie XML výkazov pre Finančnú správu SR (DPH, DPPO, DPFO, DPMV)</li>
            <li>Odosielanie e-mailových notifikácií (pripomienky platby, potvrdenia)</li>
            <li>Uchovávanie záložných kópií a auditného denníka</li>
          </ul>

          <h2>3. Kategórie osobných údajov</h2>
          <ul>
            <li>Identifikačné údaje (meno, priezvisko, adresa, IČO, DIČ)</li>
            <li>Kontaktné údaje (email, telefón)</li>
            <li>Bankové údaje (IBAN, BIC)</li>
            <li>Pracovné údaje (zamestnanci — mzdy, RČ, sociálne poistenie)</li>
            <li>Fakturačné údaje (číslo dokladu, suma, DPH)</li>
          </ul>

          <h2>4. Doba spracúvania</h2>
          <p>Údaje spracúvame po dobu platnosti účtu Prevádzkovateľa a následne 10 rokov od zrušenia účtu (v súlade s §35 zákona č. 431/2002 Z.z. o účtovníctve). Po tejto lehote údaje trvalo vymažeme okrem prípadov, keď je uchovávanie vyžadované iným právnym predpisom.</p>

          <h2>5. Bezpečnostné opatrenia</h2>
          <ul>
            <li><strong>Šifrovanie:</strong> TLS 1.3 pre všetku komunikáciu, AES-256 na úrovni databázy</li>
            <li><strong>Autentifikácia:</strong> Bcrypt pre heslá, MFA/TOTP dostupné</li>
            <li><strong>RLS (Row-Level Security):</strong> Používatelia vidia iba dáta svojej firmy</li>
            <li><strong>Audit log:</strong> Každá zmena (INSERT/UPDATE/DELETE) sa loguje s user_id + IP</li>
            <li><strong>Idle timeout:</strong> Odhlásenie po 30 min neaktivity</li>
            <li><strong>Rate limiting:</strong> Ochrana proti abuse</li>
            <li><strong>Sentry:</strong> Real-time error tracking</li>
          </ul>

          <h2>6. Subprocesory (poddodávatelia)</h2>
          <p>ZOLO využíva nasledovných subprocesorov (všetci s DPA):</p>
          <ul>
            <li><strong>Supabase Inc.</strong> — cloud databáza + storage (hosting v Frankfurte, EÚ)</li>
            <li><strong>Vercel Inc.</strong> — frontend hosting a serverless funkcie (EÚ regióny)</li>
            <li><strong>Resend</strong> — transakčný email (US, EU forwarding)</li>
            <li><strong>Anthropic PBC</strong> — AI Vision pre PFA import (opcionálne, len ak zapneš)</li>
            <li><strong>Sentry Software Inc.</strong> — error tracking (Frankfurt)</li>
            <li><strong>Upstash Inc.</strong> — Redis pre rate limiting (Frankfurt)</li>
          </ul>
          <p>Prevádzkovateľ týmto výslovne súhlasí s vyššie uvedenými subprocesormi. Zmenu subprocesora oznámime aspoň 30 dní vopred.</p>

          <h2>7. Miesto spracúvania</h2>
          <p>Údaje sa spracúvajú výhradne v Európskej únii (Frankfurt, Nemecko — Supabase). Do tretích krajín sa údaje neprevádzajú s výnimkou:</p>
          <ul>
            <li>Anthropic AI Vision — ak Prevádzkovateľ zapne funkciu &quot;PFA AI import&quot;, jednotlivé strany prijatých dokumentov sa v anonymizovanej podobe posielajú na Anthropic API (USA). Prevádzkovateľ môže funkciu kedykoľvek vypnúť v Nastaveniach.</li>
          </ul>

          <h2>8. Práva Prevádzkovateľa</h2>
          <ul>
            <li><strong>Export dát:</strong> Kedykoľvek stiahni cez /gdpr-export (JSON so všetkými dátami)</li>
            <li><strong>Vymazanie:</strong> Zruš účet cez /gdpr-delete — trvalé vymazanie do 30 dní</li>
            <li><strong>Audit prístupov:</strong> Zoznam všetkých prístupov v Nastavenia → Audit</li>
            <li><strong>Prenositeľnosť:</strong> Podporujeme export do štandardných formátov (JSON, CSV, XML)</li>
          </ul>

          <h2>9. Oznamovanie porušenia</h2>
          <p>V prípade porušenia bezpečnosti údajov, ktoré predstavuje riziko pre práva a slobody dotknutých osôb, oznámime Prevádzkovateľovi do 72 hodín od zistenia. Oznámenie obsahuje povahu porušenia, rozsah dotknutých údajov a prijaté opatrenia.</p>

          <h2>10. Kontakt na DPO</h2>
          <p>Prevádzkovateľa údajov na strane ZOLO: <a href="mailto:privacy@zolo.sk" className="text-zinc-900 underline">privacy@zolo.sk</a></p>

          <div className="mt-12 p-4 border border-zinc-200 rounded-xl text-[12px] text-zinc-500">
            Táto zmluva je automatický súhlas pri vytvorení účtu. Podpísaný PDF export si môžeš vyžiadať cez <a href="mailto:podpora@zolo.sk" className="text-zinc-700 underline">podpora@zolo.sk</a> pre B2B integrácie.
          </div>
        </div>
      </div>
    </div>
  );
}
