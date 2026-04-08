import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Termos de Uso — Finansim',
};

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <div className="mb-8">
        <Link href="/login" className="text-sm text-primary hover:underline">
          ← Voltar
        </Link>
        <h1 className="mt-4 text-2xl font-bold text-foreground">Termos de Uso</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Última atualização: abril de 2026
        </p>
      </div>

      <div className="prose prose-sm max-w-none space-y-6 text-foreground">
        <section>
          <h2 className="text-lg font-semibold">1. Aceitação dos Termos</h2>
          <p className="mt-2 text-muted-foreground">
            Ao criar uma conta e usar o Finansim, você concorda com estes Termos de Uso. Se não concordar, não utilize o serviço. O uso continuado após alterações nos termos constitui aceitação das novas condições.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">2. Descrição do Serviço</h2>
          <p className="mt-2 text-muted-foreground">
            O Finansim é um aplicativo pessoal de gestão financeira que permite ao usuário importar extratos bancários, categorizar transações com inteligência artificial e obter análises e respostas personalizadas por meio de um assistente conversacional.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">3. Elegibilidade</h2>
          <p className="mt-2 text-muted-foreground">
            O serviço é destinado exclusivamente a pessoas físicas maiores de 18 anos residentes no Brasil. Ao criar uma conta, você declara que atende a esses requisitos.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">4. Conta de Usuário</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
            <li>Você é responsável por manter a confidencialidade de suas credenciais de acesso.</li>
            <li>Notifique-nos imediatamente em caso de acesso não autorizado à sua conta.</li>
            <li>É vedado compartilhar credenciais ou criar múltiplas contas para a mesma pessoa.</li>
            <li>Reservamo-nos o direito de suspender contas que violem estes Termos.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold">5. Uso Aceitável</h2>
          <p className="mt-2 text-muted-foreground">É proibido usar o Finansim para:</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
            <li>Atividades ilegais ou fraudulentas.</li>
            <li>Inserir dados falsos ou de terceiros sem autorização.</li>
            <li>Tentar acessar sistemas, dados ou contas de outros usuários.</li>
            <li>Realizar engenharia reversa, descompilar ou extrair o código-fonte do serviço.</li>
            <li>Sobrecarregar intencionalmente a infraestrutura do serviço (ataques DDoS, scraping abusivo).</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold">6. Planos e Pagamentos</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
            <li><strong className="text-foreground">Plano gratuito:</strong> disponível a todos os usuários cadastrados, com funcionalidades limitadas.</li>
            <li><strong className="text-foreground">Trial Pro de 7 dias:</strong> concedido automaticamente a novos usuários, sem necessidade de cartão.</li>
            <li><strong className="text-foreground">Plano Pro:</strong> cobrança mensal recorrente via Asaas (Pix, boleto ou cartão de crédito).</li>
            <li>O cancelamento pode ser feito a qualquer momento em Configurações → Plano. O acesso Pro é mantido até o fim do período pago.</li>
            <li>Não realizamos reembolsos por períodos parciais já cobrados.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold">7. Propriedade Intelectual</h2>
          <p className="mt-2 text-muted-foreground">
            O Finansim e todos os seus componentes (código, design, marca, conteúdo) são de propriedade exclusiva dos desenvolvedores e protegidos pela legislação brasileira de propriedade intelectual. O usuário não adquire qualquer direito de propriedade sobre o serviço.
          </p>
          <p className="mt-2 text-muted-foreground">
            Os dados financeiros inseridos pelo usuário pertencem ao próprio usuário. Concedemos ao usuário uma licença pessoal, não exclusiva e intransferível para usar o serviço.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">8. Limitação de Responsabilidade</h2>
          <p className="mt-2 text-muted-foreground">
            O Finansim é uma ferramenta de organização financeira pessoal e <strong className="text-foreground">não fornece assessoria financeira, contábil ou jurídica</strong>. As categorizações e análises geradas pela IA são automatizadas e podem conter imprecisões — sempre verifique informações importantes com um profissional qualificado.
          </p>
          <p className="mt-2 text-muted-foreground">
            Na máxima extensão permitida por lei, não nos responsabilizamos por decisões financeiras tomadas com base nas informações exibidas no aplicativo.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">9. Disponibilidade do Serviço</h2>
          <p className="mt-2 text-muted-foreground">
            Envidamos esforços razoáveis para manter o serviço disponível, mas não garantimos disponibilidade ininterrupta. Manutenções programadas serão comunicadas com antecedência quando possível.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">10. Rescisão</h2>
          <p className="mt-2 text-muted-foreground">
            Você pode encerrar sua conta a qualquer momento em Configurações → Dados → Excluir conta. Podemos suspender ou encerrar contas que violem estes Termos, com aviso prévio quando viável.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">11. Alterações nos Termos</h2>
          <p className="mt-2 text-muted-foreground">
            Alterações significativas serão comunicadas por e-mail com antecedência mínima de 15 dias. A data de última atualização está indicada no topo desta página.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">12. Lei Aplicável e Foro</h2>
          <p className="mt-2 text-muted-foreground">
            Estes Termos são regidos pelas leis brasileiras. Fica eleito o foro da comarca de São Paulo — SP para dirimir quaisquer controvérsias, com renúncia a qualquer outro, por mais privilegiado que seja.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">13. Contato</h2>
          <p className="mt-2 text-muted-foreground">
            Para dúvidas sobre estes Termos, entre em contato pelo e-mail:{' '}
            <a href="mailto:contato@finansim.com.br" className="text-primary hover:underline">
              contato@finansim.com.br
            </a>
          </p>
        </section>
      </div>
    </div>
  );
}
