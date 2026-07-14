import { createClient } from '@/lib/supabase/server';
import { hasModule, type Module } from '@/lib/modules';
import ModuleLocked from '@/components/ModuleLocked';
import { cookies } from 'next/headers';

// Server-side module gate. Použij v ľubovoľnej dashboard page:
//
//   const gate = await moduleGate('accounting');
//   if (gate) return gate;
//
// Vráti buď null (má prístup) alebo <ModuleLocked/> element ktorý sa má renderovať.
export async function moduleGate(module: Module): Promise<React.ReactNode | null> {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return null;

  // Získaj aktívnu firmu z cookies alebo prvá firmu usera
  const cookieStore = await cookies();
  const activeFirmId = cookieStore.get('zolo_firm')?.value;

  let query = sb.from('companies').select('enabled_modules').is('deleted_at', null);
  if (activeFirmId) query = query.eq('id', activeFirmId);
  const { data } = await query.limit(1).maybeSingle();

  if (!data) return null; // no company yet, don't gate
  const modules = (data as { enabled_modules?: string[] }).enabled_modules || [];
  if (hasModule(modules, module)) return null;
  return <ModuleLocked module={module} />;
}
