import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { STRIPE_PRICE_IDS, type StripePlanKey } from '@/lib/billing/stripe';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');

  if (!code) {
    return NextResponse.redirect(new URL('/login', origin));
  }

  // Collect cookies set during session exchange
  const cookieSetters: Array<{ name: string; value: string; options: Record<string, unknown> }> = [];

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieSetters.push({ name, value, options: options as Record<string, unknown> })
          );
        },
      },
    },
  );

  const { data: { session } } = await supabase.auth.exchangeCodeForSession(code);

  // Determine redirect target
  // Priority: URL params → cookie (OAuth flow) → user_metadata (legacy)
  const planFromUrl = searchParams.get('plan');
  const intentFromUrl = searchParams.get('intent');
  const planFromMeta = session?.user?.user_metadata?.pending_plan as string | undefined;
  const intentFromMeta = session?.user?.user_metadata?.pending_intent as string | undefined;

  const pendingCookieRaw = request.cookies.get('pending_checkout')?.value;
  const [planFromCookie, intentFromCookie] = pendingCookieRaw
    ? decodeURIComponent(pendingCookieRaw).split(':')
    : [undefined, undefined];

  const planKey = planFromUrl ?? planFromCookie ?? planFromMeta ?? '';
  const intent = intentFromUrl ?? intentFromCookie ?? intentFromMeta ?? 'paid';

  let redirectPath = '/dashboard';
  if (planKey && STRIPE_PRICE_IDS[planKey as StripePlanKey]) {
    redirectPath = `/checkout/redirect?plan=${planKey}&intent=${intent}`;
  }

  const response = NextResponse.redirect(new URL(redirectPath, origin));
  cookieSetters.forEach(({ name, value, options }) =>
    response.cookies.set(name, value, options)
  );
  // Limpa o cookie de intent após uso
  if (pendingCookieRaw) {
    response.cookies.set('pending_checkout', '', { path: '/', maxAge: 0 });
  }
  return response;
}
