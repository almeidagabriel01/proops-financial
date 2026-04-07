import { NextResponse } from 'next/server';
import { streamText, convertToModelMessages, createUIMessageStream, createUIMessageStreamResponse, type UIMessage } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { createClient } from '@/lib/supabase/server';
import { getEffectiveTier } from '@/lib/billing/plans';
import { buildFinancialContext, checkAndResetRateLimit } from '@/lib/ai/chat';
import { buildSystemPrompt } from '@/lib/ai/prompts/chat-system';

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('plan, trial_ends_at, audio_enabled, ai_queries_this_month, ai_queries_reset_at')
    .eq('id', user.id)
    .single();

  if (!profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 500 });
  }

  // Rate limit check + monthly reset
  const { allowed, queriesUsed } = await checkAndResetRateLimit(user.id, profile, supabase);
  if (!allowed) {
    return NextResponse.json({ error: 'rate_limit_exceeded' }, { status: 429 });
  }

  const tier = getEffectiveTier(profile.plan, profile.trial_ends_at);
  const model = tier === 'pro' ? 'claude-sonnet-4-6' : 'claude-haiku-4-5-20251001';

  const { messages }: { messages: UIMessage[] } = await req.json();

  // Build financial context for system prompt
  const context = await buildFinancialContext(user.id, supabase);
  const contextJson = JSON.stringify(context, null, 2);
  const systemPrompt = buildSystemPrompt(contextJson);

  // Increment query counter
  await supabase
    .from('profiles')
    .update({ ai_queries_this_month: queriesUsed + 1 })
    .eq('id', user.id);

  // Stub mode — ANTHROPIC_API_KEY not configured
  if (!process.env.ANTHROPIC_API_KEY) {
    console.log('[chat] stub mode — ANTHROPIC_API_KEY not set');
    const stubText =
      '[Modo demonstração] Configure ANTHROPIC_API_KEY para ativar o assistente financeiro com seus dados reais.';
    const stream = createUIMessageStream({
      execute({ writer }) {
        writer.write({ type: 'text-delta', delta: stubText } as Parameters<typeof writer.write>[0]);
      },
    });
    return createUIMessageStreamResponse({ stream });
  }

  const modelMessages = await convertToModelMessages(messages);
  const result = streamText({
    model: anthropic(model),
    system: systemPrompt,
    messages: modelMessages,
    maxOutputTokens: 1024,
  });

  return result.toUIMessageStreamResponse();
}
