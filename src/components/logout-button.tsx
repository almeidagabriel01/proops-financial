'use client';

import { useRouter } from 'next/navigation';
import * as Sentry from '@sentry/nextjs';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';

export function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    Sentry.setUser(null);
    router.push('/login');
    router.refresh();
  }

  return (
    <Button variant="ghost" size="sm" onClick={handleLogout}>
      Sair
    </Button>
  );
}
