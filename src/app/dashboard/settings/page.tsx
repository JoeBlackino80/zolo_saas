import { createClient } from '@/lib/supabase/server';
import { PageHeader, Card, CardHeader, Badge, EmptyState, Button } from '@/components/ui';
import Link from 'next/link';
import { Building2, Plus, Palette, CreditCard, Mail, History, Shield } from 'lucide-react';

export default async function SettingsPage() {
  const sb = await createClient();
  const { data: companies } = await sb
    .from('companies')
    .select('id, name, ico, dic, ic_dph, is_vat_payer')
    .is('deleted_at', null)
    .order('name');

  return (
    <div className="p-4 sm:p-8 max-w-6xl">
      <PageHeader
        title="Nastavenia"
        subtitle="Profil, firmy, tím a branding"
        actions={
          <Link href="/dashboard/settings/companies/new">
            <Button variant="primary">
              <Plus size={14} /> Nová firma
            </Button>
          </Link>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <SettingCard href="/dashboard/settings/subscription" icon={<CreditCard size={20} />} title="Predplatné ZOLO" desc="Plán · fakturácia" />
        <SettingCard href="/dashboard/settings/branding" icon={<Palette size={20} />} title="Branding" desc="Logo · farby · pätička" />
        <SettingCard href="/dashboard/settings/payments" icon={<CreditCard size={20} />} title="Platby" desc="Stripe payment links" />
        <SettingCard href="/dashboard/settings/email" icon={<Mail size={20} />} title="Email šablóny" desc="Texty notifikácií" />
        <SettingCard href="/dashboard/settings/notifications" icon={<Mail size={20} />} title="Pripomienky" desc="Upomienky a termíny" />
        <SettingCard href="/dashboard/settings/webhooks" icon={<Building2 size={20} />} title="Webhooks" desc="N8N · Zapier · Make" />
        <SettingCard href="/dashboard/settings/preferences" icon={<Palette size={20} />} title="Preferencie" desc="Jazyk · formát · téma" />
        <SettingCard href="/dashboard/team" icon={<Mail size={20} />} title="Tím" desc="Pozvi účtovníčku" />
        <SettingCard href="/dashboard/audit" icon={<History size={20} />} title="Audit log" desc="História zmien" />
        <SettingCard href="/dashboard/settings/security" icon={<Shield size={20} />} title="Bezpečnosť" desc="História prihlásení" />
        <SettingCard href="/dashboard/settings/price-levels" icon={<Palette size={20} />} title="Cenové úrovne" desc="VIP / Distribútor / Retail" />
        <SettingCard href="/dashboard/settings/api-keys" icon={<Shield size={20} />} title="API kľúče" desc="REST API · integrácie" />
      </div>

      <Card>
        <CardHeader title="Moje firmy" subtitle={`${companies?.length || 0} firiem pod tvojím účtom`} />
        {!companies?.length ? (
          <EmptyState
            icon={<Building2 size={24} />}
            title="Zatiaľ žiadne firmy"
            description="Vytvor svoju prvú firmu — neobmedzene firiem pod jedným ZOLO účtom."
            action={
              <Link href="/dashboard/settings/companies/new">
                <Button variant="primary">
                  <Plus size={14} /> Vytvoriť firmu
                </Button>
              </Link>
            }
          />
        ) : (
          <div className="divide-y divide-zinc-100">
            {companies.map((c) => (
              <Link
                key={c.id}
                href={`/dashboard/settings/companies/${c.id}`}
                className="flex items-center justify-between px-5 py-3.5 hover:bg-zinc-50 transition"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-zinc-900 text-white font-bold flex items-center justify-center text-sm tracking-tight">
                    {c.name[0]?.toUpperCase()}
                  </div>
                  <div>
                    <div className="font-semibold text-zinc-900 text-sm">{c.name}</div>
                    <div className="text-xs text-zinc-500 mt-0.5">
                      {c.ico ? `IČO ${c.ico}` : 'IČO nedoplnené'}
                      {c.dic && ` · DIČ ${c.dic}`}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {c.is_vat_payer && <Badge variant="blue">Platca DPH</Badge>}
                </div>
              </Link>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function SettingCard({ href, icon, title, desc }: { href: string; icon: React.ReactNode; title: string; desc: string }) {
  return (
    <Link href={href} className="block bg-white border border-zinc-200 rounded-xl p-4 hover:shadow-md hover:border-zinc-300 transition group">
      <div className="text-zinc-400 group-hover:text-zinc-700 transition mb-3">{icon}</div>
      <div className="font-semibold text-zinc-900 text-sm">{title}</div>
      <div className="text-xs text-zinc-500 mt-0.5">{desc}</div>
    </Link>
  );
}
