import Link from 'next/link';
import { Mail, MessageSquare } from 'lucide-react';

export const metadata = { title: 'Kontakt · ZOLO' };

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="bg-white border-b border-zinc-200">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-zinc-900 text-white flex items-center justify-center font-black text-[13px] tracking-tight">Z</div>
            <span className="font-semibold text-zinc-900 tracking-tight">ZOLO</span>
          </Link>
          <Link href="/login" className="text-sm text-zinc-900 hover:underline">Prihlásiť sa</Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold text-zinc-900 tracking-tight mb-2">Kontakt</h1>
        <p className="text-sm text-zinc-500 mb-8">Sme tu pre teba — napíš nám.</p>

        <div className="grid md:grid-cols-2 gap-4 mb-8">
          <a href="mailto:support@zolo.sk" className="bg-white border border-zinc-200 rounded-xl p-5 hover:shadow-md hover:border-zinc-300 transition group">
            <div className="w-10 h-10 rounded-lg bg-zinc-100 text-zinc-700 flex items-center justify-center mb-3"><Mail size={20} /></div>
            <div className="font-semibold text-zinc-900">Podpora</div>
            <div className="text-sm text-zinc-500 mt-1">support@zolo.sk</div>
            <div className="text-xs text-zinc-400 mt-2">Odpoveď do 24h v pracovných dňoch</div>
          </a>

          <a href="mailto:privacy@zolo.sk" className="bg-white border border-zinc-200 rounded-xl p-5 hover:shadow-md hover:border-zinc-300 transition group">
            <div className="w-10 h-10 rounded-lg bg-zinc-100 text-zinc-700 flex items-center justify-center mb-3"><Mail size={20} /></div>
            <div className="font-semibold text-zinc-900">Ochrana údajov</div>
            <div className="text-sm text-zinc-500 mt-1">privacy@zolo.sk</div>
            <div className="text-xs text-zinc-400 mt-2">GDPR otázky a žiadosti</div>
          </a>
        </div>

        <div className="bg-white border border-zinc-200 rounded-xl p-6">
          <h2 className="text-xl font-semibold text-zinc-900 mb-3">Prevádzkovateľ</h2>
          <div className="text-sm text-zinc-600 space-y-1">
            <div><strong>ZOLO</strong> — Slovak Tax & Accounting Platform</div>
            <div>Email: <a href="mailto:info@zolo.sk" className="text-zinc-900 hover:underline">info@zolo.sk</a></div>
            <div>Web: <a href="https://app.zolo.sk" className="text-zinc-900 hover:underline">app.zolo.sk</a></div>
          </div>
          <div className="mt-4 text-xs text-zinc-500">
            Pre fakturáciu, podanie sťažnosti alebo komerčné otázky napíš na support@zolo.sk.
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-zinc-200 text-sm text-zinc-500 flex gap-4">
          <Link href="/terms" className="hover:text-zinc-900">Obchodné podmienky</Link>
          <Link href="/privacy" className="hover:text-zinc-900">Ochrana údajov</Link>
          <Link href="/cookies" className="hover:text-zinc-900">Cookies</Link>
          <Link href="/" className="hover:text-zinc-900">Späť na hlavnú</Link>
        </div>
      </main>
    </div>
  );
}
