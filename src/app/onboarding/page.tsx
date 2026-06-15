import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import OnboardingClient from './client';

export default async function OnboardingPage() {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect('/login');
  const { data: companies } = await sb.from('companies').select('id, name').is('deleted_at', null).limit(1);
  if ((companies?.length || 0) > 0) redirect('/dashboard');
  return <OnboardingClient userEmail={user.email || ''} />;
}
