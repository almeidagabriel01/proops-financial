import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Política de Privacidade — Finansim',
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <div className="mb-8">
        <Link href="/login" className="text-sm text-primary hover:underline">
          ← Voltar
        </Link>
        <h1 className="mt-4 text-2xl font-bold text-foreground">Política de Privacidade</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Última atualização: abril de 2026
        </p>
      </div>

      <div className="prose prose-sm max-w-none space-y-6 text-foreground">
        <section>
          <h2 className="text-lg font-semibold">1. Quem somos</h2>
          <p className="mt-2 text-muted-foreground">
            O Finansim é um aplicativo pessoal de finanças que utiliza inteligência artificial para categorizar transações e responder perguntas financeiras. Para solicitações relacionadas a dados pessoais, entre em contato pelo e-mail:{' '}
            <a href="mailto:privacidade@finansim.com.br" className="text-primary hover:underline">
              privacidade@finansim.com.br
            </a>
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">2. Quais dados coletamos</h2>
          <p className="mt-2 text-muted-foreground">Coletamos os seguintes dados:</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
            <li><strong className="text-foreground">Dados de conta:</strong> endereço de e-mail e senha (ou autenticação Google).</li>
            <li><strong className="text-foreground">Transações financeiras:</strong> data, descrição, valor e categoria das transações que você importa de extratos bancários.</li>
            <li><strong className="text-foreground">Conversas com IA:</strong> histórico das mensagens enviadas ao assistente financeiro.</li>
            <li><strong className="text-foreground">Dados de uso:</strong> eventos de uso do aplicativo (importações realizadas, mensagens enviadas) para melhoria do serviço.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold">3. Como usamos seus dados</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
            <li>Categorização automática de transações via IA.</li>
            <li>Fornecimento de análises e respostas personalizadas pelo assistente financeiro.</li>
            <li>Melhoria contínua do serviço com base em padrões de uso agregados (sem identificação individual).</li>
          </ul>
          <p className="mt-2 text-muted-foreground">
            <strong className="text-foreground">Base legal:</strong> execução do contrato de prestação de serviço (art. 7º, V, LGPD) e legítimo interesse para melhoria do serviço (art. 7º, IX, LGPD).
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">4. Com quem compartilhamos</h2>
          <p className="mt-2 text-muted-foreground">
            Seus dados financeiros são processados exclusivamente pelos seguintes serviços:
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
            <li><strong className="text-foreground">Anthropic (Claude AI):</strong> descrições de transações e mensagens do chat são enviadas à API da Anthropic para categorização e respostas. A Anthropic opera sob cláusulas contratuais de adequação para transferência internacional de dados.</li>
            <li><strong className="text-foreground">OpenAI (Whisper):</strong> áudios enviados ao chat (plano Pro) são transcritos pela API da OpenAI.</li>
            <li><strong className="text-foreground">Supabase:</strong> armazenamento seguro dos dados no Brasil e EUA, com criptografia em trânsito e em repouso.</li>
            <li><strong className="text-foreground">Asaas:</strong> processador de pagamentos brasileiro para assinaturas Pro.</li>
          </ul>
          <p className="mt-2 text-muted-foreground">
            Não vendemos nem compartilhamos seus dados com terceiros para fins de publicidade.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">5. Dados de menores</h2>
          <p className="mt-2 text-muted-foreground">
            O Finansim é destinado exclusivamente a maiores de 18 anos. Não coletamos conscientemente dados de menores de idade.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">6. Seus direitos (LGPD)</h2>
          <p className="mt-2 text-muted-foreground">
            Você tem os seguintes direitos sobre seus dados pessoais:
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
            <li><strong className="text-foreground">Acesso e portabilidade:</strong> exporte todos os seus dados em formato JSON em Configurações → Dados.</li>
            <li><strong className="text-foreground">Eliminação:</strong> exclua sua conta e todos os dados permanentemente em Configurações → Dados.</li>
            <li><strong className="text-foreground">Retificação:</strong> solicite correção de dados incorretos pelo e-mail de privacidade.</li>
            <li><strong className="text-foreground">Revogação do consentimento:</strong> entre em contato para solicitar a suspensão do tratamento.</li>
          </ul>
          <p className="mt-2 text-muted-foreground">
            Para exercer qualquer direito, envie e-mail para{' '}
            <a href="mailto:privacidade@finansim.com.br" className="text-primary hover:underline">
              privacidade@finansim.com.br
            </a>{' '}
            com o assunto &quot;Direitos LGPD&quot;.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">7. Encarregado de Dados (DPO)</h2>
          <p className="mt-2 text-muted-foreground">
            O encarregado de proteção de dados será nomeado e divulgado nesta política antes do lançamento público do produto. Até lá, solicitações devem ser enviadas ao e-mail de privacidade acima.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">8. Retenção e exclusão</h2>
          <p className="mt-2 text-muted-foreground">
            Seus dados são mantidos enquanto sua conta estiver ativa. Ao excluir a conta, todos os dados são removidos permanentemente e imediatamente — sem período de carência.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">9. Alterações nesta política</h2>
          <p className="mt-2 text-muted-foreground">
            Alterações significativas serão comunicadas por e-mail com antecedência mínima de 15 dias. A data de última atualização está indicada no topo desta página.
          </p>
        </section>
      </div>
    </div>
  );
}
