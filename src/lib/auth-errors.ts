const AUTH_ERRORS: Record<string, string> = {
  'Invalid login credentials': 'Email ou senha incorretos',
  'User already registered': 'Este email já está em uso',
  'Email not confirmed': 'Confirme seu email antes de fazer login',
  'Password should be at least 6 characters': 'A senha deve ter no mínimo 8 caracteres',
  'over_email_send_rate_limit': 'Muitas tentativas. Aguarde antes de tentar novamente',
  'For security purposes, you can only request this after': 'Muitas tentativas. Aguarde antes de tentar novamente',
  'Unable to validate email address: invalid format': 'Informe um email válido',
};

export function getAuthError(message: string): string {
  if (AUTH_ERRORS[message]) return AUTH_ERRORS[message];

  for (const [key, value] of Object.entries(AUTH_ERRORS)) {
    if (message.toLowerCase().includes(key.toLowerCase())) return value;
  }

  if (message.toLowerCase().includes('network') || message.toLowerCase().includes('fetch')) {
    return 'Erro de conexão. Tente novamente';
  }

  return 'Erro de conexão. Tente novamente';
}
