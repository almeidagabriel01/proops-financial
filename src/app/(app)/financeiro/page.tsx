import { redirect } from 'next/navigation';

// Hub financeiro — redirecionar para a sub-página padrão
export default function FinanceiroPage() {
  redirect('/financeiro/contas');
}
