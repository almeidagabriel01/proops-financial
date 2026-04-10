'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';

interface BankAccount {
  id: string;
  bank_name: string;
}

export function useBankAccounts() {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { setIsLoading(false); return; }
      supabase
        .from('bank_accounts')
        .select('id, bank_name')
        .eq('user_id', user.id)
        .then(({ data, error: err }) => {
          if (err) setError(err.message);
          else if (data) setAccounts(data);
          setIsLoading(false);
        });
    });
  }, []);

  return { accounts, isLoading, error };
}
