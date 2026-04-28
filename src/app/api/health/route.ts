import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

interface DependencyStatus {
  status: 'ok' | 'error' | 'configured' | 'missing';
  latencyMs?: number;
}

async function checkSupabase(): Promise<DependencyStatus> {
  const start = Date.now();
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
    const { error } = await supabase.from('profiles').select('id').limit(1);
    // RLS may return PGRST/42501 — that still means Supabase is reachable
    const ok = !error || error.code === 'PGRST301' || error.code === '42501';
    return { status: ok ? 'ok' : 'error', latencyMs: Date.now() - start };
  } catch {
    return { status: 'error', latencyMs: Date.now() - start };
  }
}

export async function GET() {
  const supabase = await checkSupabase();

  const googleAI: DependencyStatus = {
    status: process.env.GOOGLE_AI_API_KEY ? 'configured' : 'missing',
  };
  const stripe: DependencyStatus = {
    status: process.env.STRIPE_SECRET_KEY ? 'configured' : 'missing',
  };

  const allConfigured =
    googleAI.status === 'configured' &&
    stripe.status === 'configured';

  const overallStatus =
    supabase.status === 'error'
      ? 'error'
      : !allConfigured
        ? 'degraded'
        : 'ok';

  return NextResponse.json({
    status: overallStatus,
    version: process.env.npm_package_version ?? '1.0.0',
    timestamp: new Date().toISOString(),
    dependencies: {
      supabase,
      googleAI,
      stripe,
    },
  });
}
