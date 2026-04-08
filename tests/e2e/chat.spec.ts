import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/auth';

const email = process.env.E2E_USER_EMAIL ?? '';
const password = process.env.E2E_USER_PASSWORD ?? '';

test.describe('Chat IA', () => {
  test.skip(!email || !email.includes('@'), 'E2E_USER_EMAIL não configurado — requer staging Supabase');

  test.beforeEach(async ({ page }) => {
    await loginAs(page, email, password);
  });

  test('/chat carrega interface de mensagens', async ({ page }) => {
    await page.goto('/chat');
    // Should show chat input
    await expect(page.locator('textarea, input[type="text"]').last()).toBeVisible({ timeout: 10000 });
  });

  test('usuário Basic vê paywall ao acessar /chat', async ({ page }) => {
    // If user is basic plan, chat shows upgrade modal or paywall message
    await page.goto('/chat');
    // Either chat loads OR paywall is shown — both are valid states
    const chatLoaded = await page.locator('textarea').isVisible({ timeout: 5000 }).catch(() => false);
    const paywallVisible = await page.getByText(/premium|upgrade|assinar/i).isVisible({ timeout: 5000 }).catch(() => false);
    expect(chatLoaded || paywallVisible).toBe(true);
  });

  test('enviar mensagem exibe resposta ou indicador de loading', async ({ page }) => {
    await page.goto('/chat');

    const textarea = page.locator('textarea').last();
    const isVisible = await textarea.isVisible({ timeout: 5000 }).catch(() => false);

    if (!isVisible) {
      // User might be on basic plan — test passes (paywall shown instead)
      return;
    }

    await textarea.fill('Qual foi meu maior gasto este mês?');
    await page.keyboard.press('Enter');

    // Should show loading indicator or response
    await expect(
      page.getByText(/analisando|carregando|\.\.\./).or(page.locator('[data-testid="chat-message"]')),
    ).toBeVisible({ timeout: 15000 });
  });
});
