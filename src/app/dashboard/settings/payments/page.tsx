'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { PageHeader, Card, CardHeader, Button, Input, Field, Select } from '@/components/ui';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/components/Toast';

export default function PaymentsSettingsPage() {
  const toast = useToast();
  const [companies, setCompanies] = useState<{ id: string; name: string }[]>([]);
  const [firmId, setFirmId] = useState('');
  const [stripeKey, setStripeKey] = useState('');
  const [accountId, setAccountId] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const sb = createClient();
      const { data } = await sb.from('companies').select('id, name').is('deleted_at', null).order('name');
      setCompanies(data || []);
      const fid = localStorage.getItem('zolo_firm') || data?.[0]?.id || '';
      setFirmId(fid);
    })();
  }, []);

  useEffect(() => {
    if (!firmId) return;
    (async () => {
      const sb = createClient();
      const { data } = await sb.from('payment_settings').select('stripe_key, stripe_account_id').eq('company_id', firmId).maybeSingle();
      if (data) {
        setStripeKey(data.stripe_key || '');
        setAccountId(data.stripe_account_id || '');
      } else {
        setStripeKey('');
        setAccountId('');
      }
    })();
  }, [firmId]);

  async function save() {
    setSaving(true);
    const sb = createClient();
    const { error } = await sb
      .from('payment_settings')
      .upsert({ company_id: firmId, stripe_key: stripeKey, stripe_account_id: accountId }, { onConflict: 'company_id' });
    if (error) { toast(error.message, 'error'); setSaving(false); return; }
    toast('Stripe nastavený', 'success');
    setSaving(false);
  }

  return (
    <div className="p-4 sm:p-8 max-w-3xl">
      <Link href="/dashboard/settings" className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-900 mb-3">
        <ArrowLeft size={14} /> Späť na nastavenia
      </Link>
      <PageHeader title="Platby (Stripe)" subtitle="Generuj payment linky pre tvojich klientov" />

      <Card>
        <CardHeader title="Vyber firmu" />
        <div className="p-5">
          <Select value={firmId} onChange={(e) => setFirmId(e.target.value)}>
            {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        </div>
      </Card>

      {firmId && (
        <>
          <Card className="mt-4">
            <CardHeader title="Stripe pripojenie" />
            <div className="p-5 space-y-4">
              <Field label="Secret API kľúč (sk_live_... alebo sk_test_...)">
                <Input type="password" value={stripeKey} onChange={(e) => setStripeKey(e.target.value)} placeholder="sk_live_..." />
              </Field>
              <Field label="Stripe Account ID (voliteľné)" hint="acct_... pre Stripe Connect">
                <Input value={accountId} onChange={(e) => setAccountId(e.target.value)} placeholder="acct_..." />
              </Field>
              <Button variant="primary" onClick={save} disabled={saving}>{saving ? 'Ukladám…' : 'Uložiť Stripe nastavenia'}</Button>
            </div>
          </Card>

          <Card className="mt-4 bg-zinc-50 border-zinc-200">
            <div className="p-5 text-sm">
              <div className="font-semibold mb-2 text-zinc-900">Ako získať Stripe API kľúč</div>
              <ol className="space-y-1 list-decimal pl-5 text-zinc-800">
                <li>Otvor <a href="https://dashboard.stripe.com/apikeys" target="_blank" rel="noopener" className="underline inline-flex items-center gap-1">Stripe Dashboard → API Keys <ExternalLink size={11} /></a></li>
                <li>Skopíruj <strong>Secret key</strong> (začína <code>sk_live_</code> alebo <code>sk_test_</code>)</li>
                <li>Vlož sem a ulož</li>
              </ol>
              <div className="mt-3 text-zinc-800">Stripe je <strong>per firma</strong> — každá firma má vlastný kľúč.</div>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
