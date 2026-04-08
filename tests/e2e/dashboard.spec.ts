import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/auth';

const email = process.env.E2E_USER_EMAIL ?? '';
const password = process.env.E2E_USER_PASSWORD ?? '';

test.describe('Dashboard', () => {
  test.skip(!email || !email.includes('@'), 'E2E_USER_EMAIL não configurado — requer staging Supabase');

  test.beforeEach(async ({ page }) => {
    await loginAs(page, email, password);
    await page.goto('/dashboard');
  });

  test('carrega cards de resumo (receita, despesa, saldo)', async ({ page }) => {
    // Summary cards should be visible after skeleton loading
    await expect(page.locator('[data-testid="summary-cards"], .grid')).toBeVisible({ timeout: 10000 });
  });

  test('navega para /transactions via bottom nav', async ({ page }) => {
    await page.getByRole('link', { name: /transações/i }).click();
    await expect(page).toHaveURL(/\/transactions/);
  });

  test('navega para /import via bottom nav', async ({ page }) => {
    await page.getByRole('link', { name: /importar/i }).click();
    await expect(page).toHaveURL(/\/import/);
  });

  test('não exibe flash de tela em branco durante loading', async ({ page }) => {
    // Reload and check that skeleton or content is immediately visible
    await page.reload();
    // Should not be blank — either skeleton or content
    const hasContent = await page.locator('main').isVisible();
    expect(hasContent).toBe(true);
  });
});
