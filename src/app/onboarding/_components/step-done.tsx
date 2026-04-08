import { Button } from '@/components/ui/button';

interface StepDoneProps {
  importedData: boolean;
  onFinish: () => void;
}

export function StepDone({ importedData, onFinish }: StepDoneProps) {
  return (
    <div className="flex flex-col items-center gap-6 text-center">
      {/* Success icon with CSS animation */}
      <div className="success-icon flex h-24 w-24 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/20">
        <svg
          className="h-12 w-12 text-green-600 dark:text-green-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>

      <style>{`
        @keyframes pop-in {
          0% { transform: scale(0.5); opacity: 0; }
          80% { transform: scale(1.1); }
          100% { transform: scale(1); opacity: 1; }
        }
        .success-icon { animation: pop-in 0.4s ease forwards; }
      `}</style>

      <div>
        <h2 className="text-2xl font-bold text-foreground">
          {importedData ? 'Tudo pronto! 🎉' : 'Onboarding concluído!'}
        </h2>
        <p className="mt-2 text-muted-foreground">
          {importedData
            ? 'Suas transações estão sendo organizadas pela IA. Em instantes estarão no seu dashboard.'
            : 'Quando quiser, importe seu extrato na aba "Importar" para ver seus gastos organizados.'}
        </p>
      </div>

      {importedData && (
        <div className="w-full rounded-xl border border-green-200 bg-green-50 p-4 text-left dark:border-green-800 dark:bg-green-900/10">
          <p className="text-sm font-medium text-green-800 dark:text-green-300">
            O que acontece agora:
          </p>
          <ul className="mt-2 flex flex-col gap-1 text-sm text-green-700 dark:text-green-400">
            <li className="flex items-center gap-2">
              <span>✓</span> Transações categorizadas automaticamente pela IA
            </li>
            <li className="flex items-center gap-2">
              <span>✓</span> Dashboard com resumo de receitas e despesas
            </li>
            <li className="flex items-center gap-2">
              <span>✓</span> Chat IA disponível para perguntas sobre seus gastos
            </li>
          </ul>
        </div>
      )}

      <Button size="lg" className="w-full" onClick={onFinish}>
        Ver meu Dashboard
      </Button>
    </div>
  );
}
