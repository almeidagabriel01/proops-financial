import { NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import Groq from 'groq-sdk';
import { createClient } from '@/lib/supabase/server';
import { getEffectiveTier } from '@/lib/billing/plans';

const ACCEPTED_FORMATS = ['audio/webm', 'audio/mp4', 'audio/wav', 'audio/x-m4a', 'audio/mpeg'];
const MAX_SIZE_BYTES = 25 * 1024 * 1024; // 25MB (Whisper API limit)

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Plan check: audio requires Pro (or active trial)
  const { data: profile } = await supabase
    .from('profiles')
    .select('plan, trial_ends_at, audio_enabled')
    .eq('id', user.id)
    .single();

  if (!profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 500 });
  }

  const tier = getEffectiveTier(profile.plan, profile.trial_ends_at);
  const canUseAudio = (tier === 'pro') && profile.audio_enabled;

  if (!canUseAudio) {
    return NextResponse.json({ error: 'audio_pro_only' }, { status: 403 });
  }

  if (!process.env.GROQ_API_KEY) {
    console.log('[audio] stub mode — GROQ_API_KEY not set');
    return NextResponse.json({
      transcript: '[Transcrição de demonstração] Quanto gastei esse mês?',
    });
  }

  const formData = await req.formData();
  const file = formData.get('file') as File | null;

  if (!file) {
    return NextResponse.json({ error: 'Arquivo de áudio obrigatório' }, { status: 400 });
  }

  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json(
      { error: 'Arquivo muito grande. Máximo: 25MB' },
      { status: 400 },
    );
  }

  if (!ACCEPTED_FORMATS.includes(file.type)) {
    return NextResponse.json(
      { error: 'Formato não suportado. Use webm, mp4, wav ou m4a' },
      { status: 400 },
    );
  }

  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

  try {
    const transcription = await groq.audio.transcriptions.create({
      file,
      model: 'whisper-large-v3-turbo',
      language: 'pt',
      response_format: 'json',
    });
    return NextResponse.json({ transcript: transcription.text });
  } catch (err) {
    console.error('[audio] Groq Whisper error:', err);
    Sentry.captureException(err, {
      extra: { userId: user.id, operation: 'audio_transcription' },
    });
    return NextResponse.json(
      { error: 'Erro ao transcrever áudio. Tente novamente.' },
      { status: 500 },
    );
  }
}
