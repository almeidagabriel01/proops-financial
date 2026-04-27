import type { SupabaseClient } from '@supabase/supabase-js';
import { isWithinGracePeriod } from './webhook-handler';

/**
 * Determina se o usuário está em estado de paywall:
 * - plano basic E trial expirado/inexistente E sem subscription ativa (ou grace period)
 * Usado em (app)/layout.tsx para redirecionar para /paywall.
 */
export async function isUserInPaywallState(
  supabase: SupabaseClient,
  userId: string
): Promise<boolean> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('plan, trial_ends_at')
    .eq('id', userId)
    .single();

  if (!profile) return false;

  // Usuários Pro pagos nunca vão para paywall
  if (profile.plan === 'pro') return false;

  // Trial ainda ativo (legado: usuários com trial_ends_at no futuro)
  if (profile.trial_ends_at && new Date(profile.trial_ends_at) > new Date()) return false;

  // Verificar se existe subscription ativa ou dentro do grace period
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('status, updated_at')
    .eq('user_id', userId)
    .in('status', ['active', 'past_due'])
    .order('updated_at', { ascending: false })
    .limit(1)
    .single();

  if (!subscription) return true;
  if (subscription.status === 'active') return false;

  // past_due dentro do grace period de 3 dias
  if (subscription.status === 'past_due' && isWithinGracePeriod(subscription.updated_at)) {
    return false;
  }

  return true;
}
