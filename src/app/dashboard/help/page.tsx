import { PageHeader, Card, CardHeader } from '@/components/ui';
import Link from 'next/link';
import { BookOpen, FileText, Mail, MessageSquare, Video, ExternalLink } from 'lucide-react';

const FAQS = [
  {
    q: 'Ako vytvorím prvú faktúru?',
    a: 'V sidebare klikni Fakturácia → Nový doklad. Vyber typ (FA/ZF/DO atď.), pridaj položky a klikni Vystaviť. DPH sa vypočíta automaticky.',
  },
  {
    q: 'Ako generujem DPH priznanie?',
    a: 'Po vystavení faktúr v danom mesiaci choď do DPH → DP DPH priznanie → vyber obdobie → Generovať XML → Stiahnuť. XML potom nahráš na portál FS SR.',
  },
  {
    q: 'Ako pozvem účtovníčku?',
    a: 'Nastavenia → Tím a pozvánky → vyplň email + rola (Účtovník) + vyber firmy. Pozvánka platí 14 dní.',
  },
  {
    q: 'Funguje ZOLO offline?',
    a: 'Cloudová aplikácia vyžaduje internet. Lokálny cache udržuje krátko-dobé dáta, ale pre uloženie potrebuješ pripojenie.',
  },
  {
    q: 'Ako automaticky posielam faktúry emailom?',
    a: 'Pri detaile faktúry klikni Email. Faktúra sa zaradí do queue a Edge function ju odošle cez Resend (obvykle do 2 minút).',
  },
  {
    q: 'Ako pridám viacero firiem?',
    a: 'Nastavenia → Moje firmy → Nová firma. Pod jedným ZOLO účtom môžeš mať neobmedzene firiem.',
  },
  {
    q: 'Funguje to pre SZČO?',
    a: 'Áno. Pri vytváraní firmy vyber typ "SZČO". Mzdový modul je primárne pre s.r.o. s zamestnancami.',
  },
  {
    q: 'Ako zálohujem dáta?',
    a: 'Supabase robí automatické denné zálohy. Pre manuálny export choď Nastavenia → Audit log alebo požiadaj o JSON export cez privacy@zolo.sk.',
  },
];

const RESOURCES = [
  { icon: BookOpen, title: 'Dokumentácia', desc: 'Krok-za-krokom návody', href: '#' },
  { icon: Video, title: 'Video tutoriály', desc: 'Vizuálne sprievodce', href: '#' },
  { icon: MessageSquare, title: 'Discord komunita', desc: 'Pýtaj sa iných používateľov', href: '#' },
  { icon: Mail, title: 'Email podpora', desc: 'support@zolo.sk', href: 'mailto:support@zolo.sk' },
];

export default function HelpPage() {
  return (
    <div className="p-8 max-w-5xl">
      <PageHeader title="Pomoc & podpora" subtitle="Časté otázky, dokumentácia, kontakt" />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {RESOURCES.map((r) => (
          <a key={r.title} href={r.href} className="bg-white border border-slate-200 rounded-xl p-4 hover:shadow-md hover:border-blue-300 transition group">
            <r.icon size={22} className="text-slate-400 group-hover:text-blue-500 transition mb-3" />
            <div className="font-semibold text-slate-900 text-sm flex items-center gap-1">{r.title}{r.href.startsWith('http') && <ExternalLink size={11} />}</div>
            <div className="text-xs text-slate-500 mt-0.5">{r.desc}</div>
          </a>
        ))}
      </div>

      <Card>
        <CardHeader title="Časté otázky" />
        <div className="divide-y divide-slate-100">
          {FAQS.map((f, i) => (
            <details key={i} className="px-5 py-4 group">
              <summary className="cursor-pointer flex items-center justify-between text-sm font-semibold text-slate-900">
                {f.q}
                <span className="text-slate-400 group-open:rotate-180 transition">▼</span>
              </summary>
              <p className="text-sm text-slate-600 mt-3 leading-relaxed">{f.a}</p>
            </details>
          ))}
        </div>
      </Card>

      <Card className="mt-4 bg-gradient-to-br from-blue-50 to-purple-50 border-blue-200">
        <div className="p-5 flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-500 text-white flex items-center justify-center"><MessageSquare size={18} /></div>
          <div className="flex-1">
            <div className="font-semibold text-slate-900">Stále potrebuješ pomoc?</div>
            <div className="text-sm text-slate-600 mt-1">Napíš nám na <a href="mailto:support@zolo.sk" className="text-blue-600 hover:underline">support@zolo.sk</a> a odpovieme do 24 hodín v pracovných dňoch.</div>
          </div>
        </div>
      </Card>

      <div className="mt-8 pt-4 border-t border-slate-200 text-xs text-slate-500 flex gap-4">
        <Link href="/terms" className="hover:text-blue-600">Obchodné podmienky</Link>
        <Link href="/privacy" className="hover:text-blue-600">Ochrana údajov</Link>
        <Link href="/cookies" className="hover:text-blue-600">Cookies</Link>
      </div>
    </div>
  );
}
