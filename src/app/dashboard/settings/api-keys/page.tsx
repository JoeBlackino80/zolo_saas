'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Key, Plus, Trash2, Copy, CheckCircle2 } from 'lucide-react';
import { PageHeader, Card, Field, Input, Button, Badge } from '@/components/ui';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/components/Toast';
import { fmtDate } from '@/lib/utils';

type Key = { id: string; name: string; key: string; permissions: string[]; created_at: string; revoked_at: string | null };

function randomKey(prefix = 'zk_'): string {
  const arr = new Uint8Array(24);
  crypto.getRandomValues(arr);
  return prefix + Array.from(arr).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export default function ApiKeysPage() {
  const toast = useToast();
  const [companyId, setCompanyId] = useState('');
  const [keys, setKeys] = useState<Key[]>([]);
  const [newName, setNewName] = useState('');
  const [lastCreated, setLastCreated] = useState<string | null>(null);

  async function load() {
    const sb = createClient();
    const cid = typeof window !== 'undefined' ? localStorage.getItem('zolo_firm') : null;
    if (cid) setCompanyId(cid);
    let q = sb.from('api_keys').select('id, name, key, permissions, created_at, revoked_at').order('created_at', { ascending: false });
    if (cid) q = q.eq('company_id', cid);
    const { data } = await q;
    setKeys((data as Key[]) || []);
  }
  useEffect(() => { load(); }, []);

  async function create() {
    if (!newName) { toast('Zadaj názov kľúča', 'error'); return; }
    const sb = createClient();
    const { data: { user } } = await sb.auth.getUser();
    const key = randomKey();
    const { error } = await sb.from('api_keys').insert({
      company_id: companyId,
      name: newName,
      key,
      permissions: ['read:invoices', 'read:contacts'],
      created_by: user?.id,
    });
    if (error) { toast(error.message, 'error'); return; }
    setLastCreated(key);
    setNewName('');
    toast('Kľúč vytvorený — skopíruj a ulož na bezpečné miesto', 'success');
    load();
  }

  async function revoke(id: string) {
    if (!confirm('Zneplatniť kľúč? Aplikácie, ktoré ho používajú, prestanú fungovať.')) return;
    const sb = createClient();
    await sb.from('api_keys').update({ revoked_at: new Date().toISOString() }).eq('id', id);
    load();
  }

  function copyKey(k: string) {
    navigator.clipboard.writeText(k);
    toast('Skopírované', 'success');
  }

  return (
    <div className="p-4 sm:p-8 max-w-4xl">
      <Link href="/dashboard/settings" className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-900 mb-3">
        <ArrowLeft size={14} /> Späť
      </Link>
      <PageHeader title="API kľúče" subtitle="Pre integrácie / vlastné skripty · REST API na /api/v1/*" />

      {lastCreated && (
        <Card className="mb-4 border-emerald-200 bg-emerald-50">
          <div className="p-5">
            <div className="flex items-center gap-2 text-emerald-800 font-semibold text-sm mb-2"><CheckCircle2 size={16} /> Nový kľúč — ukáže sa LEN raz</div>
            <div className="flex items-center gap-2 bg-white border border-emerald-200 rounded-md p-2.5">
              <code className="flex-1 font-mono text-xs break-all">{lastCreated}</code>
              <button onClick={() => copyKey(lastCreated)} className="text-zinc-500 hover:text-zinc-900"><Copy size={14} /></button>
            </div>
            <div className="text-xs text-emerald-700 mt-2">Ulož si ho na bezpečné miesto. Po opustení stránky ho už neuvidíš v plnom znení.</div>
          </div>
        </Card>
      )}

      <Card className="mb-4">
        <div className="p-5 flex items-end gap-3">
          <Field label="Názov kľúča">
            <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="napr. n8n integrácia, môj skript…" />
          </Field>
          <Button variant="primary" onClick={create} disabled={!newName}><Plus size={14} /> Vytvoriť</Button>
        </div>
      </Card>

      <Card>
        <div className="px-5 py-3 border-b border-zinc-100 text-sm font-semibold">{keys.length} kľúčov</div>
        {keys.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-zinc-500"><Key size={32} className="mx-auto mb-2 text-zinc-300" />Žiadne API kľúče</div>
        ) : (
          <div className="divide-y divide-zinc-100">
            {keys.map((k) => (
              <div key={k.id} className="px-5 py-3 flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{k.name}</span>
                    {k.revoked_at ? <Badge variant="red">zneplatnený</Badge> : <Badge variant="green">aktívny</Badge>}
                  </div>
                  <div className="text-xs text-zinc-500 mt-0.5 font-mono">{k.key.slice(0, 8)}…{k.key.slice(-4)} · vytvorené {fmtDate(k.created_at)}</div>
                </div>
                {!k.revoked_at && (
                  <button onClick={() => revoke(k.id)} className="text-zinc-400 hover:text-red-600" title="Zneplatniť"><Trash2 size={14} /></button>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="mt-4">
        <div className="p-5 text-sm text-zinc-700 space-y-3">
          <div className="font-semibold">Použitie</div>
          <div className="bg-zinc-900 text-zinc-100 rounded-md p-3 font-mono text-xs overflow-auto">
            curl -H &quot;Authorization: Bearer zk_xxxxxxxxxxxxxxxxxxxxxxxx&quot; \<br />
            &nbsp;&nbsp;&nbsp;&nbsp;https://app.zolo.sk/api/v1/invoices
          </div>
          <div className="text-xs text-zinc-600">Dostupné endpointy: <code>GET /api/v1/invoices</code>, <code>GET /api/v1/contacts</code></div>
        </div>
      </Card>
    </div>
  );
}
