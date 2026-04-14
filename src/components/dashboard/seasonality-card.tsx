import Link from 'next/link';
import {
  Calendar,
  Car,
  School,
  FileText,
  Plane,
  ShoppingBag,
  Gift,
  type LucideProps,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils/format';
import type { SeasonalityInfo } from '@/lib/dashboard/seasonalities';

type LucideIcon = (props: LucideProps) => React.ReactNode;

const ICON_MAP: Record<string, LucideIcon> = {
  Car: (p) => <Car {...p} />,
  School: (p) => <School {...p} />,
  FileText: (p) => <FileText {...p} />,
  Plane: (p) => <Plane {...p} />,
  ShoppingBag: (p) => <ShoppingBag {...p} />,
  Gift: (p) => <Gift {...p} />,
};

export interface SeasonalityWithEstimate extends SeasonalityInfo {
  estimate: { total: number; transactionCount: number } | null;
}

interface SeasonalityCardProps {
  seasonalities: SeasonalityWithEstimate[];
  // Mês do ano passado referente ao período visualizado, ex: "2025-01"
  lastYearMonth: string;
  // Nome do mês atual para o título, ex: "janeiro"
  monthName: string;
}

export function SeasonalityCard({ seasonalities, lastYearMonth, monthName }: SeasonalityCardProps) {
  if (seasonalities.length === 0) return null;

  return (
    <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950/30">
      <div className="mb-3 flex items-center gap-2">
        <Calendar className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
        <h3 className="text-sm font-semibold text-blue-800 dark:text-blue-300">
          Gastos sazonais previstos
        </h3>
      </div>

      <div className="flex flex-col gap-4">
        {seasonalities.map((s) => {
          const Icon = ICON_MAP[s.icon] ?? ((p: LucideProps) => <Calendar {...p} />);
          const firstKeyword = s.keywords[0];

          return (
            <div key={s.label}>
              <div className="flex items-center gap-1.5">
                <Icon className="h-3.5 w-3.5 shrink-0 text-blue-600 dark:text-blue-400" />
                <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                  Em {monthName}, chegam {s.label.toLowerCase()}
                </span>
              </div>

              {s.estimate ? (
                <p className="mt-1 pl-5 text-xs text-blue-700 dark:text-blue-300">
                  No ano passado você gastou{' '}
                  <span className="font-semibold">{formatCurrency(s.estimate.total)}</span> nesta
                  categoria ({s.estimate.transactionCount}{' '}
                  {s.estimate.transactionCount === 1 ? 'transação' : 'transações'})
                </p>
              ) : (
                <p className="mt-1 pl-5 text-xs text-blue-700 dark:text-blue-300">
                  Verifique seus gastos com {s.label.toLowerCase()} para se preparar
                </p>
              )}

              <Link
                href={`/transactions?month=${lastYearMonth}&search=${encodeURIComponent(firstKeyword)}`}
                className="mt-1 block pl-5 text-xs font-medium text-blue-600 underline-offset-2 hover:underline dark:text-blue-400"
              >
                Ver transações do ano passado →
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}
