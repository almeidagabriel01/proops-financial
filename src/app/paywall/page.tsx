import { PlanSelector } from '@/components/billing/plan-selector';

export default function PaywallPage() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-8 px-4 py-12">
      <div className="text-center">
        <h1 className="mb-2 text-3xl font-bold tracking-tight text-foreground">
          Seu período de trial encerrou
        </h1>
        <p className="text-muted-foreground">
          Escolha um plano para continuar usando o Finansim.
        </p>
      </div>
      <div className="w-full">
        <PlanSelector />
      </div>
      <p className="text-center text-xs text-muted-foreground">
        Pagamento via Pix, boleto ou cartão. Cancele quando quiser.
      </p>
    </div>
  );
}
