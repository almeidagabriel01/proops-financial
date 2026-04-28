import type { Page } from '@playwright/test';

/**
 * Logs in as a user via the login page.
 * Waits for redirect to /dashboard or /onboarding after successful login.
 */
export async function loginAs(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/login');
  await page.getByLabel(/email/i).fill(email);
  await page.locator('input#password').fill(password);
  await page.getByRole('button', { name: /entrar/i }).click();
  await page.waitForURL(/\/(dashboard|onboarding)/, { timeout: 15000 });
}

/**
 * Logs out by clicking the logout button.
 */
export async function logout(page: Page): Promise<void> {
  await page.getByRole('button', { name: /sair/i }).click();
  await page.waitForURL('/login', { timeout: 10000 });
}
