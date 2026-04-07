'use client';

import { useRouter } from 'next/navigation';
import { usePlan } from '@/hooks/use-plan';

export function TrialBanner() {
  const { inTrial, trialDaysLeft } = usePlan();
  const router = useRouter();

  if (!inTrial || trialDaysLeft <= 0) return null;

  return (
    <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-center dark:border-amber-800 dark:bg-amber-950">
      <p className="text-sm text-amber-800 dark:text-amber-200">
        Você está no período de teste Pro —{' '}
        <strong>{trialDaysLeft} {trialDaysLeft === 1 ? 'dia restante' : 'dias restantes'}</strong>.{' '}
        <button
          onClick={() => router.push('/settings?tab=plano')}
          className="font-semibold underline underline-offset-2 hover:no-underline"
        >
          Assinar Pro
        </button>
      </p>
    </div>
  );
}
