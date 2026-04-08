export interface BankInstruction {
  id: string;
  name: string;
  format: 'CSV' | 'OFX';
  steps: string[];
  tip?: string;
}

export const BANK_INSTRUCTIONS: BankInstruction[] = [
  {
    id: 'nubank',
    name: 'Nubank',
    format: 'CSV',
    steps: [
      'Abra o app do Nubank',
      'Toque no seu perfil (canto superior esquerdo)',
      'Selecione "Meu perfil"',
      'Role até "Exportar planilha" e toque nela',
      'Escolha o período desejado e toque em "Exportar"',
      'O arquivo .CSV será enviado para o seu e-mail',
    ],
    tip: 'O e-mail com o arquivo chega em até 5 minutos',
  },
  {
    id: 'itau',
    name: 'Itaú',
    format: 'OFX',
    steps: [
      'Acesse o Internet Banking no computador (itau.com.br)',
      'Vá em "Conta corrente" → "Extrato"',
      'Selecione o período desejado',
      'Clique em "Exportar" e escolha o formato OFX',
      'Salve o arquivo no seu computador',
    ],
    tip: 'A exportação OFX só está disponível no Internet Banking desktop, não no app',
  },
  {
    id: 'bradesco',
    name: 'Bradesco',
    format: 'CSV',
    steps: [
      'Abra o app do Bradesco',
      'Toque em "Menu" (três linhas no canto)',
      'Selecione "Extrato"',
      'Escolha o período desejado',
      'Toque em "Exportar" e selecione "CSV"',
      'Compartilhe o arquivo salvo',
    ],
  },
  {
    id: 'santander',
    name: 'Santander',
    format: 'OFX',
    steps: [
      'Acesse o Internet Banking (santander.com.br)',
      'Vá em "Conta" → "Extrato"',
      'Selecione o período desejado',
      'Clique em "Exportar Extrato" e escolha "OFX"',
      'Faça o download do arquivo',
    ],
  },
  {
    id: 'bb',
    name: 'Banco do Brasil',
    format: 'OFX',
    steps: [
      'Acesse o Internet Banking do BB (bb.com.br)',
      'Vá em "Extrato e Lançamentos"',
      'Selecione o período desejado',
      'Clique em "Baixar Extrato" e escolha o formato OFX',
      'Faça o download do arquivo',
    ],
  },
  {
    id: 'caixa',
    name: 'Caixa',
    format: 'CSV',
    steps: [
      'Abra o app Caixa Tem ou acesse o Internet Banking',
      'Vá em "Extrato"',
      'Selecione o período desejado',
      'Toque em "Compartilhar" ou "Exportar"',
      'Escolha o formato planilha/CSV',
    ],
    tip: 'O formato pode variar entre o Caixa Tem e o Internet Banking',
  },
];
