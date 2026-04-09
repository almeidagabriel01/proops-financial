import { FinanceiroSubNav } from '@/components/financeiro/sub-nav';

export default function FinanceiroLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col">
      <FinanceiroSubNav />
      <div className="p-4">{children}</div>
    </div>
  );
}
