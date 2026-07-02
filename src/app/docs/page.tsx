import Link from 'next/link';
import { ArrowLeft, Key, FileText, Users, Package, BookOpen, Zap } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'API dokumentácia',
  description: 'REST API pre integráciu ZOLO s vašimi systémami. Bearer auth, 300 reads/min, 60 writes/min.',
};

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-white text-zinc-900">
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-zinc-100">
        <div className="max-w-5xl mx-auto px-6 h-12 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <ArrowLeft size={14} />
            <span className="text-[13px] text-zinc-700">Späť na zolo.sk</span>
          </Link>
          <div className="flex items-center gap-2 text-[13px]">
            <div className="w-5 h-5 rounded bg-zinc-900 text-white flex items-center justify-center font-black text-[10px]">Z</div>
            <span className="font-semibold">ZOLO API</span>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-6 py-16">
        <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500 mb-3">REST API v1</div>
        <h1 className="text-[44px] font-bold tracking-[-0.03em] leading-[1] mb-6">API dokumentácia</h1>
        <p className="text-[16px] text-zinc-600 leading-relaxed">
          Integruj ZOLO s vlastnými systémami — vystavuj faktúry cez API, importuj kontakty
          hromadne, čítaj denník. Bearer authentication, JSON payloady, rate-limited (300 čítaní / 60
          zápisov za minútu per API kľúč).
        </p>

        <div className="mt-10 p-5 bg-zinc-50 border border-zinc-100 rounded-2xl">
          <div className="flex items-center gap-2 text-[13px] font-semibold text-zinc-900 mb-3">
            <Key size={16} /> Ako získať API kľúč
          </div>
          <ol className="text-[13px] text-zinc-700 space-y-1.5 list-decimal pl-5">
            <li>Prihlás sa do <a href="https://app.zolo.sk" className="text-zinc-900 underline">app.zolo.sk</a></li>
            <li>Nastavenia → Integrácie → <strong>API kľúče</strong></li>
            <li>Klik &quot;Vygenerovať nový kľúč&quot; → pomenuj (napr. &quot;E-shop integration&quot;) → skopíruj hodnotu <code className="text-[11px] bg-zinc-100 px-1.5 py-0.5 rounded">zk_...</code></li>
            <li>Hodnotu už nikdy viac neuvidíš — ulož si ju bezpečne (napr. do Vercel env, 1Password)</li>
          </ol>
        </div>

        <h2 className="text-[24px] font-bold tracking-[-0.02em] mt-14 mb-4">Autentifikácia</h2>
        <p className="text-[14px] text-zinc-600 leading-relaxed">Každý request potrebuje Bearer token v <code className="text-[12px] bg-zinc-100 px-1.5 py-0.5 rounded">Authorization</code> hlavičke:</p>
        <pre className="mt-3 p-4 bg-zinc-950 text-zinc-100 rounded-xl text-[12px] font-mono overflow-x-auto">
{`curl https://app.zolo.sk/api/v1/invoices \\
  -H "Authorization: Bearer zk_a1b2c3d4e5f6..."`}
        </pre>

        <h2 className="text-[24px] font-bold tracking-[-0.02em] mt-14 mb-4">Endpointy</h2>

        <Endpoint method="GET" path="/api/v1/invoices" desc="Zoznam vystavených dokladov" icon={<FileText size={16} />} params="?limit=50&type=invoice" />
        <Endpoint method="POST" path="/api/v1/invoices" desc="Vytvorenie novej FA (auto-post JE + stock)" icon={<FileText size={16} />} body={`{
  "customer_name": "Alza.sk s.r.o.",
  "customer_ico": "36562939",
  "customer_ic_dph": "SK2022092116",
  "customer_email": "faktury@alza.sk",
  "issue_date": "2026-07-02",
  "due_date": "2026-07-16",
  "items": [
    {
      "description": "Konzultácia",
      "quantity": 5,
      "unit": "hod",
      "unit_price": 60,
      "vat_rate": 23
    }
  ]
}`} />
        <Endpoint method="GET" path="/api/v1/invoices/[id]" desc="Detail FA" icon={<FileText size={16} />} />
        <Endpoint method="POST" path="/api/v1/invoices/[id]/pay" desc="Označiť FA ako zaplatenú" icon={<FileText size={16} />} body={`{ "amount": 369.00, "method": "bank" }`} />
        <Endpoint method="POST" path="/api/v1/invoices/[id]/email" desc="Odoslať FA mailom (PDF + portál link)" icon={<FileText size={16} />} body={`{ "to": "klient@firma.sk", "subject": "...", "body": "..." }`} />

        <Endpoint method="GET" path="/api/v1/contacts" desc="Zoznam kontaktov" icon={<Users size={16} />} params="?limit=100" />
        <Endpoint method="POST" path="/api/v1/contacts" desc="Vytvorenie kontaktu" icon={<Users size={16} />} body={`{
  "name": "Alza.sk s.r.o.",
  "type": "customer",
  "ico": "36562939",
  "ic_dph": "SK2022092116",
  "email": "faktury@alza.sk"
}`} />

        <Endpoint method="GET" path="/api/v1/products" desc="Cenník" icon={<Package size={16} />} params="?limit=100" />
        <Endpoint method="POST" path="/api/v1/products" desc="Nový produkt" icon={<Package size={16} />} body={`{
  "name": "Konzultácia",
  "sku": "KONZ-01",
  "unit": "hod",
  "vat_rate": 23,
  "selling_price": 60
}`} />

        <Endpoint method="GET" path="/api/v1/journal" desc="Účtovný denník" icon={<BookOpen size={16} />} params="?entry_type=FA&from=2026-01-01&to=2026-06-30" />
        <Endpoint method="POST" path="/api/v1/journal/post" desc="Manuálny účtovný zápis (validuje MD=D)" icon={<BookOpen size={16} />} body={`{
  "entry_type": "ID",
  "entry_date": "2026-07-02",
  "description": "Prevádzková réžia",
  "lines": [
    { "account_code": "512", "side": "MD", "amount": 100 },
    { "account_code": "211", "side": "D", "amount": 100 }
  ]
}`} />

        <h2 className="text-[24px] font-bold tracking-[-0.02em] mt-14 mb-4">Chybové kódy</h2>
        <div className="border border-zinc-100 rounded-xl overflow-hidden">
          <table className="w-full text-[13px]">
            <thead className="bg-zinc-50">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">HTTP</th>
                <th className="text-left px-4 py-3 font-semibold">Význam</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              <tr><td className="px-4 py-2 font-mono">400</td><td className="px-4 py-2 text-zinc-600">Chýba required pole, invalid JSON, nezbalancované MD/D</td></tr>
              <tr><td className="px-4 py-2 font-mono">401</td><td className="px-4 py-2 text-zinc-600">Chýba/neplatný Bearer token</td></tr>
              <tr><td className="px-4 py-2 font-mono">404</td><td className="px-4 py-2 text-zinc-600">Resource neexistuje alebo patrí inej firme</td></tr>
              <tr><td className="px-4 py-2 font-mono">429</td><td className="px-4 py-2 text-zinc-600">Rate limit exceeded (Retry-After header)</td></tr>
              <tr><td className="px-4 py-2 font-mono">500</td><td className="px-4 py-2 text-zinc-600">Databázová alebo iná server-side chyba</td></tr>
            </tbody>
          </table>
        </div>

        <h2 className="text-[24px] font-bold tracking-[-0.02em] mt-14 mb-4">Webhooks</h2>
        <p className="text-[14px] text-zinc-600 leading-relaxed">
          Nastav webhook v Nastavenia → Webhooks. ZOLO ti pošle POST s HMAC-SHA256 podpisom v hlavičke <code className="text-[12px] bg-zinc-100 px-1.5 py-0.5 rounded">X-Zolo-Signature</code> pri týchto udalostiach:
        </p>
        <ul className="mt-3 text-[13px] text-zinc-700 space-y-1 list-disc pl-5">
          <li><code>invoice.created</code> — nová FA vystavená</li>
          <li><code>invoice.paid</code> — FA označená ako zaplatená</li>
          <li><code>invoice.overdue</code> — FA prekročila splatnosť (denne o 8:00)</li>
          <li><code>contact.created</code> — nový klient</li>
        </ul>
        <p className="mt-3 text-[13px] text-zinc-500">
          Signature: <code className="text-[11px] bg-zinc-100 px-1.5 py-0.5 rounded">HMAC-SHA256(secret, JSON.stringify(payload))</code>. Timeout 8s, retry queue každých 15 min pri fail.
        </p>

        <div className="mt-14 p-5 bg-zinc-950 text-white rounded-2xl">
          <div className="flex items-center gap-2 text-[13px] font-semibold mb-2">
            <Zap size={14} /> Ďalšie otázky?
          </div>
          <p className="text-[13px] text-zinc-400 leading-relaxed">
            Email: <a href="mailto:podpora@zolo.sk" className="text-white underline">podpora@zolo.sk</a> ·
            GitHub issues: <a href="https://github.com/JoeBlackino80/zolo_saas/issues" target="_blank" rel="noreferrer" className="text-white underline">github.com/JoeBlackino80/zolo_saas</a>
          </p>
        </div>
      </div>
    </div>
  );
}

function Endpoint({
  method, path, desc, icon, params, body,
}: {
  method: 'GET' | 'POST';
  path: string;
  desc: string;
  icon?: React.ReactNode;
  params?: string;
  body?: string;
}) {
  const methodColor = method === 'GET' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800';
  return (
    <div className="mt-6 border border-zinc-100 rounded-2xl overflow-hidden">
      <div className="px-4 py-3 flex items-center gap-3 bg-zinc-50 border-b border-zinc-100">
        <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${methodColor}`}>{method}</span>
        <code className="text-[13px] font-mono text-zinc-900">{path}{params && <span className="text-zinc-500">{params}</span>}</code>
        <span className="flex-1" />
        {icon && <span className="text-zinc-400">{icon}</span>}
      </div>
      <div className="px-4 py-3 text-[13px] text-zinc-600">{desc}</div>
      {body && (
        <pre className="px-4 pb-4 text-[11px] font-mono text-zinc-800 bg-white overflow-x-auto whitespace-pre">{body}</pre>
      )}
    </div>
  );
}
