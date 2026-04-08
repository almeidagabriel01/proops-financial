'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface OnboardingBannerProps {
  show: boolean;
}

export function OnboardingBanner({ show }: OnboardingBannerProps) {
  const [dismissed, setDismissed] = useState(false);
  const router = useRouter();

  if (!show || dismissed) return null;

  const handleDismiss = () => {
    setDismissed(true);
    // Auto-dismiss after 8s is handled client-side
  };

  // Auto-dismiss after 8 seconds
  setTimeout(handleDismiss, 8000);

  return (
    <div className="flex items-center justify-between gap-3 border-b border-blue-200 bg-blue-50 px-4 py-2.5 dark:border-blue-800 dark:bg-blue-950">
      <p className="text-sm text-blue-800 dark:text-blue-200">
        Complete o onboarding para importar seu primeiro extrato.{' '}
        <button
          onClick={() => router.push('/onboarding')}
          className="font-semibold underline underline-offset-2 hover:no-underline"
        >
          Completar agora
        </button>
      </p>
      <button
        type="button"
        onClick={handleDismiss}
        aria-label="Fechar banner"
        className="shrink-0 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
