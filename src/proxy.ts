import { updateSession } from '@/lib/supabase/middleware';
import type { NextRequest } from 'next/server';

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  // NOTE: '/(app)/:path*' never matches real browser URLs because Next.js route groups
  // like (app) are stripped from the URL path. Routes under src/app/(app)/ are
  // accessible as /dashboard, /import, etc. — not as /(app)/dashboard.
  //
  // The unauthenticated-user redirect logic in updateSession() is therefore dead code
  // for (app)/ routes with this matcher. Route protection for those pages is handled
  // server-side by src/app/(app)/layout.tsx (defense-in-depth via auth guard).
  //
  // TODO Story 1.4: expand matcher to explicitly cover /dashboard and other app routes,
  // or remove the dead code from updateSession() to avoid confusion.
  matcher: ['/(app)/:path*', '/login', '/signup'],
};
