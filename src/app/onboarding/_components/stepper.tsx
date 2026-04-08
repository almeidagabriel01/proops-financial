interface StepperProps {
  currentStep: number;
  totalSteps: number;
  labels: string[];
}

export function Stepper({ currentStep, totalSteps, labels }: StepperProps) {
  return (
    <div className="flex items-center justify-center gap-0">
      {Array.from({ length: totalSteps }, (_, i) => {
        const step = i + 1;
        const isCompleted = step < currentStep;
        const isCurrent = step === currentStep;

        return (
          <div key={step} className="flex items-center">
            {/* Circle */}
            <div className="flex flex-col items-center">
              <div
                className={[
                  'flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition-colors',
                  isCompleted
                    ? 'bg-primary text-primary-foreground'
                    : isCurrent
                      ? 'border-2 border-primary bg-background text-primary'
                      : 'border-2 border-border bg-background text-muted-foreground',
                ].join(' ')}
              >
                {isCompleted ? (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  step
                )}
              </div>
              <span
                className={[
                  'mt-1 text-xs',
                  isCurrent ? 'font-medium text-foreground' : 'text-muted-foreground',
                ].join(' ')}
              >
                {labels[i]}
              </span>
            </div>

            {/* Connector line */}
            {step < totalSteps && (
              <div
                className={[
                  'mb-4 h-0.5 w-12 transition-colors',
                  isCompleted ? 'bg-primary' : 'bg-border',
                ].join(' ')}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
