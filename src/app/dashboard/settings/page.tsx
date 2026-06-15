import { createClient } from '@/lib/supabase/server';
import { PageHeader, Card, CardHeader, Badge, EmptyState, Button } from '@/components/ui';
import Link from 'next/link';
import { Building2, Plus } from 'lucide-react';

export default async function SettingsPage() {
  const sb = await createClient();
  const { data: companies } = await sb
    .from('companies')
    .select('id, name, ico, dic, ic_dph, is_vat_payer')
    .is('deleted_at', null)
    .order('name');

  return (
    <div className="p-8 max-w-6xl">
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
          <div className="divide-y divide-slate-100">
            {companies.map((c) => (
              <Link
                key={c.id}
                href={`/dashboard/settings/companies/${c.id}`}
                className="flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 transition"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 text-white font-bold flex items-center justify-center text-sm">
                    {c.name[0]?.toUpperCase()}
                  </div>
                  <div>
                    <div className="font-semibold text-slate-900 text-sm">{c.name}</div>
                    <div className="text-xs text-slate-500 mt-0.5">
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
