import { describe, it, expect } from 'vitest';
import { getAuthError } from '@/lib/auth-errors';

describe('getAuthError', () => {
  it('retorna mensagem PT-BR para credenciais inválidas', () => {
    expect(getAuthError('Invalid login credentials')).toBe('Email ou senha incorretos');
  });

  it('retorna mensagem PT-BR para email não confirmado', () => {
    expect(getAuthError('Email not confirmed')).toBe('Confirme seu email antes de fazer login');
  });

  it('retorna mensagem PT-BR para senha muito curta', () => {
    expect(getAuthError('Password should be at least 6 characters')).toBe(
      'A senha deve ter no mínimo 8 caracteres',
    );
  });

  it('retorna mensagem PT-BR para rate limit de email', () => {
    expect(getAuthError('over_email_send_rate_limit')).toBe(
      'Muitas tentativas. Aguarde antes de tentar novamente',
    );
  });

  it('retorna mensagem PT-BR para rate limit de request', () => {
    expect(getAuthError('over_request_rate_limit')).toBe(
      'Muitas tentativas. Aguarde antes de tentar novamente',
    );
  });

  it('retorna mensagem PT-BR para rate limit por tempo (partial match)', () => {
    expect(
      getAuthError('For security purposes, you can only request this after 60 seconds'),
    ).toBe('Muitas tentativas. Aguarde antes de tentar novamente');
  });

  it('retorna mensagem PT-BR para email inválido', () => {
    expect(getAuthError('Unable to validate email address: invalid format')).toBe(
      'Informe um email válido',
    );
  });

  it('retorna mensagem de conexão para erro de network', () => {
    expect(getAuthError('Failed to fetch')).toBe('Erro de conexão. Tente novamente');
  });

  it('retorna mensagem de conexão para erro de rede', () => {
    expect(getAuthError('network error occurred')).toBe('Erro de conexão. Tente novamente');
  });

  it('retorna fallback para mensagem desconhecida', () => {
    expect(getAuthError('some unknown error')).toBe('Erro de conexão. Tente novamente');
  });

  it('faz match parcial case-insensitive', () => {
    expect(getAuthError('ERROR: Invalid login credentials for user')).toBe(
      'Email ou senha incorretos',
    );
  });
});
