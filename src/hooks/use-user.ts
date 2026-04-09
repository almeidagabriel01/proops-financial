'use client';

import { useEffect, useRef, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import type { Database } from '@/lib/supabase/types';

type Profile = Database['public']['Tables']['profiles']['Row'];

interface UseUserResult {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
}

export function useUser(): UseUserResult {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  // Guard: resolve loading only once (INITIAL_SESSION + any subsequent events)
  const resolvedRef = useRef(false);

  useEffect(() => {
    const supabase = createClient();

    function resolveLoading() {
      if (!resolvedRef.current) {
        resolvedRef.current = true;
        setLoading(false);
      }
    }

    async function fetchProfile(userId: string) {
      try {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();
        setProfile(data ?? null);
      } catch {
        setProfile(null);
      }
    }

    // Safety net: force-resolve loading after 5s in case INITIAL_SESSION never fires.
    const safetyTimer = setTimeout(resolveLoading, 5000);

    // onAuthStateChange is the correct pattern for client components with @supabase/ssr.
    // INITIAL_SESSION fires synchronously when a session exists in cookie storage.
    // Never call getSession()/getUser() directly in useEffect — they can hang.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {

      const currentUser = session?.user ?? null;
      setUser(currentUser);

      // Resolve loading immediately (before async profile fetch)
      // so the skeleton clears as soon as auth state is known.
      resolveLoading();
      clearTimeout(safetyTimer);

      if (currentUser) {
        // fetchProfile is non-blocking: email shows immediately, name loads after.
        fetchProfile(currentUser.id);
      } else {
        setProfile(null);
      }
    });

    return () => {
      subscription.unsubscribe();
      clearTimeout(safetyTimer);
    };
  }, []);

  return { user, profile, loading };
}
