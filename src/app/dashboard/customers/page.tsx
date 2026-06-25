import { createClient } from '@/lib/supabase/server';
import { PageHeader, Card, EmptyState, Button } from '@/components/ui';
import { Users, Plus } from 'lucide-react';
import Link from 'next/link';

export default async function CustomersPage() {
  const sb = await createClient();
  const { data: contacts } = await sb
    .from('contacts')
    .select('id, name, ico, ic_dph, email, phone, city')
    .is('deleted_at', null)
    .eq('type', 'customer')
    .order('name');

  return (
    <div className="p-4 sm:p-8 max-w-6xl">
      <PageHeader
        title="Zákazníci"
        subtitle={`${contacts?.length || 0} zákazníkov`}
        actions={
          <Link href="/dashboard/customers/new">
            <Button variant="primary">
              <Plus size={14} /> Nový zákazník
            </Button>
          </Link>
        }
      />

      <Card>
        {!contacts?.length ? (
          <EmptyState
            icon={<Users size={24} />}
            title="Žiadni zákazníci"
            description="Pridaj prvého zákazníka cez IČO — údaje sa auto-doplnia z ORSR."
            action={
              <Link href="/dashboard/customers/new">
                <Button variant="primary">
                  <Plus size={14} /> Pridať zákazníka
                </Button>
              </Link>
            }
          />
        ) : (
          <div className="divide-y divide-slate-100">
            {contacts.map((c) => (
              <Link key={c.id} href={`/dashboard/customers/${c.id}`} className="flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 transition">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-slate-200 text-slate-600 font-semibold flex items-center justify-center text-sm">
                    {c.name[0]?.toUpperCase()}
                  </div>
                  <div>
                    <div className="font-semibold text-slate-900 text-sm">{c.name}</div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {c.ico ? `IČO ${c.ico}` : '—'} · {c.city || ''} {c.email && `· ${c.email}`}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
