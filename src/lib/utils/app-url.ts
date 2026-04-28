/**
 * Returns the canonical app URL for server-side use.
 * Priority:
 *   1. NEXT_PUBLIC_APP_URL env var (set in Vercel dashboard)
 *   2. VERCEL_URL (auto-set by Vercel on every deployment)
 *   3. localhost:3000 (local dev only)
 *
 * Trailing slashes are stripped to prevent double-slash in paths.
 */
export function getAppUrl(): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL;
  if (configured) return configured.replace(/\/$/, '');

  const vercelUrl = process.env.VERCEL_URL;
  if (vercelUrl) return `https://${vercelUrl}`;

  return 'http://localhost:3000';
}
