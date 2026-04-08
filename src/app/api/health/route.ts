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

  const anthropic: DependencyStatus = {
    status: process.env.ANTHROPIC_API_KEY ? 'configured' : 'missing',
  };
  const openai: DependencyStatus = {
    status: process.env.OPENAI_API_KEY ? 'configured' : 'missing',
  };
  const asaas: DependencyStatus = {
    status: process.env.ASAAS_API_KEY ? 'configured' : 'missing',
  };

  const allConfigured =
    anthropic.status === 'configured' &&
    openai.status === 'configured' &&
    asaas.status === 'configured';

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
      anthropic,
      openai,
      asaas,
    },
  });
}
