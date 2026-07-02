import { PageHeader, Card, CardHeader } from '@/components/ui';
import { Mail, MessageSquare, Sparkles, PlayCircle } from 'lucide-react';
import SeedSampleDataButton from './seed-button';

export default function HelpPage() {
  return (
    <div className="p-4 sm:p-8 max-w-5xl">
      <PageHeader title="Pomoc & podpora" subtitle="Ak niečo nefunguje alebo si nevieš poradiť" />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <a href="mailto:podpora@zolo.sk" className="block bg-white border border-zinc-200 hover:border-zinc-300 rounded-xl p-5 transition">
          <Mail size={20} className="text-zinc-700 mb-2" />
          <div className="font-semibold text-zinc-900">Email podpora</div>
          <div className="text-sm text-zinc-500 mt-1">podpora@zolo.sk · odpovedáme do 24h</div>
        </a>
        <a href="https://zolo.sk/contact" className="block bg-white border border-zinc-200 hover:border-zinc-300 rounded-xl p-5 transition">
          <MessageSquare size={20} className="text-zinc-700 mb-2" />
          <div className="font-semibold text-zinc-900">Kontaktný formulár</div>
          <div className="text-sm text-zinc-500 mt-1">zolo.sk/contact</div>
        </a>
        <a href="https://zolo.sk/pricing" className="block bg-white border border-zinc-200 hover:border-zinc-300 rounded-xl p-5 transition">
          <Sparkles size={20} className="text-zinc-700 mb-2" />
          <div className="font-semibold text-zinc-900">Upgrade plánu</div>
          <div className="text-sm text-zinc-500 mt-1">Viac firiem, AI Vision, tím</div>
        </a>
      </div>

      <Card className="mb-4">
        <CardHeader title="Začni tu — základy" />
        <div className="p-5 space-y-3 text-sm">
          <Section title="1. Vytvor svoju firmu" desc="V onboardingu zadaj IČO — z ORSR sa automaticky doplnia údaje (názov, DIČ, adresa). Doplň IBAN — bude na faktúrach." />
          <Section title="2. Pridaj zákazníkov" desc="V Zákazníci → Nový. Zadaj IČO klienta a údaje sa doplnia. Email je dôležitý — automatické pripomienky platby chodia naň." />
          <Section title="3. Vystav prvú faktúru" desc="V Fakturácia → Nový doklad. Číslo sa automaticky predvyplní (FA-2026-0001), splatnosť presety (3/7/14/30/60 dní), DZP dátum dodania pre DPH. Položky a DPH sa rátajú live." />
          <Section title="4. Pošli faktúru mailom" desc="Na detaile FA klikni Poslať mailom — pripojí sa PDF a portál link. Ak má klient nastavený Stripe, mail obsahuje Zaplatiť kartou tlačidlo." />
          <Section title="5. Sleduj cashflow" desc="Cash flow 90d ukáže predikciu. Pohľadávky list s dňami po splatnosti. Po platbe sa stav auto-aktualizuje cez Stripe webhook." />
        </div>
      </Card>

      <Card className="mb-4">
        <CardHeader title="Automatizácia — beží na pozadí" />
        <div className="p-5 space-y-3 text-sm">
          <Section title="Pripomienky platby (4 stages)" desc="3 dni pred splatnosťou · v deň splatnosti · 7 dní po · 30 dní po. Posielajú sa automaticky z noreply@zolo.sk. Vypneš v detaile FA." />
          <Section title="Opakujúce sa faktúry" desc="Pre paušály a SaaS. Mesačne/štvrťročne/ročne. Auto vystaví FA + pošle mailom + portál linkom." />
          <Section title="Bankový import" desc="Stiahni CSV alebo CAMT.053 XML zo svojej banky → ZOLO spáruje platby k faktúram cez VS." />
          <Section title="AI Vision import" desc="Odfotografuj bloček alebo PDF faktúru → Claude Sonnet extrahuje partnera, dátum, sumu, DPH. (Potrebuje Anthropic API kľúč v Nastaveniach.)" />
        </div>
      </Card>

      <Card className="mb-4">
        <CardHeader title="DPH & dane" />
        <div className="p-5 space-y-3 text-sm">
          <Section title="DP DPH priznanie" desc="Generuje XML pre Finančnú správu (Daňový portál). Filter podľa DZP — legálne správne podľa §19 zákona o DPH." />
          <Section title="Kontrolný výkaz (KV)" desc="Auto rozdelenie A1 (vydané SK FA) / B1 (prijaté SK FA)." />
          <Section title="Súhrnný výkaz (SV)" desc="Agregát EU dodávok per IČ DPH partnera." />
          <Section title="Daň z príjmov" desc="DPPO 15%/21% podľa obratu. DPFO 19%/25% s nezdaniteľnou sumou + daňový bonus na dieťa." />
        </div>
      </Card>

      <Card className="mb-4">
        <CardHeader title="Časté otázky (FAQ)" />
        <div className="p-5 space-y-3">
          <Faq q="Prečo mi FA nezaúčtovala DPH správne?"
               a="Skontroluj či máš v položkách zadaný správny vat_rate (23/19/10/0). Pri type='received_invoice' (PFA) sa DPH ide do MD 34301 (nárok na odpočet), pri type='invoice' do D 34302 (výstupná). Ak vidíš MD 311 / D 602 ale žiadny 34302, položka má vat_rate=0." />
          <Faq q="Ako naimportujem PFA-čky ktoré dostávam mailom?"
               a="Otvor Fakturácia → Prijaté faktúry → drag-drop PDF alebo foto. AI (Claude Vision) automaticky vyplní číslo, dátum, dodávateľa, sumy, DPH. Skontroluj, uprav ak treba, uložit. Zaúčtuje sa automaticky." />
          <Faq q="Ako prepojím zálohovú (ZF) na ostrú FA so zalohou?"
               a="Vystav ZF. Označ zaplatené (napr. 500€). Otvor detail ZF → klik Vystaviť FA. Nová FA sa vytvorí s automatickým Odpočet zálohy riadkom a paid_amount sa prevedie. K úhrade uvidíš len zvyšok." />
          <Faq q="Prečo sa mi PFA neobjaví v KV DPH B1 sekcii?"
               a="B1 sekcia obsahuje len PFA od SK dodávateľov (IČ DPH začína SK). Ak dodávateľ nemá IČ DPH alebo je zahraničný, pôjde do B2 (>=100€) alebo B3 (<100€)." />
          <Faq q="Ako fungujú opakované faktúry?"
               a="V Fakturácia → Opakované → Nová vytvor šablónu (mesačne/štvrťročne/ročne). pg_cron denne o 6:00 UTC prejde všetky aktívne šablóny a vygeneruje FA ku next_generation_date. Ak máš auto_send zapnuté, hneď odošle mailom." />
          <Faq q="Kedy chodia pripomienky platby?"
               a="Automaticky 3 dni PRED splatnosťou (jemné), v deň splatnosti (pripomínam), 7 dní PO (dôraznejšie), 30 dní PO (posledná). Chodia z noreply@zolo.sk cez Resend. Vypneš per FA pri vystavení (checkbox Automatické pripomienky)." />
          <Faq q="Ako spárujem bankové platby s FA?"
               a="Banka → Import výpisu (CSV) → nahodíš CSV zo SLSP/Tatra/VÚB/Fio. Systém automaticky spáruje transakcie s otvorenými FA cez variabilný symbol. Klikni Označiť N FA ako zaplatené → hromadne sa auto-zaúčtujú MD 221 / D 311." />
          <Faq q="Ako platím všetkých dodávateľov naraz?"
               a="Financie → Záväzky → označ checkboxy PFA-čiek → klik SEPA XML. Stiahne sa pain.001.001.03 súbor. Nahodíš do svojej banky (SLSP/Tatra podporujú SEPA batch), autorizuješ jednou platbou." />
        </div>
      </Card>

      <Card className="mb-4">
        <CardHeader title="Vyskúšaj s ukážkovými dátami" subtitle="Vytvorí 3 klientov, 3 produkty, 3 vydané FA + 1 PFA v tvojej firme" />
        <div className="p-5">
          <SeedSampleDataButton />
          <p className="text-[12px] text-zinc-500 mt-3">
            Ukážkové dáta obsahujú 1 zaplatenú FA, 1 čerstvú FA, 1 overdue FA a 1 nezaplatenú PFA — dobré na demo alebo skúšku funkcionality. Môžeš ich zmazať kedykoľvek.
          </p>
        </div>
      </Card>

      <Card>
        <CardHeader title="Klávesové skratky" />
        <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <KbShortcut keys="⌘K" desc="Príkazová paleta (rýchly search)" />
          <KbShortcut keys="⌘D" desc="Skok na Dashboard" />
          <KbShortcut keys="⌘I" desc="Skok na Fakturácia" />
          <KbShortcut keys="⌘U" desc="Skok na Zákazníci" />
          <KbShortcut keys="⌘B" desc="Skok na Banka" />
          <KbShortcut keys="⌘J" desc="Skok na Denník" />
          <KbShortcut keys="⌘R" desc="Skok na Reporty" />
          <KbShortcut keys="Esc" desc="Zavrieť modálne okno" />
        </div>
      </Card>

      <div className="mt-6 text-center text-sm text-zinc-500">
        Niečo si nenašiel? <a href="mailto:podpora@zolo.sk" className="text-zinc-900 hover:underline">Napíš nám →</a>
      </div>
    </div>
  );
}

function Section({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="border-l-2 border-zinc-200 pl-4 py-1">
      <div className="font-semibold text-zinc-900">{title}</div>
      <div className="text-zinc-600 mt-0.5">{desc}</div>
    </div>
  );
}

function KbShortcut({ keys, desc }: { keys: string; desc: string }) {
  return (
    <div className="flex items-center gap-3">
      <kbd className="px-2.5 py-1 bg-zinc-100 border border-zinc-200 rounded text-xs font-mono font-semibold">{keys}</kbd>
      <span className="text-zinc-700">{desc}</span>
    </div>
  );
}

function Faq({ q, a }: { q: string; a: string }) {
  return (
    <details className="group border-b border-zinc-100 last:border-b-0 pb-3 last:pb-0">
      <summary className="cursor-pointer list-none flex items-center justify-between gap-3 py-1 hover:bg-zinc-50 rounded px-2 -mx-2">
        <span className="text-[13.5px] font-medium text-zinc-900">{q}</span>
        <PlayCircle size={14} className="text-zinc-400 group-open:rotate-90 transition-transform shrink-0" />
      </summary>
      <p className="mt-2 text-[13px] text-zinc-600 leading-relaxed px-2 -mx-2">{a}</p>
    </details>
  );
}
