'use client';

import { useState } from 'react';
import { Button, Input, Field, Select } from '@/components/ui';
import { Mail } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/components/Toast';
import { useRouter } from 'next/navigation';

export default function TeamInviteForm({ companies }: { companies: { id: string; name: string }[] }) {
  const toast = useToast();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'admin' | 'accountant' | 'viewer'>('accountant');
  const [selectedFirms, setSelectedFirms] = useState<string[]>([]);
  const [sending, setSending] = useState(false);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) { toast('Zadaj email', 'error'); return; }
    setSending(true);
    const sb = createClient();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) { toast('Nie si prihlásený', 'error'); setSending(false); return; }
    const targetFirms = selectedFirms.length === 0 ? companies.map((c) => c.id) : selectedFirms;
    const rows = targetFirms.map((cid) => ({
      invited_email: email.toLowerCase().trim(),
      company_id: cid,
      role,
      invited_by: user.id,
      status: 'pending',
    }));
    const { error } = await sb.from('team_invitations').insert(rows);
    if (error) { toast(error.message, 'error'); setSending(false); return; }
    toast(`Pozvánka odoslaná pre ${targetFirms.length} firiem`, 'success');
    setEmail('');
    setSelectedFirms([]);
    router.refresh();
  }

  return (
    <form onSubmit={send} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Field label="Email člena tímu">
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="uctovnicka@firma.sk" required />
        </Field>
        <Field label="Rola">
          <Select value={role} onChange={(e) => setRole(e.target.value as 'admin' | 'accountant' | 'viewer')}>
            <option value="accountant">Účtovník — vidí všetko, môže upravovať</option>
            <option value="admin">Admin — plný prístup vrátane nastavení</option>
            <option value="viewer">Iba čítanie</option>
          </Select>
        </Field>
      </div>
      <Field label="Prístup k firmám" hint="Cmd/Ctrl+klik pre viacero. Prázdne = všetky.">
        <select
          multiple
          value={selectedFirms}
          onChange={(e) => setSelectedFirms([...e.target.selectedOptions].map((o) => o.value))}
          className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm h-32"
        >
          {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </Field>
      <Button type="submit" variant="primary" disabled={sending}>
        <Mail size={14} /> {sending ? 'Posielam…' : 'Odoslať pozvánku'}
      </Button>
    </form>
  );
}
