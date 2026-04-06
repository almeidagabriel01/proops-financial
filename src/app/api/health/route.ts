import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function GET() {
  let supabaseOk = false;

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );

    const { error } = await supabase.from('profiles').select('id').limit(1);

    // RLS may block the query with no auth, but a connection error vs RLS error
    // tells us if Supabase is reachable. No error or PGRST error = Supabase is up.
    supabaseOk = !error || error.code === 'PGRST301' || error.code === '42501';
  } catch {
    supabaseOk = false;
  }

  return NextResponse.json({
    status: 'ok',
    supabase: supabaseOk,
    timestamp: new Date().toISOString(),
  });
}
