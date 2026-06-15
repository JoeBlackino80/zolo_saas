'use client';

import { Button } from '@/components/ui';
import { LogOut, Key, ShieldCheck } from 'lucide-react';
import { useToast } from '@/components/Toast';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function ProfileActions() {
  const toast = useToast();
  const router = useRouter();
  const [pwModal, setPwModal] = useState(false);

  async function logout() {
    if (!confirm('Odhlásiť sa?')) return;
    await createClient().auth.signOut();
    router.push('/login');
    router.refresh();
  }

  async function changePassword() {
    const newPw = prompt('Nové heslo (min. 8 znakov):');
    if (!newPw) return;
    if (newPw.length < 8) { toast('Heslo aspoň 8 znakov', 'error'); return; }
    const { error } = await createClient().auth.updateUser({ password: newPw });
    if (error) { toast(error.message, 'error'); return; }
    toast('Heslo zmenené', 'success');
  }

  async function setupMfa() {
    const sb = createClient();
    const { data, error } = await sb.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'Authenticator' });
    if (error) { toast(error.message, 'error'); return; }
    const code = prompt(`Naskenuj QR v autentikátore:\n\n${data.totp.qr_code.slice(0, 100)}...\n\nAlebo zadaj URI:\n${data.totp.uri}\n\nKód z autentikátora:`);
    if (!code) return;
    const ch = await sb.auth.mfa.challenge({ factorId: data.id });
    if (ch.error) { toast(ch.error.message, 'error'); return; }
    const ver = await sb.auth.mfa.verify({ factorId: data.id, challengeId: ch.data.id, code });
    if (ver.error) { toast(ver.error.message, 'error'); return; }
    toast('MFA aktivované', 'success');
    setPwModal(false);
  }

  return (
    <div className="flex flex-col gap-2 items-end">
      <Button variant="secondary" onClick={changePassword} className="!bg-white/10 !text-white !border-white/20 !hover:bg-white/20">
        <Key size={14} /> Zmena hesla
      </Button>
      <Button variant="secondary" onClick={setupMfa} className="!bg-white/10 !text-white !border-white/20 !hover:bg-white/20">
        <ShieldCheck size={14} /> Aktivovať MFA
      </Button>
      <Button variant="secondary" onClick={logout} className="!bg-white/10 !text-white !border-white/20 !hover:bg-white/20">
        <LogOut size={14} /> Odhlásiť
      </Button>
    </div>
  );
}
