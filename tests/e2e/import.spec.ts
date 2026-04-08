import { test, expect } from '@playwright/test';
import { join } from 'path';
import { loginAs } from './helpers/auth';

const email = process.env.E2E_USER_EMAIL ?? '';
const password = process.env.E2E_USER_PASSWORD ?? '';

test.describe('Importação de extrato', () => {
  test.skip(!email || !email.includes('@'), 'E2E_USER_EMAIL não configurado — requer staging Supabase');

  test.beforeEach(async ({ page }) => {
    await loginAs(page, email, password);
  });

  test('/import carrega área de upload', async ({ page }) => {
    await page.goto('/import');
    // Should show file upload area
    await expect(page.getByText(/arraste|selecione|upload/i)).toBeVisible({ timeout: 8000 });
  });

  test('upload de CSV Nubank mostra feedback de progresso', async ({ page }) => {
    await page.goto('/import');

    // Upload the Nubank fixture file
    const fixturePath = join(process.cwd(), 'tests/fixtures/nubank-sample.csv');
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(fixturePath);

    // Should show processing feedback
    await expect(
      page.getByText(/processando|importando|categorizando|analisando/i),
    ).toBeVisible({ timeout: 15000 });
  });

  test('upload de arquivo inválido exibe mensagem de erro', async ({ page }) => {
    await page.goto('/import');

    // Create a fake non-CSV file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'invalid.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('this is not a valid bank statement'),
    });

    await expect(page.getByText(/inválido|não suportado|erro/i)).toBeVisible({ timeout: 8000 });
  });
});
