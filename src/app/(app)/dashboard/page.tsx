import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Dashboard',
};

export default function DashboardPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-16">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-foreground">Bem-vindo ao Finansim</h1>
        <p className="mt-2 text-muted-foreground">Em breve: seus gastos organizados por IA.</p>
      </div>
    </div>
  );
}
