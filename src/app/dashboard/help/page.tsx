import { PageHeader, Card, CardHeader } from '@/components/ui';
import { Mail, MessageSquare, Sparkles } from 'lucide-react';

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

      <Card>
        <CardHeader title="Klávesové skratky" />
        <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <KbShortcut keys="⌘K" desc="Rýchle hľadanie (firmy, faktúry, zákazníci)" />
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
