import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/auth';

// E2E_USER_* vars are set by globalSetup (staging Supabase)
const email = process.env.E2E_USER_EMAIL ?? '';
const password = process.env.E2E_USER_PASSWORD ?? '';

test.describe('Autenticação', () => {
  test.skip(!email || !email.includes('@'), 'E2E_USER_EMAIL não configurado — requer staging Supabase');

  test('login com credenciais válidas redireciona para /dashboard', async ({ page }) => {
    await loginAs(page, email, password);
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('acesso a /dashboard sem login redireciona para /login', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login/);
  });

  test('login com senha errada exibe mensagem de erro', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/senha/i).fill('senha-errada-123');
    await page.getByRole('button', { name: /entrar/i }).click();
    // Should show error message in PT-BR
    await expect(page.getByText(/email ou senha incorretos/i)).toBeVisible({ timeout: 8000 });
  });

  test('logout redireciona para /login', async ({ page }) => {
    await loginAs(page, email, password);
    await expect(page).toHaveURL(/\/dashboard/);
    await page.getByRole('button', { name: /sair/i }).click();
    await expect(page).toHaveURL(/\/login/);
  });
});
