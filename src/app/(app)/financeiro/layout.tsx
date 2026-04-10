import { FinanceiroSubNav } from '@/components/financeiro/sub-nav';

export default function FinanceiroLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full flex-col overflow-hidden">
      <FinanceiroSubNav />
      <div className="flex-1 overflow-y-auto p-4 pb-24 lg:px-8 lg:py-6 lg:pb-28">{children}</div>
    </div>
  );
}
