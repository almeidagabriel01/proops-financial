import { Resend } from 'resend';

export async function sendMonthlyReportEmail(
  email: string,
  name: string,
  monthLabel: string,
  month: string,
  pdfBuffer: Buffer,
): Promise<void> {
  const resend = new Resend(process.env.RESEND_API_KEY);
  await resend.emails.send({
    from: 'Finansim <relatorio@finansim.com.br>',
    to: email,
    subject: `Seu relatório financeiro de ${monthLabel} está pronto, ${name}!`,
    html: `
      <p>Olá, ${name}!</p>
      <p>Seu relatório financeiro do mês de <strong>${monthLabel}</strong> foi gerado.</p>
      <p>Faça o download no anexo ou acesse o app para visualizar.</p>
      <br>
      <p style="color:#94a3b8;font-size:12px">
        Você está recebendo este email porque optou por receber relatórios mensais no Finansim.
        Para cancelar, acesse Configurações → Dados.
      </p>
    `,
    attachments: [
      {
        filename: `relatorio-finansim-${month}.pdf`,
        content: pdfBuffer,
      },
    ],
  });
}
