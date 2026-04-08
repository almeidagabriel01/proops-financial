'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Stepper } from './_components/stepper';
import { StepWelcome } from './_components/step-welcome';
import { StepImport } from './_components/step-import';
import { StepDone } from './_components/step-done';

const STEP_LABELS = ['Bem-vindo', 'Importar', 'Concluído'];
const TOTAL_STEPS = 3;

type OnboardingStep = 1 | 2 | 3;

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [step, setStep] = useState<OnboardingStep>(1);
  const [userName, setUserName] = useState('');
  const [trialEndsAt, setTrialEndsAt] = useState<string | null>(null);
  const [imported, setImported] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace('/login'); return; }

      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name, trial_ends_at, onboarding_completed')
        .eq('id', user.id)
        .single();

      if (profile?.onboarding_completed) {
        router.replace('/dashboard');
        return;
      }

      setUserName(profile?.display_name ?? user.email ?? 'usuário');
      setTrialEndsAt(profile?.trial_ends_at ?? null);
      setLoading(false);
    }

    loadProfile();
  }, [supabase, router]);

  async function markOnboardingComplete(): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;
    const { error } = await supabase
      .from('profiles')
      .update({ onboarding_completed: true })
      .eq('id', user.id);
    if (error) {
      console.error('[onboarding] Failed to mark complete:', error);
      return false;
    }
    return true;
  }

  async function handleSkipAll() {
    try {
      await markOnboardingComplete();
    } catch (error) {
      console.error('[onboarding] handleSkipAll error:', error);
    }
    router.push('/dashboard');
  }

  async function handleFinish() {
    try {
      await markOnboardingComplete();
    } catch (error) {
      console.error('[onboarding] handleFinish error:', error);
    }
    router.push('/dashboard');
  }

  function handleImportSuccess() {
    setImported(true);
    setStep(3);
  }

  function handleSkipImport() {
    setStep(3);
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-screen max-w-screen-sm px-4 py-8">
      {/* Header */}
      <div className="mb-2 text-center">
        <p className="text-lg font-bold text-primary">Finansim</p>
      </div>

      {/* Stepper */}
      <div className="mb-8">
        <Stepper currentStep={step} totalSteps={TOTAL_STEPS} labels={STEP_LABELS} />
      </div>

      {/* Step content */}
      <div>
        {step === 1 && (
          <StepWelcome
            userName={userName}
            trialEndsAt={trialEndsAt}
            onNext={() => setStep(2)}
            onSkipAll={handleSkipAll}
          />
        )}

        {step === 2 && (
          <>
            <StepImport
              onImportSuccess={handleImportSuccess}
              onSkip={handleSkipImport}
            />
          </>
        )}

        {step === 3 && (
          <StepDone importedData={imported} onFinish={handleFinish} />
        )}
      </div>
    </div>
  );
}
